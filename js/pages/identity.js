/* Identité de l'IST : hymne, histoire, valeurs, annuaire */
(function () {
  const { ui, config: cfg } = IST;
  const icon = IST.icon;
  let audio = null; // conservé entre les pages : l'hymne continue pendant la navigation

  const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  function syncUI() {
    const root = document.querySelector('[data-player]');
    if (!root || !audio) return;
    root.classList.toggle('playing', !audio.paused);
    root.querySelector('[data-play]').innerHTML = icon(audio.paused ? 'play' : 'pause');
    root.querySelector('[data-play]').setAttribute('aria-label', audio.paused ? "Écouter l'hymne" : 'Mettre en pause');
    const range = root.querySelector('[data-seek]');
    range.max = audio.duration || 0;
    range.value = audio.currentTime;
    root.querySelector('[data-cur]').textContent = fmt(audio.currentTime);
    root.querySelector('[data-dur]').textContent = fmt(audio.duration);
  }

  /** Hymne importé par l'administration (IndexedDB), sinon fichier assets/. */
  async function getAudio() {
    if (audio) return audio;
    let src = cfg.hymnUrl;
    const meta = IST.db.setting('hymn', null);
    if (meta) {
      const blob = await IST.files.get(meta.fileId).catch(() => null);
      if (blob) src = URL.createObjectURL(blob);
    }
    audio = new Audio(src);
    ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended'].forEach((ev) => audio.addEventListener(ev, syncUI));
    audio.addEventListener('error', () => {
      ui.toast("L'hymne n'est pas encore disponible. L'administration doit l'importer.", 'error');
      audio = null;
      syncUI();
    });
    return audio;
  }
  // Appelé par l'administration quand l'hymne change
  IST.identityPlayer = {
    reset() {
      if (audio) { audio.pause(); audio = null; }
    },
  };

  function lyricsHTML() {
    return IST.db.identity().lyrics.map((stanza) => `<p>${stanza.map(ui.esc).join('<br>')}</p>`).join('');
  }

  IST.pages.identite = {
    title: "Identité de l'IST",
    subtitle: 'Hymne, histoire et valeurs de notre école',
    render() {
      const id = IST.db.identity();
      const playing = audio && !audio.paused;
      return `
        <div class="grid-2">
          <div class="player ${playing ? 'playing' : ''}" data-player>
            ${ui.campusArt()}
            <div><span class="tag" style="background:rgba(255,255,255,.18);color:#fff">${icon('music')}Hymne officiel</span>
              <h2 style="font-size:24px;margin-top:10px">Hymne de l'${ui.esc(cfg.schoolShort)}</h2>
              <p style="opacity:.85">Écoutez et chantez avec nous !</p></div>
            <button class="play-btn" data-play aria-label="Écouter l'hymne">${icon(playing ? 'pause' : 'play')}</button>
            <div><input type="range" class="range" min="0" max="0" step="0.1" value="0" data-seek aria-label="Position de lecture">
              <div class="player-time"><span data-cur>0:00</span><span data-dur>0:00</span></div></div>
          </div>
          <div class="card">
            <div class="row-between"><h2 style="font-size:17px">Paroles</h2><span class="ic-box sm tone-blue">${icon('text')}</span></div>
            <div class="lyrics mt">${lyricsHTML()}</div>
          </div>
        </div>

        <section class="section">
          <div class="section-head"><h2>Notre histoire</h2></div>
          <div class="card"><p class="prose">${ui.esc(id.history)}</p></div>
        </section>

        <section class="section">
          <div class="section-head"><h2>Nos valeurs</h2></div>
          <div class="value-grid">${id.values.map(([v, ic, tone]) => `<div class="card value tone-${tone}"><span class="ic-box">${icon(ic)}</span>${ui.esc(v)}</div>`).join('')}</div>
        </section>

        <section class="section">
          <div class="section-head"><h2>Notre offre de formation</h2><span class="muted small">DUT, Licences professionnelles, Masters, Doctorat</span></div>
          <div class="grid-2" style="align-items:start">${cfg.poles.map((p) => `
            <div class="card">
              <div class="row"><span class="ic-box tone-${p.id === 'tech' ? 'blue' : 'orange'}">${icon(p.id === 'tech' ? 'monitor' : 'briefcase')}</span>
                <div><h3 style="font-size:17px">${ui.esc(p.name)}</h3><small class="muted">Bâtiment ${p.building}${p.id === 'tech' ? ' · Génie Électrique au Bâtiment A' : ''}</small></div></div>
              ${p.groups.map((g) => `
                ${p.groups.length > 1 ? `<p class="list-title">${ui.esc(g.name)}</p>` : '<div class="mt"></div>'}
                <div class="list">${g.filieres.map((f) => `
                  <div class="list-item"><div class="grow"><strong>${ui.esc(f.name)}</strong>
                    <small>${ui.esc(f.code)} · ${f.levels.map(IST.school.levelLabel).map((l) => l.replace(/ \(.*\)/, '')).join(', ')}${f.note ? ' · ' + ui.esc(f.note) : ''}</small></div>
                    ${f.open === false ? '<span class="tag tone-yellow">Bientôt</span>' : ''}</div>`).join('')}</div>`).join('')}
            </div>`).join('')}
          </div>
        </section>

        <section class="section">
          <div class="section-head"><h2>Nous contacter</h2></div>
          <div class="grid-2" style="align-items:start">
            <div class="card detail-rows" style="margin:0">
              <div><span class="ic-box sm">${icon('pin')}</span><div><small>Adresse</small>${ui.esc(cfg.address)}<br>${ui.esc(cfg.postalBox)}</div></div>
              <div><span class="ic-box sm">${icon('phone')}</span><div><small>Téléphone</small><a class="link" href="tel:${cfg.phone.replace(/\s/g, '')}">${ui.esc(cfg.phone)}</a></div></div>
              <div><span class="ic-box sm">${icon('file')}</span><div><small>Télécopie</small>${ui.esc(cfg.fax)}</div></div>
            </div>
            <div class="list">${id.directory.map(([n, role]) => `
              <a class="list-item" href="tel:${cfg.phone.replace(/\s/g, '')}"><span class="ic-box sm tone-teal">${icon('building')}</span>
                <div class="grow"><strong>${ui.esc(n)}</strong><small>${ui.esc(role)}</small></div>${icon('phone')}</a>`).join('')}</div>
          </div>
        </section>

        <div class="card motto-card section">
          <span class="ic-box">${icon('music')}</span>
          <strong>${ui.esc(cfg.schoolShort)}</strong>
          <p class="text-2">Plus qu'une école, une famille !</p>
          <div class="row" style="flex-wrap:wrap;justify-content:center">${id.socials.map(([n, ic, url]) => `<a class="btn btn-soft btn-sm" href="${ui.esc(url)}" target="_blank" rel="noopener">${icon(ic)}${ui.esc(n)}</a>`).join('')}</div>
        </div>`;
    },
    mount(el) {
      el.querySelector('[data-play]').addEventListener('click', async () => {
        const a = await getAudio();
        if (!a) return;
        if (a.paused) a.play().catch(() => {});
        else a.pause();
      });
      el.querySelector('[data-seek]').addEventListener('input', (e) => {
        if (audio) audio.currentTime = +e.target.value;
      });
      syncUI();
    },
  };
})();
