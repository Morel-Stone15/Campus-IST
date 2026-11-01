/* Identité de l'IST : hymne, histoire, valeurs, annuaire */
(function () {
  const { ui, config: cfg } = IST;
  const icon = IST.icon;
  let audio = null; // conservé entre les pages : l'hymne continue pendant la navigation

  const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  function isAdmin() {
    const u = IST.auth ? IST.auth.user() : null;
    return !!(u && (u.role === 'admin' || (u.staffCode && u.staffCode.startsWith('IST-SYS'))));
  }

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

  /* ---------- Modal de modification de l'identité de l'IST ---------- */
  function openEditIdentityModal(refreshCtx) {
    const id = IST.db.identity();
    const phone = id.phone || cfg.phone;
    const fax = id.fax || cfg.fax;
    const address = id.address || cfg.address;
    const postalBox = id.postalBox || cfg.postalBox;
    const motto = id.motto || "Plus qu'une école, une famille !";
    const dirText = (id.directory || []).map(([n, r]) => `${n} : ${r}`).join('\n');
    const valText = (id.values || []).map((v) => v[0]).join(', ');

    const modal = ui.sheet({
      title: "Modifier l'identité de l'IST",
      body: `
        <form id="edit-identity-form" class="admin-form stack-lg" novalidate>
          <div class="info-box tone-purple">${icon('shield')}<div><b>Espace Admin Système</b>Vous pouvez modifier les coordonnées officielles, la devise, l'histoire et l'annuaire de l'école. Tous les étudiants et visiteurs verront les changements immédiatement.</div></div>
          
          <h4 class="h-sub">${icon('phone')} Coordonnées officielles</h4>
          <div class="form-row">
            ${ui.field({ name: 'phone', label: 'Téléphone standard', value: phone, placeholder: '+241 01 76 34 50', required: true })}
            ${ui.field({ name: 'fax', label: 'Télécopie / Fax', value: fax, placeholder: '+241 01 76 34 51', optional: true })}
          </div>
          <div class="form-row">
            ${ui.field({ name: 'address', label: 'Adresse physique', value: address, placeholder: "Complexe Universitaire d'Oloumi, Libreville", required: true })}
            ${ui.field({ name: 'postalBox', label: 'Boîte postale', value: postalBox, placeholder: 'BP 1017 Libreville', required: true })}
          </div>
          ${ui.field({ name: 'motto', label: 'Devise / Slogan officiel', value: motto, placeholder: "Plus qu'une école, une famille !", required: true })}

          <h4 class="h-sub" style="margin-top:16px;">${icon('building')} Annuaire des services du campus</h4>
          ${ui.field({ name: 'directory', label: 'Services internes & rôles', type: 'textarea', rows: 5, value: dirText, hint: 'Une ligne par service au format : Nom du service : Rôle ou téléphone' })}

          <h4 class="h-sub" style="margin-top:16px;">${icon('book')} Histoire & Valeurs</h4>
          ${ui.field({ name: 'history', label: 'Notre histoire / Présentation', type: 'textarea', rows: 6, value: id.history || '', required: true })}
          ${ui.field({ name: 'values', label: 'Nos valeurs (séparées par des virgules)', value: valText, hint: 'Exemple : Excellence, Rigueur, Innovation, Solidarité, Intégrité' })}
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" data-close>Annuler</button>
        <button class="btn btn-primary" type="submit" form="edit-identity-form">${icon('check')}Enregistrer l'identité</button>
      `,
      size: 'wide',
    });

    const f = modal.el.querySelector('#edit-identity-form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const d = Object.fromEntries(fd.entries());

      const dirLines = (d.directory || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const parsedDir = dirLines.map((l) => {
        const parts = l.split(':');
        return [parts[0].trim(), parts.slice(1).join(':').trim()];
      }).filter(([n]) => Boolean(n));

      const palette = [['award', 'blue'], ['target', 'purple'], ['lightbulb', 'orange'], ['handshake', 'green'], ['shield', 'teal'], ['star', 'pink']];
      const parsedValues = (d.values || '').split(',').map((v) => v.trim()).filter(Boolean).slice(0, 6).map((v, i) => [v, ...palette[i % palette.length]]);

      const current = IST.db.identity();
      const updated = {
        ...current,
        phone: (d.phone || '').trim(),
        fax: (d.fax || '').trim(),
        address: (d.address || '').trim(),
        postalBox: (d.postalBox || '').trim(),
        motto: (d.motto || '').trim(),
        history: (d.history || '').trim(),
        ...(parsedDir.length ? { directory: parsedDir } : {}),
        ...(parsedValues.length ? { values: parsedValues } : {}),
      };

      if (IST.db && IST.db.setSetting) {
        IST.db.setSetting('identity', updated);
        if (IST.db.flushRemote) await IST.db.flushRemote();
      }

      modal.close();
      ui.toast("Identité de l'IST mise à jour avec succès !", 'success');
      if (refreshCtx && refreshCtx.refresh) refreshCtx.refresh();
      else if (IST.app && IST.app.renderCurrent) IST.app.renderCurrent();
    });
  }

  IST.pages.identite = {
    title: "Identité de l'IST",
    subtitle: 'Hymne, histoire et valeurs de notre école',
    render(ctx) {
      const id = IST.db.identity();
      const playing = audio && !audio.paused;
      const phone = id.phone || cfg.phone;
      const fax = id.fax || cfg.fax;
      const address = id.address || cfg.address;
      const postalBox = id.postalBox || cfg.postalBox;
      const motto = id.motto || "Plus qu'une école, une famille !";
      const directory = id.directory || [];

      const adminHeader = isAdmin()
        ? `
          <div class="card tone-purple row-between mb-lg" style="padding:14px 18px;border-radius:12px;background:var(--surface-variant,#f8fafc);border:1px solid var(--border,#cbd5e1);">
            <div class="row" style="gap:12px;">
              <span class="ic-box sm tone-purple">${icon('shield')}</span>
              <div>
                <strong>Espace Administrateur Système</strong>
                <small class="muted" style="display:block;">Personnalisez les coordonnées, devise, histoire et contacts de l'IST.</small>
              </div>
            </div>
            <div class="row" style="gap:8px;">
              <button class="btn btn-primary btn-sm" data-edit-identity>${icon('edit')}Modifier l'identité</button>
              <a class="btn btn-soft btn-sm" href="#/admin">${icon('settings')}Admin</a>
            </div>
          </div>
        `
        : '';

      return `
        ${adminHeader}
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
          <div class="section-head row-between">
            <h2>Notre histoire</h2>
            ${isAdmin() ? `<button class="btn btn-ghost btn-sm" data-edit-identity>${icon('edit')}Modifier</button>` : ''}
          </div>
          <div class="card"><p class="prose">${ui.esc(id.history)}</p></div>
        </section>

        <section class="section">
          <div class="section-head row-between">
            <h2>Nos valeurs</h2>
            ${isAdmin() ? `<button class="btn btn-ghost btn-sm" data-edit-identity>${icon('edit')}Modifier</button>` : ''}
          </div>
          <div class="value-grid">${(id.values || []).map(([v, ic, tone]) => `<div class="card value tone-${tone}"><span class="ic-box">${icon(ic)}</span>${ui.esc(v)}</div>`).join('')}</div>
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
          <div class="section-head row-between">
            <h2>Nous contacter</h2>
            ${isAdmin() ? `<button class="btn btn-ghost btn-sm" data-edit-identity>${icon('edit')}Modifier contacts</button>` : ''}
          </div>
          <div class="grid-2" style="align-items:start">
            <div class="card detail-rows" style="margin:0">
              <div><span class="ic-box sm">${icon('pin')}</span><div><small>Adresse</small>${ui.esc(address)}<br>${ui.esc(postalBox)}</div></div>
              <div><span class="ic-box sm">${icon('phone')}</span><div><small>Téléphone standard</small><a class="link" href="tel:${phone.replace(/\s/g, '')}">${ui.esc(phone)}</a></div></div>
              ${fax ? `<div><span class="ic-box sm">${icon('file')}</span><div><small>Télécopie</small>${ui.esc(fax)}</div></div>` : ''}
            </div>
            <div class="list">${directory.map(([n, role]) => `
              <a class="list-item" href="tel:${phone.replace(/\s/g, '')}"><span class="ic-box sm tone-teal">${icon('building')}</span>
                <div class="grow"><strong>${ui.esc(n)}</strong><small>${ui.esc(role)}</small></div>${icon('phone')}</a>`).join('')}</div>
          </div>
        </section>

        <div class="card motto-card section">
          <span class="ic-box">${icon('music')}</span>
          <strong>${ui.esc(id.schoolShort || cfg.schoolShort)}</strong>
          <p class="text-2">${ui.esc(motto)}</p>
          <div class="row" style="flex-wrap:wrap;justify-content:center">${(id.socials || []).map(([n, ic, url]) => `<a class="btn btn-soft btn-sm" href="${ui.esc(url)}" target="_blank" rel="noopener">${icon(ic)}${ui.esc(n)}</a>`).join('')}</div>
        </div>`;
    },
    mount(el, ctx) {
      el.querySelector('[data-play]').addEventListener('click', async () => {
        const a = await getAudio();
        if (!a) return;
        if (a.paused) a.play().catch(() => {});
        else a.pause();
      });
      el.querySelector('[data-seek]').addEventListener('input', (e) => {
        if (audio) audio.currentTime = +e.target.value;
      });
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-edit-identity]');
        if (btn) openEditIdentityModal(ctx);
      });
      syncUI();
    },
  };
})();
