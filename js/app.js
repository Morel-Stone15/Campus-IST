/* ==========================================================
   Routeur et structure de l'application + Notifications PWA
   ========================================================== */
(function () {
  const { ui, auth, db, config: cfg, date: D } = IST;
  const icon = IST.icon;
  const app = document.getElementById('app');

  // ── Système de notifications PWA / Web APK (Mobile) ──────────────────────
  IST.pwaNotification = {
    isSupported() {
      return ('Notification' in window) && ('serviceWorker' in navigator);
    },
    permission() {
      return ('Notification' in window) ? Notification.permission : 'denied';
    },
    async requestPermission() {
      if (!('Notification' in window)) {
        ui.toast("Les notifications ne sont pas supportées par ce navigateur.", 'info');
        return 'denied';
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          ui.toast('🔔 Notifications autorisées sur votre téléphone !', 'success');
          setTimeout(() => {
            IST.pwaNotification.send(
              'Campus+ IST',
              'Notifications mobiles activées. Vous serez alerté des nouveaux cours et annonces en temps réel.',
              'home'
            );
          }, 500);
        } else {
          ui.toast('Notifications non autorisées.', 'info');
        }
        return perm;
      } catch (err) {
        return 'denied';
      }
    },
    async send(title, body, link = 'notifications') {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        if ('vibrate' in navigator) navigator.vibrate([150, 75, 150]);
        const targetUrl = link ? (link.startsWith('#') ? link : `#/${link}`) : '#/notifications';
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            reg.showNotification(title, {
              body,
              icon: 'assets/icon.svg',
              badge: 'assets/icon.svg',
              vibrate: [200, 100, 200, 100, 200],
              tag: 'campus-ist-' + Date.now(),
              data: { url: targetUrl },
            });
            return;
          }
        }
        new Notification(title, { body, icon: 'assets/icon.svg' });
      } catch (e) {
        console.warn('Native notification error:', e);
      }
    }
  };

  const teaches = (u) => Boolean(u && (u.role === 'enseignant' || u.role === 'chef' || (u.classes || []).length > 0));

  const NAV = [
    { id: 'admin', label: 'Administration', icon: 'shield', show: (u) => u.role === 'admin' },
    { id: 'home', label: 'Accueil', icon: 'home', show: (u) => u.role !== 'admin' },
    { id: 'classe', label: 'Ma classe', icon: 'users', show: (u) => u.role === 'etudiant' },
    { id: 'classes', label: 'Mes classes & Cours', icon: 'users', show: (u) => teaches(u) },
    { id: 'filiere', label: 'Espace chef de filière', icon: 'layers', show: (u) => u.role === 'chef' },
    { id: 'academique', label: 'Vie académique & Planning', icon: 'book', show: (u) => ['etudiant', 'enseignant', 'chef', 'admin'].includes(u.role) },
    { id: 'documents', label: 'Documents & Cours', icon: 'file' },
    { id: 'agenda', label: 'Agenda étudiant', icon: 'calendar', show: (u) => u.role === 'etudiant' },
    { id: 'actualites', label: 'Actualités & Annonces', icon: 'newspaper' },
    { id: 'annuaire', label: 'Personnel & Contacts', icon: 'briefcase', show: (u) => u.role !== 'etudiant' },
    { id: 'services', label: 'Services du campus', icon: 'pin', show: (u) => ['etudiant', 'personnel', 'communication', 'admin'].includes(u.role) },
    { id: 'plan', label: "Plan de l'université", icon: 'map' },
    { id: 'identite', label: "Identité de l'IST", icon: 'music', show: (u) => ['etudiant', 'communication', 'admin'].includes(u.role) },
  ];
  const NAV_ACCOUNT = [
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'profil', label: 'Mon profil', icon: 'user' },
  ];

  function bottomItems(u) {
    if (u.role === 'admin') {
      return [
        { id: 'admin', label: 'Admin', icon: 'shield' },
        { id: 'actualites', label: 'Actualités', icon: 'newspaper' },
        { id: 'documents', label: 'Documents', icon: 'file' },
        { id: 'annuaire', label: 'Personnel', icon: 'briefcase' },
        { id: 'profil', label: 'Profil', icon: 'user' },
      ];
    }
    if (u.role === 'communication') {
      return [
        { id: 'actualites', label: 'Actualités', icon: 'newspaper' },
        { id: 'documents', label: 'Documents', icon: 'file' },
        { id: 'services', label: 'Services', icon: 'pin' },
        { id: 'annuaire', label: 'Personnel', icon: 'briefcase' },
        { id: 'profil', label: 'Profil', icon: 'user' },
      ];
    }
    if (u.role === 'enseignant') {
      return [
        { id: 'home', label: 'Accueil', icon: 'home' },
        { id: 'classes', label: 'Classes', icon: 'users' },
        { id: 'documents', label: 'Cours', icon: 'file' },
        { id: 'academique', label: 'Planning', icon: 'book' },
        { id: 'profil', label: 'Profil', icon: 'user' },
      ];
    }
    if (u.role === 'chef') {
      return [
        { id: 'home', label: 'Accueil', icon: 'home' },
        { id: 'filiere', label: 'Filière', icon: 'layers' },
        { id: 'classes', label: 'Classes', icon: 'users' },
        { id: 'academique', label: 'Planning', icon: 'book' },
        { id: 'profil', label: 'Profil', icon: 'user' },
      ];
    }
    if (u.role === 'personnel') {
      return [
        { id: 'home', label: 'Accueil', icon: 'home' },
        { id: 'services', label: 'Services', icon: 'pin' },
        { id: 'annuaire', label: 'Personnel', icon: 'briefcase' },
        { id: 'documents', label: 'Documents', icon: 'file' },
        { id: 'profil', label: 'Profil', icon: 'user' },
      ];
    }
    // Rôle étudiant par défaut
    return [
      { id: 'home', label: 'Accueil', icon: 'home' },
      { id: 'classe', label: 'Ma classe', icon: 'users' },
      { id: 'documents', label: 'Cours', icon: 'file' },
      { id: 'academique', label: 'Planning', icon: 'book' },
      { id: 'profil', label: 'Profil', icon: 'user' },
    ];
  }

  const go = (name) => { location.hash = '#/' + name; };
  function parse() {
    const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/');
    return { name: decodeURIComponent(name), params: params.map(decodeURIComponent) };
  }

  /* ---------- Structure ---------- */
  function navLink(n, current, unread) {
    const active = n.id === current;
    const badge = n.id === 'notifications' && unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : '';
    return `<a href="#/${n.id}" class="nav-link ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${n.label}</span>${badge}</a>`;
  }

  function shellHTML(page, name, user) {
    const unread = db.unread(user);
    const isHome = name === 'home';
    const sub = isHome ? D.long(new Date()) : (typeof page.subtitle === 'function' ? page.subtitle(user) : page.subtitle) || cfg.schoolName;
    const title = typeof page.title === 'function' ? page.title(user) : page.title;

    // Bandeau d'autorisation des notifications sur smartphone / Web APK
    const showNotifPrompt = IST.pwaNotification.isSupported() &&
      IST.pwaNotification.permission() === 'default' &&
      !sessionStorage.getItem('istc_notif_dismissed');

    const notifPromptHTML = showNotifPrompt
      ? `<div id="pwa-notif-banner" style="background:linear-gradient(135deg, #0A4EA3, #0284c7);color:#fff;padding:12px 16px;margin:12px 16px;border-radius:14px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 16px rgba(10,78,163,0.25);">
          <span style="font-size:24px;display:flex;align-items:center;">🔔</span>
          <div style="flex:1;min-width:0;">
            <strong style="font-size:14px;display:block;">Activer les alertes sur votre téléphone</strong>
            <small style="opacity:0.92;font-size:12px;line-height:1.25;display:block;">Recevez les notifications d'emploi du temps, cours et urgences en temps réel.</small>
          </div>
          <button class="btn btn-sm" id="btn-allow-pwa-notif" style="background:#fff;color:#0A4EA3;font-weight:700;white-space:nowrap;padding:8px 14px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">Autoriser</button>
          <button class="icon-btn" id="btn-dismiss-pwa-notif" style="color:#fff;opacity:0.8;padding:4px;" aria-label="Fermer">${icon('x')}</button>
        </div>`
      : '';

    return `
      <aside class="sidebar" id="sidebar" aria-label="Menu principal">
        <div class="brand">${ui.logoMark(42)}<div><strong>Campus+</strong><small>${cfg.schoolShort} · ${cfg.motto}</small></div>
          <button class="icon-btn drawer-close" data-drawer="close" aria-label="Fermer le menu">${icon('x')}</button></div>
        <nav class="nav">
          ${NAV.filter((n) => !n.show || n.show(user)).map((n) => navLink(n, name)).join('')}
          <p class="nav-label">Mon compte</p>
          ${NAV_ACCOUNT.map((n) => navLink(n, name, unread)).join('')}
        </nav>
        <div class="side-user">
          ${ui.avatar(user, 40)}
          <div class="grow"><strong>${ui.esc(user.prenom + ' ' + user.nom)}</strong><small>${ui.esc(user.role === 'etudiant' ? user.filiere : ui.roleLabel(user))}</small></div>
          <button class="icon-btn" data-logout aria-label="Se déconnecter" title="Se déconnecter">${icon('logout')}</button>
        </div>
      </aside>
      <div class="drawer-backdrop" data-drawer="close"></div>
      <div class="main">
        <header class="topbar ${isHome ? 'is-home' : ''}">
          ${isHome
            ? `<button class="icon-btn mobile-only" data-drawer="open" aria-label="Ouvrir le menu">${icon('menu')}</button>`
            : `<button class="icon-btn mobile-only" data-back aria-label="Retour">${icon('arrowLeft')}</button>`}
          <div class="topbar-title">
            <h1><span class="only-desk">${ui.esc(title)}</span><span class="only-mob">${ui.esc(isHome ? 'Campus+' : title)}</span></h1>
            <p class="topbar-sub">${ui.esc(sub)}</p>
          </div>
          <div class="topbar-actions">
            <a href="#/notifications" class="icon-btn" aria-label="Notifications${unread ? ` (${unread} non lues)` : ''}">${icon('bell')}${unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : ''}</a>
            <a href="#/profil" class="avatar-link desktop-only" aria-label="Mon profil">${ui.avatar(user, 38)}</a>
          </div>
        </header>
        ${notifPromptHTML}
        <main class="content" id="content" tabindex="-1"></main>
      </div>
      <nav class="bottomnav" aria-label="Navigation rapide">
        ${bottomItems(user).map((n) => `<a href="#/${n.id}" class="${n.id === name ? 'active' : ''}" ${n.id === name ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${n.label}</span></a>`).join('')}
      </nav>`;
  }

  /* ---------- Rendu ---------- */
  function render() {
    document.body.classList.remove('drawer-open');
    const { name, params } = parse();
    const user = auth.current();

    const landing = {
      admin:         'admin',
      communication: 'actualites',
      enseignant:    'classes',
      chef:          'filiere',
      personnel:     'services',
      etudiant:      'classe',
    }[user ? user.role : ''] || 'home';

    if (!name) {
      if (!user) return go('welcome');
      return go(landing);
    }

    const pub = IST.authPages[name];
    if (pub) {
      if (user) return go(landing);
      if (pub.guard && !pub.guard()) return go(pub.fallback);
      app.innerHTML = pub.render();
      pub.mount && pub.mount(app);
      document.title = 'Campus+ · IST';
      window.scrollTo(0, 0);
      return;
    }

    if (!user) return go('welcome');
    const page = IST.pages[name];
    const navItem = NAV.find((n) => n.id === name);
    const isAllowed = Boolean(page && (!page.admin || user.role === 'admin') && (!page.can || page.can(user)) && (!navItem || !navItem.show || navItem.show(user)));
    if (!isAllowed) return go(landing);

    app.innerHTML = shellHTML(page, name, user);
    const content = document.getElementById('content');
    content.innerHTML = page.render({ user, params });
    page.mount && page.mount(content, {
      user, params,
      refresh() { render(); },
      refreshShell() {
        // Recalcule la coquille (barre latérale, bottomnav) sans rechanger la page
        const u2 = auth.current();
        if (!u2) return;
        app.innerHTML = shellHTML(page, name, u2);
        const c2 = document.getElementById('content');
        c2.innerHTML = page.render({ user: u2, params });
        page.mount && page.mount(c2, { user: u2, params, refresh() { render(); }, refreshShell() { render(); } });
      },
    });
    document.title = `${typeof page.title === 'function' ? page.title(user) : page.title} · Campus+`;
    window.scrollTo(0, 0);
  }

  /* ---------- Événements globaux ---------- */
  document.addEventListener('click', async (e) => {
    // Boutons de la bannière d'autorisation des notifications
    if (e.target.closest('#btn-allow-pwa-notif')) {
      const banner = document.getElementById('pwa-notif-banner');
      if (banner) banner.remove();
      await IST.pwaNotification.requestPermission();
      return;
    }
    if (e.target.closest('#btn-dismiss-pwa-notif')) {
      sessionStorage.setItem('istc_notif_dismissed', '1');
      const banner = document.getElementById('pwa-notif-banner');
      if (banner) banner.remove();
      return;
    }

    const t = e.target.closest('[data-drawer], [data-back], [data-logout], [data-pw-toggle]');
    if (!t) return;
    if (t.dataset.drawer) {
      document.body.classList.toggle('drawer-open', t.dataset.drawer === 'open');
    } else if (t.hasAttribute('data-back')) {
      history.length > 1 ? history.back() : go('home');
    } else if (t.hasAttribute('data-logout')) {
      if (await ui.confirm('Veux-tu vraiment te déconnecter ?', { ok: 'Se déconnecter', danger: true })) {
        auth.logout();
        ui.toast('Tu es déconnecté. À bientôt !', 'info');
        go('welcome');
      }
    } else if (t.hasAttribute('data-pw-toggle')) {
      const input = t.parentElement.querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      t.innerHTML = icon(show ? 'eyeOff' : 'eye');
      t.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.body.classList.remove('drawer-open');
  });

  window.addEventListener('hashchange', async () => {
    const user = auth.current();
    if (user && IST.api && IST.api.getToken()) {
      const synced = await db.syncRemote(user);
      if (!synced.ok) ui.toast(synced.error, 'error');
    }
    render();
  });

  /* ---------- Démarrage ---------- */
  (async function boot() {
    db.init();
    await auth.ensureAdmin();
    const user = auth.current();
    if (user && IST.api && IST.api.getToken()) {
      const synced = await db.syncRemote(user);
      if (!synced.ok) ui.toast(synced.error, 'error');
    }
    IST.theme.apply(IST.theme.get());
    render();

    /* ---------- Gestionnaire de mises à jour PWA ---------- */
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      let newWorker = null;

      // Bannière de changelog affichée à l'utilisateur
      function showUpdateBanner(changelog) {
        const old = document.getElementById('pwa-update-banner');
        if (old) old.remove();
        const items = (changelog || []).map((l) => `<li style="margin:4px 0;font-size:13px;opacity:.95;">${l}</li>`).join('');
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.style.cssText = [
          'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);',
          'z-index:9999;width:min(92vw,460px);',
          'background:linear-gradient(135deg,#0A4EA3,#0284c7);',
          'color:#fff;border-radius:18px;padding:18px 20px;',
          'box-shadow:0 8px 32px rgba(10,78,163,.4);',
          'animation:swSlideUp .35s cubic-bezier(.22,1,.36,1) both;',
        ].join('');
        banner.innerHTML = `
          <style>@keyframes swSlideUp{from{opacity:0;transform:translate(-50%,30px)}to{opacity:1;transform:translate(-50%,0)}}</style>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="font-size:26px;">🚀</span>
            <div style="flex:1;">
              <strong style="font-size:15px;display:block;">Nouvelle version disponible !</strong>
              <small style="opacity:.85;font-size:12px;">Campus+ IST a été amélioré</small>
            </div>
            <button id="pwa-update-dismiss" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;">Plus tard</button>
          </div>
          ${items ? `<ul style="margin:0 0 14px 16px;padding:0;">${items}</ul>` : ''}
          <button id="pwa-update-now" style="width:100%;background:#fff;color:#0A4EA3;border:none;border-radius:12px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);">
            ✅ Mettre à jour maintenant
          </button>`;
        document.body.appendChild(banner);
        document.getElementById('pwa-update-now').onclick = () => {
          banner.remove();
          if (newWorker) newWorker.postMessage({ type: 'SKIP_WAITING' });
          else location.reload();
        };
        document.getElementById('pwa-update-dismiss').onclick = () => banner.remove();
      }

      // Le SW envoie APP_UPDATED après activation → afficher le changelog
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'APP_UPDATED') {
          showUpdateBanner(e.data.changelog);
        }
      });

      // Recharger proprement quand le nouveau SW prend le contrôle
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) { reloading = true; location.reload(); }
      });

      // Enregistrement + surveillance des mises à jour
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          // SW déjà en attente (app installée, update déjà téléchargé)
          if (reg.waiting) {
            newWorker = reg.waiting;
            showUpdateBanner(null);
          }
          // Nouveau SW en cours de téléchargement
          reg.addEventListener('updatefound', () => {
            newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner(null);
              }
            });
          });
          // Vérification silencieuse toutes les heures
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
          // Vérification à chaque retour sur l'onglet
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') reg.update().catch(() => {});
          });
        })
        .catch(() => {});
    }
  })();
})();

