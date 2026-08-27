/* ═══════════════════════════════════════════════════════════════
   bmv-rail v4-rail — behavior
   Extracted from test/bass-map-variations.html (V4).

   Usage:
     <div class="bmv-rail v4-rail">
       <div class="bmv-rail-logo">BB<br>FM</div>
       <div class="v4-line-wrap">
         <div class="v4-line"></div>
         <div class="v4-line-fill" id="v4LineFill"></div>
         <div class="v4-stops" id="v4Stops"></div>
       </div>
     </div>

     <script src="rail.js"></script>
     <script>
       BMVRailV4.init({ genres: GENRES, locations: LOCATIONS });
       BMVRailV4.update(currentIdx); // call whenever the active chapter changes
     </script>
   ═══════════════════════════════════════════════════════════════ */

(function (global) {
  let genres = [];
  let locations = [];
  let v4Stops, v4LineFill;

  function init({ genres: g, locations: l, stopsEl, lineFillEl, onSelect } = {}) {
    genres = g || [];
    locations = l || [];
    v4Stops = stopsEl || document.getElementById('v4Stops');
    v4LineFill = lineFillEl || document.getElementById('v4LineFill');

    v4Stops.innerHTML = '';
    genres.forEach((genre, i) => {
      const pct = (i / (genres.length - 1)) * 100;
      const stop = document.createElement('div');
      stop.className = 'v4-stop';
      stop.style.top = `${pct}%`;
      stop.dataset.idx = i;
      stop.title = `${genre} — ${locations[i] || ''}`;
      stop.addEventListener('click', () => {
        if (onSelect) onSelect(i);
      });
      v4Stops.appendChild(stop);
    });
  }

  function update(currentIdx) {
    const pct = (currentIdx / (genres.length - 1)) * 100;
    v4LineFill.style.height = `${pct}%`;
    v4Stops.querySelectorAll('.v4-stop').forEach(stop => {
      const active = Number(stop.dataset.idx) === currentIdx;
      stop.classList.toggle('active', active);
      stop.querySelector('.v4-stop-tag')?.remove();
      if (active) {
        const tag = document.createElement('span');
        tag.className = 'v4-stop-tag';
        tag.textContent = (locations[currentIdx] || '').split(',')[0];
        stop.appendChild(tag);
      }
    });
  }

  global.BMVRailV4 = { init, update };
})(window);
