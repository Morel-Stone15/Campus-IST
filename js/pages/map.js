/* Plan interactif de l'université (carte SVG 1000 × 700) */
(function () {
  const { ui } = IST;
  const icon = IST.icon;
  const W = 1000, H = 700;
  const FILTERS = [['tous', 'Tous'], ['batiment', 'Bâtiments'], ['salle', 'Salles'], ['service', 'Services']];
  const st = { filter: 'tous', q: '', selected: null, zoom: null };

  const places = () => IST.data.places;
  const byId = (id) => places().find((p) => p.id === id);
  const markerOf = (p) => (p.parent ? byId(p.parent) : p.x != null ? p : null);
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function matches(p) {
    if (st.filter !== 'tous' && p.category !== st.filter) return false;
    const q = norm(st.q.trim());
    return !q || norm(p.name + ' ' + p.desc).includes(q);
  }

  /* ---------- Dessin du campus ---------- */
  function building(x, y, w, h, label, sub) {
    return `<g>
      <rect class="m-shadow" x="${x + 6}" y="${y + 8}" width="${w}" height="${h}" rx="10"/>
      <rect class="m-bld" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>
      <rect class="m-roof" x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" rx="6"/>
      <text class="m-label" x="${x + w / 2}" y="${y + h / 2 + (sub ? 0 : 6)}">${label}</text>
      ${sub ? `<text class="m-sub" x="${x + w / 2}" y="${y + h / 2 + 20}">${sub}</text>` : ''}
    </g>`;
  }
  const tree = (x, y, r = 16) => `<circle class="m-tree" cx="${x}" cy="${y}" r="${r}"/><circle class="m-tree2" cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.55}"/>`;

  function mapSVG() {
    const road = 'M70 250 H930 V480 H70 Z M500 480 V700';
    const trees = [[40, 40], [370, 40], [640, 40], [960, 60], [40, 600], [960, 640], [600, 690], [40, 300], [960, 300], [300, 450], [720, 450], [100, 690]]
      .map(([x, y]) => tree(x, y)).join('');
    let stalls = '';
    for (let i = 0; i < 7; i++) stalls += `<line class="m-park-line" x1="${285 + i * 26}" y1="530" x2="${285 + i * 26}" y2="570"/><line class="m-park-line" x1="${285 + i * 26}" y1="610" x2="${285 + i * 26}" y2="650"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan du campus de l'IST">
      <defs><pattern id="grass-dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle class="m-dot" cx="6" cy="8" r="2"/><circle class="m-dot" cx="24" cy="26" r="2"/></pattern></defs>
      <rect class="m-grass" width="${W}" height="${H}"/><rect width="${W}" height="${H}" fill="url(#grass-dots)"/>
      <path class="m-road" d="${road}" stroke-width="36" stroke-linejoin="round"/>
      <path class="m-line" d="${road}" stroke-width="2" stroke-dasharray="14 14"/>
      ${trees}
      ${building(110, 70, 230, 150, 'Bâtiment A', 'Génie Électrique · 2e étage')}
      ${building(390, 70, 530, 160, 'Bâtiment B', 'Pôle Management · Pôle Technologique')}
      ${building(120, 290, 250, 130, 'Amphithéâtre')}
      ${building(430, 290, 220, 130, 'Bibliothèque')}
      ${building(710, 290, 210, 130, 'Restaurant')}
      ${building(110, 515, 140, 100, 'Infirmerie')}
      <rect class="m-park" x="270" y="515" width="200" height="150" rx="10"/>${stalls}
      <text class="m-label" x="370" y="597" style="fill:#fff">P</text>
      <rect class="m-field" x="560" y="515" width="370" height="160" rx="10"/>
      <rect class="m-field-line" x="580" y="530" width="330" height="130" rx="2"/>
      <line class="m-field-line" x1="745" y1="530" x2="745" y2="660"/><circle class="m-field-line" cx="745" cy="595" r="26"/>
      <rect class="m-field-line" x="580" y="565" width="34" height="60"/><rect class="m-field-line" x="876" y="565" width="34" height="60"/>
      <rect x="470" y="682" width="60" height="10" rx="3" fill="#fcd116"/>
    </svg>`;
  }

  /* ---------- Rendu ---------- */
  function markersHTML() {
    const visible = places().filter(matches);
    const active = new Set(visible.map(markerOf).filter(Boolean).map((m) => m.id));
    const sel = st.selected && markerOf(byId(st.selected));
    return places().filter((p) => !p.parent).map((p) => {
      const dim = (st.filter !== 'tous' || st.q) && !active.has(p.id);
      return `<button type="button" class="marker tone-${p.tone} ${sel && sel.id === p.id ? 'active' : ''} ${dim ? 'dim' : ''}"
        style="left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%" data-place="${p.id}" aria-label="${ui.esc(p.name)}">
        <span class="pin">${icon(p.icon)}</span></button>`;
    }).join('');
  }

  function resultsHTML() {
    const list = places().filter(matches);
    if (!list.length) return `<div class="card">${ui.empty('search', 'Aucun lieu trouvé', 'Essaie « P107 », « A203 », « ASRT » ou « amphi ».')}</div>`;
    return `<div class="list">${list.map((p) => `
      <button type="button" class="list-item" data-place="${p.id}">
        <span class="ic-box sm tone-${p.tone}">${icon(p.icon)}</span>
        <div class="grow"><strong>${ui.esc(p.name)}</strong><small>${ui.esc(p.desc)}</small></div>
        ${icon('chevronRight')}
      </button>`).join('')}</div>`;
  }

  function cardHTML() {
    const p = st.selected && byId(st.selected);
    if (!p) return '';
    const label = { batiment: 'Bâtiment', salle: 'Salle', service: 'Service' }[p.category];
    return `<div class="place-card tone-${p.tone}" role="status">
      <span class="ic-box">${icon(p.icon)}</span>
      <div class="grow"><strong>${ui.esc(p.name)}</strong><small>${ui.esc(p.desc)}</small>
        <span class="tag" style="margin-top:6px">${label}${p.parent ? ' · ' + ui.esc(byId(p.parent).name) : ''}</span>${p.parent || p.x != null ? '' : '<small class="muted">Emplacement à confirmer auprès de la Direction des études.</small>'}</div>
      <button class="icon-btn" data-unselect aria-label="Fermer">${icon('x')}</button>
    </div>`;
  }

  IST.pages.plan = {
    title: "Plan de l'université",
    subtitle: 'Trouve un bâtiment, une salle ou un service',
    render({ user }) {
      const mine = IST.db.myRoom(user);
      const mineId = mine && (typeof mine.raw === 'string' ? 'amphi' : 'room-' + (mine.raw[0] || 'X') + mine.raw[1]);
      if (st.zoom == null) st.zoom = window.innerWidth < 700 ? 1.8 : 1;
      return `<div class="map-layout">
        <div class="map-side">
          <label class="searchbar">${icon('search')}<span class="sr-only">Rechercher un lieu</span>
            <input type="search" placeholder="Rechercher une salle, une filière… (ex. P107, BFA)" value="${ui.esc(st.q)}" data-q></label>
          <div class="chips">${FILTERS.map(([v, l]) => `<button type="button" class="chip ${v === st.filter ? 'active' : ''}" data-filter="${v}">${l}</button>`).join('')}</div>
          ${mineId ? `<button type="button" class="btn btn-soft btn-block" data-place="${mineId}">${icon('locate')}Où est ma salle ? · ${ui.esc(mine.label)}</button>` : ''}
          <div class="map-results" data-results>${resultsHTML()}</div>
        </div>
        <div class="map-shell">
          <div class="map-wrap" data-wrap>
            <div class="map-canvas" data-canvas style="width:${st.zoom * 100}%">${mapSVG()}<div data-markers>${markersHTML()}</div></div>
          </div>
          <div class="map-controls">
            <button class="icon-btn" data-zoom="1" aria-label="Zoomer">${icon('plus')}</button>
            <button class="icon-btn" data-zoom="-1" aria-label="Dézoomer">${icon('minus')}</button>
            <button class="icon-btn" data-zoom="0" aria-label="Recentrer">${icon('locate')}</button>
          </div>
          <div data-card>${cardHTML()}</div>
        </div>
      </div>`;
    },
    mount(el) {
      const $ = (s) => el.querySelector(s);
      const wrap = $('[data-wrap]'), canvas = $('[data-canvas]');

      function update() {
        $('[data-markers]').innerHTML = markersHTML();
        $('[data-results]').innerHTML = resultsHTML();
        $('[data-card]').innerHTML = cardHTML();
      }
      function centerOn(p) {
        const m = markerOf(p);
        if (!m) return;
        wrap.scrollTo({ left: (m.x / W) * canvas.offsetWidth - wrap.clientWidth / 2, top: (m.y / H) * canvas.offsetHeight - wrap.clientHeight / 2, behavior: 'smooth' });
      }
      function setZoom(z) {
        const cx = (wrap.scrollLeft + wrap.clientWidth / 2) / canvas.offsetWidth;
        const cy = (wrap.scrollTop + wrap.clientHeight / 2) / canvas.offsetHeight;
        st.zoom = z;
        canvas.style.transition = 'none';
        canvas.style.width = z * 100 + '%';
        wrap.scrollLeft = cx * canvas.offsetWidth - wrap.clientWidth / 2;
        wrap.scrollTop = cy * canvas.offsetHeight - wrap.clientHeight / 2;
      }

      $('[data-q]').addEventListener('input', (e) => {
        st.q = e.target.value;
        update();
      });
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-place], [data-filter], [data-zoom], [data-unselect]');
        if (!t) return;
        if (t.dataset.filter) {
          st.filter = t.dataset.filter;
          el.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === t));
          update();
        } else if (t.dataset.place) {
          st.selected = t.dataset.place;
          update();
          centerOn(byId(st.selected));
          if (window.innerWidth < 1024 && t.classList.contains('list-item')) el.querySelector('.map-shell').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (t.dataset.zoom) {
          const d = +t.dataset.zoom;
          if (d === 0) { setZoom(window.innerWidth < 700 ? 1.8 : 1); st.selected = null; update(); }
          else setZoom(Math.min(3, Math.max(1, +(st.zoom + d * 0.5).toFixed(1))));
        } else if (t.hasAttribute('data-unselect')) {
          st.selected = null;
          update();
        }
      });
      // Position initiale : centre de la carte, ou le lieu sélectionné
      requestAnimationFrame(() => (st.selected ? centerOn(byId(st.selected)) : wrap.scrollTo((canvas.offsetWidth - wrap.clientWidth) / 2, (canvas.offsetHeight - wrap.clientHeight) / 2)));
    },
  };
})();
