/* Profil et paramètres */
(function () {
  const { ui, auth, config: cfg, date: D } = IST;
  const icon = IST.icon;

  const NOTIF_PREFS = [
    ['cours', 'Changements de cours', 'Salle, horaire ou annulation'],
    ['annonce', 'Annonces', "Nouvelles publications de l'administration"],
    ['evenement', 'Événements', 'Nouveaux événements sur le campus'],
  ];

  /** Redimensionne une photo en 256 px pour l'enregistrer. */
  function readAvatar(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function editInfo(ctx) {
    const u = ctx.user;
    const isAdmin = IST.db.isStaff(u);
    const s = ui.sheet({
      title: 'Informations personnelles',
      body: `<form class="stack-lg" id="info-form" novalidate>
        <div class="form-row">
          ${ui.field({ name: 'prenom', label: 'Prénom', value: u.prenom, autocomplete: 'given-name' })}
          ${ui.field({ name: 'nom', label: 'Nom', value: u.nom, autocomplete: 'family-name' })}
        </div>
        ${ui.field({ name: 'email', label: 'Adresse email', type: 'email', icon: 'mail', value: u.email, readonly: true, hint: "L'adresse email sert d'identifiant et ne peut pas être modifiée." })}
        ${ui.field({ name: 'phone', label: 'Téléphone', type: 'tel', icon: 'phone', value: u.phone, optional: true, placeholder: '+241 …', autocomplete: 'tel' })}
        ${isAdmin ? '' : `
          ${ui.field({ name: 'filiere', label: 'Filière', type: 'select', options: IST.school.filiereOptions(), value: u.filiere })}
          ${ui.field({ name: 'niveau', label: 'Niveau', type: 'select', options: IST.school.levelOptions(u.filiere), value: u.niveau })}`}
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="info-form">Enregistrer</button>`,
    });
    s.el.querySelector('form').addEventListener('change', (e) => {
      if (e.target.name === 'filiere') ui.fillLevels(s.el.querySelector('select[name=niveau]'), e.target.value, false);
    });
    s.el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const d = ui.formData(f);
      const pErr = d.prenom.trim().length >= 2 ? '' : 'Prénom trop court.';
      const nErr = d.nom.trim().length >= 2 ? '' : 'Nom trop court.';
      ui.setErr(f, 'prenom', pErr);
      ui.setErr(f, 'nom', nErr);
      if (pErr || nErr) return;
      const patch = { prenom: d.prenom.trim(), nom: d.nom.trim(), phone: (d.phone || '').trim() };
      if (!isAdmin) Object.assign(patch, { filiere: d.filiere, niveau: d.niveau });
      auth.update(u.id, patch);
      s.close();
      ui.toast('Profil mis à jour.', 'success');
      ctx.refreshShell();
    });
  }

  function changePassword(ctx) {
    const s = ui.sheet({
      title: 'Changer le mot de passe',
      body: `<form class="stack-lg" id="pw-form" novalidate>
        ${ui.field({ name: 'old', label: 'Mot de passe actuel', type: 'password', icon: 'lock', autocomplete: 'current-password' })}
        ${ui.field({ name: 'password', label: 'Nouveau mot de passe', type: 'password', icon: 'lock', autocomplete: 'new-password', hint: '8 caractères minimum, avec au moins une lettre et un chiffre.' })}
        ${ui.field({ name: 'confirm', label: 'Confirmer', type: 'password', icon: 'lock', autocomplete: 'new-password' })}
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="pw-form">Mettre à jour</button>`,
    });
    s.el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const d = ui.formData(f);
      const errs = {
        old: d.old ? '' : 'Entre ton mot de passe actuel.',
        password: auth.passwordError(d.password),
        confirm: d.confirm === d.password ? '' : 'Les mots de passe ne correspondent pas.',
      };
      Object.entries(errs).forEach(([k, v]) => ui.setErr(f, k, v));
      if (Object.values(errs).some(Boolean)) return;
      const btn = s.el.querySelector('[type=submit]');
      ui.busy(btn, true);
      const r = await auth.changePassword(ctx.user, d.old, d.password);
      ui.busy(btn, false);
      if (!r.ok) return ui.setErr(f, r.field, r.error);
      s.close();
      ui.toast('Mot de passe modifié.', 'success');
    });
  }

  function editChef(ctx) {
    const s = ui.sheet({
      title: 'Filière dirigée',
      body: `<form id="chef-form">${ui.field({ name: 'chefFiliere', label: 'Filière dont tu es chef(fe)', type: 'select', options: IST.school.filiereOptions(), value: ctx.user.chefFiliere })}</form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="chef-form">Enregistrer</button>`,
    });
    s.el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      auth.update(ctx.user.id, { chefFiliere: ui.formData(e.target).chefFiliere });
      s.close();
      ui.toast('Filière mise à jour.', 'success');
      ctx.refreshShell();
    });
  }

  function about() {
    ui.sheet({
      title: 'À propos de Campus+',
      body: `<div class="motto-card" style="padding:8px 0">
        ${ui.logoMark(64)}
        <strong>Campus+ · version 1.0</strong>
        <p class="text-2">L'application des étudiants de l'${ui.esc(cfg.schoolName)}.<br>${ui.esc(cfg.motto)}.</p>
        <p class="muted small">Pour toute question ou suggestion, contacte la vie étudiante.</p>
      </div>`,
    });
  }

  IST.pages.profil = {
    title: 'Mon profil',
    subtitle: 'Informations personnelles et paramètres',
    render({ user: u }) {
      const theme = IST.theme.get();
      const notifs = (u.prefs && u.prefs.notifs) || {};
      const isAdmin = IST.db.isStaff(u);
      const chef = u.role === 'chef' && IST.school.find(u.chefFiliere);
      return `<div class="profile-grid">
        <div class="card profile-head">
          <div class="avatar-edit">${ui.avatar(u, 104)}
            <button type="button" data-avatar aria-label="Changer la photo de profil">${icon('camera')}</button>
            <input type="file" accept="image/*" hidden data-avatar-input></div>
          <h2>${ui.esc(u.prenom + ' ' + u.nom)}</h2>
          <span class="tag">${ui.esc(ui.roleLabel(u))}</span>
          <p class="muted small">${ui.esc(u.email)}</p>
          ${isAdmin ? '' : `<p class="small text-2">${ui.esc(u.filiere)}<br><span class="muted">${ui.esc((IST.school.find(u.filiere) || {}).poleName || '')}</span></p>`}
          ${isAdmin ? `<p class="small text-2">${chef ? `Chef de filière · ${ui.esc(chef.name)}` : ui.esc(u.fonction || IST.config.schoolName)}</p>
          <div class="profile-facts">
            <div><small>Classes</small><b>${(u.classes || []).length}</b></div>
            <div><small>Filière</small><b>${chef ? ui.esc(chef.code) : '—'}</b></div>
            <div><small>Membre depuis</small><b>${D.fmt(u.createdAt, { month: 'short', year: 'numeric' })}</b></div>
          </div>` : `<div class="profile-facts">
            <div><small>Niveau</small><b>${ui.esc(isAdmin ? '—' : u.niveau)}</b></div>
            <div><small>Ma salle</small><b>${ui.esc(isAdmin ? '—' : (IST.db.myRoom(u) || { label: 'À venir' }).label)}</b></div>
            <div><small>Membre depuis</small><b>${D.fmt(u.createdAt, { month: 'short', year: 'numeric' })}</b></div>
          </div>`}
        </div>

        <div>
          <p class="list-title">Compte</p>
          <div class="list">
            <button class="list-item" data-act="info"><span class="ic-box sm tone-blue">${icon('user')}</span><div class="grow"><strong>Informations personnelles</strong><small>Nom, téléphone, filière</small></div>${icon('chevronRight')}</button>
            <button class="list-item" data-act="password"><span class="ic-box sm tone-purple">${icon('lock')}</span><div class="grow"><strong>Mot de passe</strong><small>Modifier ton mot de passe</small></div>${icon('chevronRight')}</button>
            ${isAdmin && u.role !== 'admin' ? `<button class="list-item" data-act="classes"><span class="ic-box sm tone-teal">${icon('users')}</span><div class="grow"><strong>Mes classes</strong><small>${ui.esc((u.classes || []).join(', ') || 'Aucune')}</small></div>${icon('chevronRight')}</button>` : ''}
            ${chef ? `<button class="list-item" data-act="chef"><span class="ic-box sm tone-purple">${icon('layers')}</span><div class="grow"><strong>Filière dirigée</strong><small>${ui.esc(chef.name)}</small></div>${icon('chevronRight')}</button>` : ''}
            <a class="list-item" href="#/agenda"><span class="ic-box sm tone-green">${icon('calendar')}</span><div class="grow"><strong>Mon agenda</strong><small>Événements suivis et rappels</small></div>${icon('chevronRight')}</a>
            <a class="list-item" href="#/documents"><span class="ic-box sm tone-orange">${icon('file')}</span><div class="grow"><strong>Documents</strong><small>Règlement, guides, procédures</small></div>${icon('chevronRight')}</a>
          </div>

          <p class="list-title">Apparence</p>
          <div class="card">
            <div class="row-between"><div><strong style="font-size:14.5px">Thème</strong><p class="muted small">Clair, sombre ou selon ton appareil</p></div>
              ${ui.seg([['light', `${icon('sun')} Clair`], ['dark', `${icon('moon')} Sombre`], ['system', `${icon('monitor')} Auto`]], theme, 'theme', 'sm')}</div>
          </div>

          <p class="list-title">Notifications</p>
          <div class="list">${NOTIF_PREFS.map(([k, l, d]) => `
            <label class="list-item" style="cursor:pointer"><div class="grow"><strong>${l}</strong><small>${d}</small></div>
              <span class="switch"><input type="checkbox" data-notif="${k}" ${notifs[k] !== false ? 'checked' : ''}><span></span></span></label>`).join('')}</div>

          <p class="list-title">Application</p>
          <div class="list">
            <div class="list-item"><span class="ic-box sm tone-teal">${icon('globe')}</span><div class="grow"><strong>Langue</strong><small>Français</small></div></div>
            <button class="list-item" data-act="about"><span class="ic-box sm tone-blue">${icon('info')}</span><div class="grow"><strong>À propos</strong><small>Version 1.0</small></div>${icon('chevronRight')}</button>
          </div>

          <button class="btn btn-danger-outline btn-block mt-lg" data-logout>${icon('logout')}Se déconnecter</button>
        </div>
      </div>`;
    },
    mount(el, ctx) {
      const fileInput = el.querySelector('[data-avatar-input]');
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        try {
          const dataUrl = await readAvatar(file);
          if (auth.update(ctx.user.id, { avatar: dataUrl })) {
            ui.toast('Photo de profil mise à jour.', 'success');
            ctx.refreshShell();
          }
        } catch (e) {
          ui.toast("Impossible de lire cette image.", 'error');
        }
      });
      el.addEventListener('change', (e) => {
        const k = e.target.dataset.notif;
        if (!k) return;
        const prefs = { ...(ctx.user.prefs || {}), notifs: { ...((ctx.user.prefs || {}).notifs || {}), [k]: e.target.checked } };
        auth.update(ctx.user.id, { prefs });
        ctx.user = auth.current();
        ui.toast('Préférences enregistrées.', 'success');
      });
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act], [data-theme], [data-avatar]');
        if (!t) return;
        if (t.hasAttribute('data-avatar')) fileInput.click();
        else if (t.dataset.theme) { IST.theme.set(t.dataset.theme); ctx.refresh(); }
        else if (t.dataset.act === 'info') editInfo(ctx);
        else if (t.dataset.act === 'password') changePassword(ctx);
        else if (t.dataset.act === 'about') about();
        else if (t.dataset.act === 'classes') IST.ui.editClasses(ctx);
        else if (t.dataset.act === 'chef') editChef(ctx);
      });
    },
  };
})();
