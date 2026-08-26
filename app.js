// app.js — Black Buddha FM tuner deck application logic.
// Handles the dial/station selection, episode playback UI, magazine link-up,
// theme toggle, and deep-link/resume state. Depends on STATIONS (stations-data.js)
// and the #main-audio element being present in the DOM.

    let currentStationIndex = 0; // Start on EP 05 Dubstep (98.1 MHz)
    let currentEpisodeNum = 1;   // Episode 1 by default
    let isPlaying = false;
    let isTracksOpen = false;     // Dropdown open by default
    let timerInterval = null;
    let secondsElapsed = 0;
    let currentThemeClass = 'theme-ep01';
    let audioElement = null;

        // Build Ruler Ticks for 10 Fixed Frequencies (Perfect Station Alignment)
    function initDialTicks() {
      const ticksContainer = document.getElementById('dial-ticks');
      const stationsRow = document.getElementById('dial-stations-row');
      if (!ticksContainer || !stationsRow) return;
      ticksContainer.innerHTML = '';
      stationsRow.innerHTML = '';

      const numStations = STATIONS.length;
      for (let s = 0; s < numStations; s++) {
        const seg = document.createElement('div');
        seg.className = 'ruler-segment';
        seg.style.width = `${100 / numStations}%`;

        // Sub-ticks
        const t1 = document.createElement('div');
        t1.className = 'tick minor';
        seg.appendChild(t1);

        const t2 = document.createElement('div');
        t2.className = 'tick minor';
        seg.appendChild(t2);

        // Aligned Center Major Tick
        const tMajor = document.createElement('div');
        tMajor.className = 'tick major' + (s === currentStationIndex ? ' active-tick' : '');
        tMajor.id = `dial-tick-${s}`;
        seg.appendChild(tMajor);

        const t3 = document.createElement('div');
        t3.className = 'tick minor';
        seg.appendChild(t3);

        const t4 = document.createElement('div');
        t4.className = 'tick minor';
        seg.appendChild(t4);

        ticksContainer.appendChild(seg);
      }

      STATIONS.forEach((st, idx) => {
        const node = document.createElement('div');
        node.className = 'station-node' + (idx === currentStationIndex ? ' active' : '');
        node.id = `station-node-${idx}`;
        node.innerHTML = `
          <div class="station-freq">${st.freq.toFixed(1)}</div>
          <div class="station-genre">${st.genre}</div>
        `;
        node.onclick = (e) => {
          e.stopPropagation();
          selectStation(idx);
        };
        stationsRow.appendChild(node);
      });
    }

    // Set Episode (1 or 2) on the current station frequency
        // Set Episode (1 or 2) on the current station frequency
        function scrollToTunerDeck(e) {
      if (e && e.preventDefault) e.preventDefault();
      const deck = document.getElementById('console-card');
      if (deck) {
        const yOffset = -90;
        const y = deck.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }

    function setEpisodePart(epNum) {
      currentEpisodeNum = epNum;
      
      // Update Part Buttons in switcher
      const btn1 = document.getElementById('btn-part-1');
      const btn2 = document.getElementById('btn-part-2');
      if (btn1 && btn2) {
        if (epNum === 1) {
          btn1.classList.add('active');
          btn2.classList.remove('active');
        } else {
          btn2.classList.add('active');
          btn1.classList.remove('active');
        }
      }

      // Update Quick Toggle Button Labels
      const sideLabel = epNum === 1 ? 'EPISODE 1 (SIDE A)' : 'EPISODE 2 (SIDE B)';
      const nextSideLabel = epNum === 1 ? 'SWITCH TO EPISODE 2' : 'SWITCH TO EPISODE 1';
      const quickLabel = document.getElementById('quick-part-toggle-label');
      if (quickLabel) quickLabel.textContent = sideLabel;
      
      const switchText = document.getElementById('switch-btn-text');
      if (switchText) switchText.textContent = nextSideLabel;

      // Deep link + resume: reflect this episode in the URL and remember it
      history.replaceState(null, '', buildChapterHash(currentStationIndex, epNum));
      saveLastVisit(currentStationIndex, epNum);

      // Re-render UI for selected episode (frequency stays untouched)
      updateEpisodeDisplay();
    }

    // Toggle Episode between 1 and 2
    function toggleCurrentPart() {
      setEpisodePart(currentEpisodeNum === 1 ? 2 : 1);
    }

    // Advance to the next chapter on the dial (wraps around after the last one)
    function goToNextChapter() {
      const nextIdx = (currentStationIndex + 1) % STATIONS.length;
      selectStation(nextIdx);
      scrollToTunerDeck();
    }

    // Select Frequency Station on Tuner
    function selectStation(idx) {
      currentStationIndex = idx;
      const st = STATIONS[idx];
      if (!st) return;

      const dialContainer = document.getElementById('dial-container');
      if (dialContainer) {
        dialContainer.setAttribute('aria-valuenow', String(idx + 1));
        dialContainer.setAttribute('aria-valuetext', `Chapter ${st.epNum}, ${st.genre}, ${st.freq.toFixed(1)} MHz`);
      }

      const nextChapterLabel = document.getElementById('next-chapter-label');
      if (nextChapterLabel) {
        const nextSt = STATIONS[(idx + 1) % STATIONS.length];
        nextChapterLabel.textContent = `${nextSt.genre} →`;
      }

      // Deep link + resume: reflect this chapter in the URL and remember it
      history.replaceState(null, '', buildChapterHash(idx, currentEpisodeNum));
      saveLastVisit(idx, currentEpisodeNum);

      // Swap Theme Class on Body (like index.html)
      if (currentThemeClass) document.body.classList.remove(currentThemeClass);
      currentThemeClass = `theme-ep${st.epNum}`;
      document.body.classList.add(currentThemeClass);

      // Update Needle Position
      const percent = ((idx + 0.5) / STATIONS.length) * 100;
      const needle = document.getElementById('dial-needle');
      if (needle) needle.style.left = `${percent}%`;

      // Update Active Node
      document.querySelectorAll('.station-node').forEach((n, i) => {
        if (i === idx) n.classList.add('active');
        else n.classList.remove('active');
      });

      document.querySelectorAll('.tick.major').forEach((t, i) => {
        if (i === idx) t.classList.add('active-tick');
        else t.classList.remove('active-tick');
      });

      // Update Top Meta
      const epNumEl = document.getElementById('meta-ep-num');
      if (epNumEl) epNumEl.textContent = `${st.epNum}/${STATIONS.length}`;
      
      const freqEl = document.getElementById('meta-freq');
      if (freqEl) freqEl.textContent = `${st.freq.toFixed(1)} MHZ`;
      
      const genrePill = document.getElementById('tx-genre-pill');
      if (genrePill) genrePill.textContent = st.genre;
      
      const locTag = document.getElementById('tx-location-tag');
      if (locTag) locTag.innerHTML = `<span>BLACK BUDDHA HQ — ${st.location.toUpperCase()}</span> <span class="host-tech-badge">${st.freq.toFixed(1)} FM</span>`;
      const sigBadge = document.getElementById('signal-badge-text');
      if (sigBadge) sigBadge.textContent = `SIGNAL: ${st.freq.toFixed(1)} FM`;
      
      const tickerGenre = document.getElementById('ticker-genre');
      if (tickerGenre) tickerGenre.textContent = st.genre;
      document.querySelectorAll('.ticker-genre-text').forEach(el => { el.textContent = st.genre; });

      // Render Active Episode on this frequency
      updateEpisodeDisplay();

      // Play short tuner static burst
      playTunerStaticSound();
    }

    // Update all episode elements dynamically on the current frequency
    function updateEpisodeDisplay() {
      const st = STATIONS[currentStationIndex];
      if (!st) return;
      const epData = currentEpisodeNum === 1 ? st.ep1 : st.ep2;
      if (!epData) return;
      const sideTag = currentEpisodeNum === 1 ? 'EPISODE 1' : 'EPISODE 2';

      // Magazine Cover Card
      const magBadge = document.getElementById('mag-issue-badge');
      if (magBadge) magBadge.textContent = `CHAPTER ${st.epNum} — ${sideTag}`;
      
      const magImg = document.getElementById('mag-real-img');
      if (magImg) {
        magImg.src = st.cardImg;
        magImg.alt = `${st.genre} chapter magazine cover — Chapter ${st.epNum}, ${sideTag}`;
      }

      // Transmission Top Meta
      const chapterText = document.getElementById('tx-chapter-text');
      if (chapterText) chapterText.textContent = `TRANSMISSION EP ${st.epNum}.${currentEpisodeNum} — ${epData.era}`;

      // Title & Highlight
      const titleEl = document.getElementById('tx-title');
      const epPrefix = currentEpisodeNum === 1 ? 'EP 01' : 'EP 02';
      if (titleEl) titleEl.innerHTML = `${epPrefix} <span class="title-genre-highlight">${st.genre}</span>: ${epData.title.toUpperCase()}`;

      // Subtitle (if element exists)
      const subEl = document.getElementById('tx-subtitle');
      if (subEl && epData.subtitle) subEl.textContent = epData.subtitle;

      // Micro Chips Row
      const chipsRow = document.getElementById('tx-chips-row');
      if (chipsRow) {
        chipsRow.innerHTML = '';
        if (epData.chips) {
          epData.chips.forEach(chip => {
            const chipEl = document.createElement('span');
            chipEl.className = 'tx-chip';
            chipEl.textContent = chip;
            chipsRow.appendChild(chipEl);
          });
        }
      }

      // Editorial Blurb & Word Count
      const descBox = document.getElementById('tx-desc-box');
      if (descBox) descBox.textContent = epData.desc;

      // Selector's Desk — only shown when a chapter has a curator's note
      const selectorDeskWrapper = document.getElementById('selector-desk-wrapper');
      const selectorDeskText = document.getElementById('selector-desk-text');
      if (selectorDeskWrapper && selectorDeskText) {
        if (epData.selectorNote) {
          selectorDeskText.textContent = epData.selectorNote;
          selectorDeskWrapper.style.display = '';
        } else {
          selectorDeskWrapper.style.display = 'none';
        }
      }


      // Location tag
      const locTag = document.getElementById('tx-location-tag');
      const freqEl = document.getElementById('meta-freq');
      if (freqEl) freqEl.textContent = `${st.freq.toFixed(1)} MHZ`;
      const epNumEl = document.getElementById('meta-ep-num');
      if (epNumEl) epNumEl.textContent = `${st.epNum}/${STATIONS.length}`;
      if (locTag) locTag.innerHTML = `<span>BLACK BUDDHA HQ — ${st.location.toUpperCase()}</span> <span class="host-tech-badge">${st.freq.toFixed(1)} FM</span>`;
      const sigBadge = document.getElementById('signal-badge-text');
      if (sigBadge) sigBadge.textContent = `SIGNAL: ${st.freq.toFixed(1)} FM`;
      
      const tickerGenre = document.getElementById('ticker-genre');
      if (tickerGenre) tickerGenre.textContent = st.genre;
      document.querySelectorAll('.ticker-genre-text').forEach(el => { el.textContent = st.genre; });

      // Tracks Header & List
      const tracksHeading = document.getElementById('tracks-heading-text');
      if (tracksHeading) tracksHeading.textContent = `KEY TRACKS & DUBPLATES — EPISODE ${currentEpisodeNum}`;
      
      renderTracks(epData.tracks);

      // Play & Music Controls
      const playText = document.getElementById('play-text');
      if (playText) playText.textContent = isPlaying ? `PAUSE TRANSMISSION (EPISODE ${currentEpisodeNum})` : `TUNE IN & PLAY EPISODE ${currentEpisodeNum}`;
      
      // Reset scrubber
      secondsElapsed = 0;
      const totalSecs = parseDurationToSeconds(epData.duration);
      updateScrubberUI(totalSecs, epData.duration);
      
      if (audioElement && epData.audio) {
        audioElement.src = epData.audio;
      }
    }

        function renderTracks(tracks) {
      const listContainer = document.getElementById('tracks-list-container');
      if (!listContainer) return;
      listContainer.innerHTML = '';

      if (!tracks || !Array.isArray(tracks)) return;

      tracks.forEach((track, i) => {
        const num = String(i + 1).padStart(2, '0');
        const title = typeof track === 'string' ? track : (track.title || '');
        const tag = (track && track.tag) ? track.tag : 'DUBPLATE';
        const row = document.createElement('li');
        row.className = 'track-row-item';
        row.innerHTML = `
          <div class="track-left-meta">
            <span class="track-row-num">${num}</span>
            <span class="track-row-title">${title}</span>
          </div>
          <span class="track-chip-badge">${tag}</span>
        `;
        listContainer.appendChild(row);
      });

      const badge = document.getElementById('toggle-count-badge');
      if (badge) badge.textContent = `(${tracks.length} TRACKS)`;
    }

    // Dropdown Toggle Logic
    function toggleTracksDropdown() {
      isTracksOpen = !isTracksOpen;
      const toggleBtn = document.getElementById('tracks-dropdown-toggle');
      const wrapper = document.getElementById('tracks-collapsible-wrapper');

      if (isTracksOpen) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        wrapper.classList.remove('collapsed');
      } else {
        toggleBtn.setAttribute('aria-expanded', 'false');
        wrapper.classList.add('collapsed');
      }
    }

    // ── Free-dragging tuner dial ─────────────────────────────────────
    // The needle can be dragged to any position along the ruler, not just
    // snapped to a station. It only locks onto a station (and stops the
    // static) once it's close enough to one; otherwise a static hiss plays,
    // like scanning between real stations.
    const DIAL_LOCK_THRESHOLD_PCT = 2.5; // half-width of the "locked on" zone around each station
    let isDraggingDial = false;

    function dialPercentForClientX(clientX) {
      const rect = document.getElementById('dial-container').getBoundingClientRect();
      if (!rect.width) return 0;
      return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    }

    function nearestStationForPercent(pct) {
      const segment = 100 / STATIONS.length;
      const idx = Math.max(0, Math.min(STATIONS.length - 1, Math.floor(pct / segment)));
      const stationCenter = (idx + 0.5) * segment;
      return { idx, distance: Math.abs(pct - stationCenter) };
    }

    function handleDialPointerDown(e) {
      // Station-name buttons below the ruler have their own click-to-select
      // behavior — don't hijack presses on them into a drag.
      if (e.target.closest && e.target.closest('.station-node')) return;

      isDraggingDial = true;
      const dial = document.getElementById('dial-container');
      try { dial.setPointerCapture(e.pointerId); } catch (err) {}
      const needle = document.getElementById('dial-needle');
      if (needle) needle.style.transition = 'none';
      handleDialPointerMove(e);
    }

    function handleDialPointerMove(e) {
      if (!isDraggingDial) return;
      e.preventDefault();
      const pct = dialPercentForClientX(e.clientX);
      const needle = document.getElementById('dial-needle');
      if (needle) needle.style.left = `${pct}%`;

      const { distance } = nearestStationForPercent(pct);
      if (distance > DIAL_LOCK_THRESHOLD_PCT) {
        startTuningStatic();
      } else {
        stopTuningStatic(true);
      }
    }

    function handleDialPointerUp(e) {
      if (!isDraggingDial) return;
      isDraggingDial = false;
      const dial = document.getElementById('dial-container');
      try { dial.releasePointerCapture(e.pointerId); } catch (err) {}
      const needle = document.getElementById('dial-needle');
      if (needle) needle.style.transition = '';

      const pct = dialPercentForClientX(e.clientX);
      const { idx } = nearestStationForPercent(pct);
      stopTuningStatic(true);
      selectStation(idx);
    }

    function handleDialKeydown(e) {
      const keyToDelta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
      if (e.key === 'Home') {
        e.preventDefault();
        selectStation(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        selectStation(STATIONS.length - 1);
        return;
      }
      const delta = keyToDelta[e.key];
      if (delta === undefined) return;
      e.preventDefault();
      const targetIdx = Math.max(0, Math.min(STATIONS.length - 1, currentStationIndex + delta));
      selectStation(targetIdx);
    }

        function parseDurationToSeconds(durStr) {
      if (!durStr) return 3000;
      const parts = durStr.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 3000;
    }

    function formatSeconds(secs) {
      const mins = String(Math.floor(secs / 60)).padStart(2, '0');
      const s = String(Math.floor(secs % 60)).padStart(2, '0');
      return `${mins}:${s}`;
    }

    function handleScrubberClick(e) {
      const track = document.getElementById('scrubber-track');
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = clickX / rect.width;
      
      const st = STATIONS[currentStationIndex];
      const epData = currentEpisodeNum === 1 ? st.ep1 : st.ep2;
      const totalSecs = parseDurationToSeconds(epData.duration);
      
      secondsElapsed = Math.floor(pct * totalSecs);
      
      if (audioElement && !isNaN(audioElement.duration) && audioElement.duration > 0) {
        try {
          audioElement.currentTime = (pct * audioElement.duration);
        } catch(err) {}
      }
      
      updateScrubberUI(totalSecs, epData.duration);
    }

    function updateScrubberUI(totalSecs, durationStr) {
      const currentFormatted = formatSeconds(secondsElapsed);
      const pct = totalSecs > 0 ? Math.min(100, Math.max(0, (secondsElapsed / totalSecs) * 100)) : 0;
      
      const progressEl = document.getElementById('scrubber-progress');
      if (progressEl) progressEl.style.width = `${pct}%`;
      
      const scrubCurrent = document.getElementById('scrub-time-current');
      if (scrubCurrent) scrubCurrent.textContent = currentFormatted;
      
      const scrubTotal = document.getElementById('scrub-time-total');
      if (scrubTotal) scrubTotal.textContent = durationStr;
      
      const timecodeEl = document.getElementById('timecode-display');
      if (timecodeEl) timecodeEl.textContent = `${currentFormatted} / ${durationStr}`;
    }

    // Toggle Audio Play / Pause
    function togglePlayActiveTrack() {
      isPlaying = !isPlaying;
      const playText = document.getElementById('play-text');
      const waveEl = document.getElementById('mini-wave');

      if (isPlaying) {
        playText.textContent = `PAUSE TRANSMISSION (EPISODE ${currentEpisodeNum})`;
        waveEl.classList.add('playing');
        if (audioElement) {
          try { audioElement.play(); } catch(e) {}
        }
        startTimer();
      } else {
        playText.textContent = `TUNE IN & PLAY EPISODE ${currentEpisodeNum}`;
        waveEl.classList.remove('playing');
        if (audioElement) {
          audioElement.pause();
        }
        clearInterval(timerInterval);
      }
    }

    function startTimer() {
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        secondsElapsed++;
        const st = STATIONS[currentStationIndex];
        const epData = currentEpisodeNum === 1 ? st.ep1 : st.ep2;
        const totalSecs = parseDurationToSeconds(epData.duration);
        if (secondsElapsed >= totalSecs) {
          secondsElapsed = 0;
          togglePlayActiveTrack();
        }
        updateScrubberUI(totalSecs, epData.duration);
      }, 1000);
    }

    // Single shared AudioContext, reused by every static/noise effect
    // instead of spinning up a new one on every call.
    let sharedAudioCtx = null;
    function getSharedAudioContext() {
      try {
        if (!sharedAudioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return null;
          sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
        return sharedAudioCtx;
      } catch (e) { return null; }
    }

    function playTunerStaticSound() {
      try {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      } catch (e) {}
    }

    // ── Sustained "between stations" static (used while dragging the
    //    dial) — fades itself out automatically 3 seconds after it starts
    //    or was last refreshed, like scanning through dead air. ──
    let staticNoiseSource = null;
    let staticNoiseGain = null;
    let staticFadeTimer = null;

    function startTuningStatic() {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (staticNoiseSource && staticNoiseGain) {
        // Already playing — just refresh the fade-out envelope.
        staticNoiseGain.gain.cancelScheduledValues(now);
        staticNoiseGain.gain.setValueAtTime(staticNoiseGain.gain.value, now);
        staticNoiseGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        staticNoiseGain.gain.linearRampToValueAtTime(0, now + 3);
      } else {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 3);

        noise.connect(gain);
        gain.connect(ctx.destination);
        try { noise.start(); } catch (e) {}

        staticNoiseSource = noise;
        staticNoiseGain = gain;
      }

      clearTimeout(staticFadeTimer);
      staticFadeTimer = setTimeout(() => stopTuningStatic(false), 3000);
    }

    function stopTuningStatic(fast) {
      clearTimeout(staticFadeTimer);
      if (!staticNoiseSource || !staticNoiseGain) return;
      const ctx = getSharedAudioContext();
      const src = staticNoiseSource;
      const fadeSecs = fast ? 0.08 : 0.15;
      if (ctx) {
        const now = ctx.currentTime;
        try {
          staticNoiseGain.gain.cancelScheduledValues(now);
          staticNoiseGain.gain.setValueAtTime(staticNoiseGain.gain.value, now);
          staticNoiseGain.gain.linearRampToValueAtTime(0, now + fadeSecs);
        } catch (e) {}
      }
      setTimeout(() => { try { src.stop(); } catch (e) {} }, (fadeSecs * 1000) + 50);
      staticNoiseSource = null;
      staticNoiseGain = null;
    }

    function openActiveMagazine() {
      const st = STATIONS[currentStationIndex];
      if (st && typeof window.openBookletModal === 'function') {
        window.openBookletModal(st, currentEpisodeNum);
      }
    }

    // ── Deep linking & resume ──────────────────────────────────────
    function buildChapterHash(idx, epNum) {
      const st = STATIONS[idx];
      if (!st) return '';
      return epNum === 2 ? `#ep${st.epNum}-2` : `#ep${st.epNum}`;
    }

    function parseChapterHash(hash) {
      const m = /^#ep(\d{2})(?:-(\d))?$/.exec(hash || '');
      if (!m) return null;
      const idx = STATIONS.findIndex(st => st.epNum === m[1]);
      if (idx === -1) return null;
      return { idx, epPart: m[2] === '2' ? 2 : 1 };
    }

    function saveLastVisit(idx, epNum) {
      try {
        localStorage.setItem('bbfm_last_visit', JSON.stringify({ idx, epNum }));
      } catch (e) {}
    }

    function loadLastVisit() {
      try {
        const raw = localStorage.getItem('bbfm_last_visit');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed.idx === 'number' && STATIONS[parsed.idx]) {
          return { idx: parsed.idx, epPart: parsed.epNum === 2 ? 2 : 1 };
        }
      } catch (e) {}
      return null;
    }

    function resolveInitialChapter() {
      return parseChapterHash(window.location.hash) || loadLastVisit() || { idx: 0, epPart: 1 };
    }

    // ── Scan to a random chapter ───────────────────────────────────
    function scanRandomChapter() {
      if (STATIONS.length <= 1) return;
      let idx;
      do {
        idx = Math.floor(Math.random() * STATIONS.length);
      } while (idx === currentStationIndex);
      selectStation(idx);
      scrollToTunerDeck();
    }

    // ── Share the current chapter ──────────────────────────────────
    async function shareCurrentChapter() {
      const st = STATIONS[currentStationIndex];
      if (!st) return;
      const url = window.location.origin + window.location.pathname + buildChapterHash(currentStationIndex, currentEpisodeNum);
      const shareText = `${st.genre} — Chapter ${st.epNum} on Black Buddha FM`;

      if (navigator.share) {
        try {
          await navigator.share({ title: 'Black Buddha FM', text: shareText, url });
          return;
        } catch (e) {
          // user cancelled the native share sheet, or it's unsupported — fall through to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        const btn = document.getElementById('btn-share-chapter');
        if (btn) {
          const original = btn.textContent;
          btn.textContent = 'LINK COPIED';
          setTimeout(() => { btn.textContent = original; }, 1800);
        }
      } catch (e) {}
    }

    // ── Light / dark theme toggle ──────────────────────────────────
    function updateThemeToggleUI() {
      const btn = document.getElementById('theme-toggle-btn');
      if (!btn) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      btn.setAttribute('aria-pressed', String(isLight));
      btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
      btn.textContent = isLight ? '☀' : '☾';
    }

    function initThemeToggle() {
      try {
        if (localStorage.getItem('bbfm_theme') === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } catch (e) {}
      updateThemeToggleUI();
    }

    function toggleLightMode() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      try { localStorage.setItem('bbfm_theme', isLight ? 'dark' : 'light'); } catch (e) {}
      updateThemeToggleUI();
    }

    // ── Global keyboard shortcuts ──────────────────────────────────
    document.addEventListener('keydown', (e) => {
      if (window.isMagazineModalOpen && window.isMagazineModalOpen()) return;

      const tag = (document.activeElement && document.activeElement.tagName) || '';
      const isFormControl = ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(tag);
      if (isFormControl) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayActiveTrack();
      } else if (e.key === 'r' || e.key === 'R') {
        scanRandomChapter();
      }
    });

    // ── Wire up controls that used to carry inline onclick/onerror handlers ──
    function initControlListeners() {
      document.getElementById('theme-toggle-btn').addEventListener('click', toggleLightMode);
      document.getElementById('hero-play-btn').addEventListener('click', scrollToTunerDeck);
      document.getElementById('btn-scan').addEventListener('click', scanRandomChapter);

      const dial = document.getElementById('dial-container');
      dial.addEventListener('pointerdown', handleDialPointerDown);
      dial.addEventListener('pointermove', handleDialPointerMove);
      dial.addEventListener('pointerup', handleDialPointerUp);
      dial.addEventListener('pointercancel', handleDialPointerUp);
      dial.addEventListener('keydown', handleDialKeydown);

      document.getElementById('mag-real-img').addEventListener('error', (e) => {
        e.target.style.opacity = '0';
      });

      document.getElementById('btn-open-mag').addEventListener('click', openActiveMagazine);
      document.getElementById('btn-share-chapter').addEventListener('click', shareCurrentChapter);
      document.getElementById('btn-part-1').addEventListener('click', () => setEpisodePart(1));
      document.getElementById('btn-part-2').addEventListener('click', () => setEpisodePart(2));
      document.getElementById('btn-tune-play').addEventListener('click', togglePlayActiveTrack);
      document.getElementById('btn-switch-episode').addEventListener('click', toggleCurrentPart);
      document.getElementById('scrubber-track').addEventListener('click', handleScrubberClick);
      document.getElementById('tracks-dropdown-toggle').addEventListener('click', toggleTracksDropdown);
      document.getElementById('btn-next-chapter').addEventListener('click', goToNextChapter);
    }

    // Init on load
    document.addEventListener('DOMContentLoaded', () => {
      audioElement = document.getElementById('main-audio');
      initDialTicks();
      initThemeToggle();
      initControlListeners();

      const initial = resolveInitialChapter();
      selectStation(initial.idx);
      setEpisodePart(initial.epPart);
    });

    // ── Public interface used by magazine.js ──────────────────────
    // magazine.js renders the booklet's "special stream" player, which
    // needs to read the main deck's duration/time formatting and pause
    // the main track if the booklet's own audio starts playing.
    window.BBFM = {
      parseDurationToSeconds,
      formatSeconds,
      isPlayingActiveTrack: () => isPlaying,
      togglePlayActiveTrack
    };

