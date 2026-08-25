// magazine.js - Lazy-loaded module for the Magazine Zone booklet modal and spreads
(function () {
  let currentSpread = 1;
  let bookletStation = null;
  let bookletEpNum = 1;
  let bookletAudio = null;
  let bookletAudioPlaying = false;
  let bookletRafId = null;

  const magazineModal = document.getElementById('magazine-modal');
  const bookletContainer = document.getElementById('booklet-container');
  const prevBtn = document.getElementById('booklet-prev-btn');
  const nextBtn = document.getElementById('booklet-next-btn');
  const pageIndicator = document.getElementById('booklet-page-indicator');

  function currentEpData() {
    if (!bookletStation) return null;
    return bookletEpNum === 1 ? bookletStation.ep1 : bookletStation.ep2;
  }

  function otherEpData() {
    if (!bookletStation) return null;
    return bookletEpNum === 1 ? bookletStation.ep2 : bookletStation.ep1;
  }

  function themeColor() {
    const computed = getComputedStyle(document.body);
    return {
      hex: computed.getPropertyValue('--theme-primary').trim() || '#ff2dab',
      rgb: computed.getPropertyValue('--theme-primary-rgb').trim() || '255, 45, 171'
    };
  }

  function openBookletModal(station, epNum) {
    if (!station) return;
    bookletStation = station;
    bookletEpNum = epNum === 2 ? 2 : 1;
    currentSpread = 1;
    if (magazineModal) magazineModal.style.display = 'flex';
    renderBookletSpread();

    if (bookletAudio) { bookletAudio.pause(); bookletAudio = null; }
    const otherEp = otherEpData();
    bookletAudio = new Audio(otherEp?.audio || '');
    bookletAudio.crossOrigin = 'anonymous';
    bookletAudioPlaying = false;
  }

  function closeBookletModal() {
    if (magazineModal) magazineModal.style.display = 'none';
    stopBookletAudio();
    bookletStation = null;
  }

  function stopBookletAudio() {
    if (bookletAudio) {
      bookletAudio.pause();
      bookletAudioPlaying = false;
    }
    if (bookletRafId) { cancelAnimationFrame(bookletRafId); bookletRafId = null; }
    updateBookletAudioUI();
  }

  function startBookletProgressLoop() {
    if (bookletRafId) cancelAnimationFrame(bookletRafId);
    const tick = () => {
      if (!bookletAudio || !bookletAudioPlaying) { bookletRafId = null; return; }

      const elapsed = bookletAudio.currentTime;
      const otherEp = otherEpData();
      const durSecs = (typeof parseDurationToSeconds === 'function' && otherEp) ? parseDurationToSeconds(otherEp.duration) : null;
      const dur = (durSecs !== null) ? durSecs : (bookletAudio.duration || 0);
      const pct = dur > 0 ? (elapsed / dur) * 100 : 0;

      const fill = document.getElementById('special-progress-fill');
      const timeDisplay = document.getElementById('special-current-time');
      if (fill) fill.style.width = pct + '%';
      if (timeDisplay && typeof formatSeconds === 'function') timeDisplay.textContent = formatSeconds(elapsed);

      bookletRafId = requestAnimationFrame(tick);
    };
    bookletRafId = requestAnimationFrame(tick);
  }

  function toggleBookletAudio() {
    if (!bookletAudio) return;
    if (bookletAudioPlaying) {
      bookletAudio.pause();
      bookletAudioPlaying = false;
      if (bookletRafId) { cancelAnimationFrame(bookletRafId); bookletRafId = null; }
      updateBookletAudioUI();
    } else {
      // Pause main player first if active
      if (typeof isPlaying !== 'undefined' && isPlaying && typeof togglePlayActiveTrack === 'function') {
        togglePlayActiveTrack();
      }
      bookletAudio.play().then(() => {
        bookletAudioPlaying = true;
        updateBookletAudioUI();
        startBookletProgressLoop();
      }).catch(e => console.warn(e));
    }
  }

  function seekBookletAudio(e) {
    if (!bookletAudio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const otherEp = otherEpData();
    const durSecs = (typeof parseDurationToSeconds === 'function' && otherEp) ? parseDurationToSeconds(otherEp.duration) : null;
    const dur = (durSecs !== null) ? durSecs : (bookletAudio.duration || 0);
    bookletAudio.currentTime = pct * dur;
    const fill = document.getElementById('special-progress-fill');
    if (fill) fill.style.width = (pct * 100) + '%';
  }

  function updateBookletAudioUI() {
    const btn = document.getElementById('special-play-btn');
    if (!btn || !bookletStation) return;
    const { hex } = themeColor();
    btn.textContent = bookletAudioPlaying ? '■' : '▶';
    btn.style.background = bookletAudioPlaying ? '#ffffff' : hex;
  }

  function buildMagazineFallbackHTML(station, epData, color, rgb) {
    return `
      <div class="magazine-dynamic-fallback" style="--genre-color: ${color}">
        <div class="mag-header">
          <span class="mag-brand">${station.genre} CULTURE MAGAZINE</span>
          <span class="mag-issue">ISSUE ${station.epNum}</span>
        </div>
        <div class="mag-title-main">${station.genre}</div>
        <div class="mag-artwork-wrap">
          <div class="mag-artwork-gradient" style="background: radial-gradient(circle, rgba(${rgb}, 0.5) 0%, #000 100%)">
          </div>
        </div>
        <div class="mag-content-list">
          <div class="mag-section-title">ORIGINAL VIBES</div>
          <div class="mag-section-desc">THE ROOTS OF ${station.genre} MUSIC</div>
          <div class="mag-interviews">INTERVIEWS: ${epData?.tracks?.[0]?.title.split(/[–—-]/)[0].trim() || 'UNDERGROUND COLLECTIVE'}</div>
          <div class="mag-club-scene">CLUB SCENE: THEN &amp; NOW</div>
        </div>
        <div class="mag-barcode-wrap">
          <div class="mag-barcode"></div>
          <div class="mag-barcode-num">9 771234 567890</div>
        </div>
      </div>`;
  }

  function renderBookletSpread() {
    if (!bookletStation) return;
    const epData = currentEpData();
    if (!epData) return;

    const { hex: color, rgb } = themeColor();
    bookletContainer.style.setProperty('--genre-color', color);
    bookletContainer.style.setProperty('--genre-color-alpha-light', `rgba(${rgb}, 0.08)`);
    bookletContainer.style.setProperty('--genre-color-alpha-heavy', `rgba(${rgb}, 0.4)`);

    const coverHtml = bookletStation.cardImg
      ? `<img src="${bookletStation.cardImg}" alt="Cover" class="magazine-img" width="1089" height="1444">`
      : buildMagazineFallbackHTML(bookletStation, epData, color, rgb);

    if (currentSpread === 1) {
      const editorialText = `${epData.desc} From pirate radio towers to the sticky floors of sweaty warehouses, this musical trajectory is built on raw frequencies and community power. This is an archival scan of the movement's evolution. Stay locked to the lineage.`;

      bookletContainer.innerHTML = `
        <div class="booklet-page left-page" style="padding:0;">${coverHtml}</div>
        <div class="booklet-page right-page">
          <div>
            <h2 class="booklet-title" style="--genre-color: ${color}">${bookletStation.genre} EVOLUTION</h2>
            <div class="booklet-subtitle">${epData.subtitle || ''}</div>
            <p class="booklet-text">${epData.desc}</p>
            <p class="booklet-text">${editorialText.substring(0, 160)}...</p>
          </div>
          <div class="booklet-page-num">PAGE 02</div>
        </div>`;

      prevBtn.disabled = true;
      nextBtn.disabled = false;
      pageIndicator.textContent = 'SPREAD 1 / 4 (PAGES 1-2)';

    } else if (currentSpread === 2) {
      let tracksHtml = '';
      if (epData.tracks?.length) {
        epData.tracks.forEach((tr, idx) => {
          tracksHtml += `
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px;font-family: monospace;font-size:10px;color:#222;border-bottom:1px dashed rgba(0,0,0,0.05);padding-bottom:4px;">
              <span style="color:${color};font-weight:700;">${String(idx + 1).padStart(2, '0')}</span>
              <span>${tr.title}</span>
            </div>`;
        });
      } else {
        tracksHtml = '<p class="booklet-text">No transmission log available.</p>';
      }

      const galleryImg = bookletStation.cardImg;
      const artists = [...new Set((epData.tracks || []).map(t => t.title.split(/[–—-]/)[0].trim()))].slice(0, 4);
      const artistsBadges = artists.map(a => `<span class="booklet-artist-badge">${a}</span>`).join('');

      bookletContainer.innerHTML = `
        <div class="booklet-page left-page">
          <h2 class="booklet-title" style="--genre-color: ${color}">TRACKLISTING</h2>
          <div class="booklet-subtitle">LOGGED WAVEFORM RECORDINGS</div>
          <div style="flex:1;overflow-y:auto;padding-right:6px;scrollbar-width:thin;">${tracksHtml}</div>
          <div class="booklet-page-num" style="margin-top:10px;">PAGE 03</div>
        </div>
        <div class="booklet-page right-page">
          <div class="booklet-gallery-wrap">
            <h2 class="booklet-title" style="--genre-color: ${color}">VISUAL ARCHIVE</h2>
            <div class="booklet-img-frame img-skeleton">
              <img src="${galleryImg}" class="booklet-img" alt="Visual archive" loading="lazy" onload="this.closest('.img-skeleton')?.classList.add('loaded')" width="600" height="400">
            </div>
            <div>
              <div class="booklet-artists-label">KEY MOVEMENT PROPAGATORS:</div>
              <div class="booklet-artists-list">${artistsBadges}</div>
            </div>
          </div>
          <div class="booklet-page-num">PAGE 04</div>
        </div>`;

      prevBtn.disabled = false;
      nextBtn.disabled = false;
      pageIndicator.textContent = 'SPREAD 2 / 4 (PAGES 3-4)';

    } else if (currentSpread === 3) {
      bookletContainer.innerHTML = `
        <div class="booklet-page left-page">
          <div>
            <h2 class="booklet-title" style="--genre-color: ${color}">RADIO TELEMETRY</h2>
            <div class="booklet-subtitle">TECHNICAL SIGNAL ANALYSIS</div>
            <div style="font-family: monospace;font-size:10px;color:#333;margin-top:15px;line-height:1.6;">
              <div style="border-bottom:1px solid rgba(0,0,0,0.1);padding-bottom:4px;margin-bottom:8px;">
                <span style="font-weight:700;color:${color};">PARAMETER</span>
                <span style="float:right;font-weight:700;">VALUE</span>
              </div>
              <div style="margin-bottom:6px;"><span>FREQUENCY</span><span style="float:right;color:${color};font-weight:700;">${bookletStation.freq} MHz</span></div>
              <div style="margin-bottom:6px;"><span>SIGNAL PATH</span><span style="float:right;">94.8 FM Relay</span></div>
              <div style="margin-bottom:6px;"><span>TRANSMITTER</span><span style="float:right;">500W ERP Dipole</span></div>
              <div style="margin-bottom:8px;"><span>ENCODING</span><span style="float:right;">Phase Lock Loop Stereo</span></div>
            </div>
            <p class="booklet-text" style="font-size:10px;margin-top:15px;line-height:1.4;">Rigged on high-rise rooftops in clandestine sectors, our custom masts relay sub-heavy signals across metropolitan zones.</p>
          </div>
          <div class="booklet-page-num">PAGE 05</div>
        </div>
        <div class="booklet-page right-page">
          <div>
            <h2 class="booklet-title" style="--genre-color: ${color}">CONVERSATION SCANS</h2>
            <div class="booklet-subtitle">PIRATE SELECTOR INTERVIEW</div>
            <p class="booklet-text" style="font-size:10.5px;font-weight:700;color:#111;margin-top:10px;margin-bottom:4px;">Q: How do you choose your transmission sites?</p>
            <p class="booklet-text" style="font-size:10px;color:#444;margin-bottom:10px;line-height:1.45;">A: "Elevation is everything. We look for blocks with clear lines of sight to key boroughs. Pack the gear, climb up, set the rig, lock the doors. If they locate the signal, we move."</p>
            <p class="booklet-text" style="font-size:10.5px;font-weight:700;color:#111;margin-bottom:4px;">Q: What defines the ${bookletStation.genre} sound?</p>
            <p class="booklet-text" style="font-size:10px;color:#444;line-height:1.45;">A: "The low-end frequencies. The pressure that hits your chest, combined with frantic breakbeats. That energy is built for packed basement clubs."</p>
          </div>
          <div class="booklet-page-num">PAGE 06</div>
        </div>`;

      prevBtn.disabled = false;
      nextBtn.disabled = false;
      pageIndicator.textContent = 'SPREAD 3 / 4 (PAGES 5-6)';

    } else if (currentSpread === 4) {
      const otherEp = otherEpData();
      const otherEpLabel = bookletEpNum === 1 ? 2 : 1;
      bookletContainer.innerHTML = `
        <div class="booklet-page left-page">
          <div>
            <h2 class="booklet-title" style="--genre-color: ${color}">TRANSMISSION CREDITS</h2>
            <div class="booklet-subtitle">PIRATE RADIO ARCHIVAL PROJECT</div>
            <p class="booklet-text">Broadcasting raw frequencies continuously. This booklet functions as a catalog of early 90s to modern UK bass movements.</p>
            <p class="booklet-text">All mixtape decks digitized from physical tapes and remastered at 320 kbps. Special thanks to all participating transmitters, pirate crews, and selectors across London sub-sectors.</p>
            <p class="booklet-text" style="font-style:italic;color:#666;">"Keep the frequency stable. Protect the underground."</p>
          </div>
          <div class="booklet-page-num">PAGE 07</div>
        </div>
        <div class="booklet-page right-page">
          <div>
            <h2 class="booklet-title" style="--genre-color: ${color}">SPECIAL STREAM</h2>
            <div class="booklet-subtitle">CLANDESTINE AUDIO SOURCE</div>
            <p class="booklet-text" style="font-size:11px;">Unlock the secondary transmission log. Tap below to initiate connection to the high-bitrate interview segment.</p>
            <div class="booklet-special-player-card" style="--genre-color: ${color}">
              <div class="special-player-header">
                <div class="special-player-indicator"></div>
                <span class="special-player-title">CLANDESTINE FEED DECK B</span>
              </div>
              <div class="special-player-controls-row">
                <button class="special-play-btn" id="special-play-btn" aria-label="Play booklet stream">▶</button>
                <div class="special-track-info">
                  <span class="special-track-title">${bookletStation.genre} SESSION</span>
                  <span class="special-track-subtitle">EP ${bookletStation.epNum} - EPISODE ${otherEpLabel}</span>
                </div>
              </div>
              <div class="special-progress-block">
                <div class="special-progress-track" id="special-progress-track">
                  <div class="special-progress-fill" id="special-progress-fill"></div>
                </div>
                <div class="special-time-row">
                  <span id="special-current-time">00:00</span>
                  <span id="special-total-time">${otherEp?.duration || '00:00'}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="booklet-page-num">PAGE 08</div>
        </div>`;

      prevBtn.disabled = false;
      nextBtn.disabled = true;
      pageIndicator.textContent = 'SPREAD 4 / 4 (PAGES 7-8)';

      document.getElementById('special-play-btn')?.addEventListener('click', toggleBookletAudio);
      document.getElementById('special-progress-track')?.addEventListener('click', seekBookletAudio);
      updateBookletAudioUI();
    }
  }

  // Expose methods to global scope
  window.openBookletModal = openBookletModal;
  window.closeBookletModal = closeBookletModal;
  window.stopBookletAudio = stopBookletAudio;
  window.toggleBookletAudio = toggleBookletAudio;
  window.isMagazineModalOpen = () => magazineModal && magazineModal.style.display === 'flex';
  window.nextBookletSpread = () => { if (currentSpread < 4) { currentSpread++; renderBookletSpread(); } };
  window.prevBookletSpread = () => { if (currentSpread > 1) { currentSpread--; renderBookletSpread(); } };

  // Wire events
  document.getElementById('magazine-close-btn')?.addEventListener('click', closeBookletModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && magazineModal && magazineModal.style.display === 'flex') {
      closeBookletModal();
    }
  });

  prevBtn?.addEventListener('click', () => {
    if (currentSpread > 1) { currentSpread--; renderBookletSpread(); }
  });
  nextBtn?.addEventListener('click', () => {
    if (currentSpread < 4) { currentSpread++; renderBookletSpread(); }
  });

  console.log("SIGNAL STRENGTH STABLE: magazine.js loaded successfully.");
})();
