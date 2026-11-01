/* ==========================================================
   Routeur et structure de l'application
   ========================================================== */
(function () {
  const { ui, auth, db, config: cfg, date: D } = IST;
  const icon = IST.icon;
  const app = document.getElementById('app');

  const teaches = (u) => (u.classes || []).length > 0;
  const NAV = [
    { id: 'home', label: 'Accueil', icon: 'home' },
    { id: 'classe', label: 'Ma classe', icon: 'users', show: (u) => u.role === 'etudiant' },
    { id: 'classes', label: 'Mes classes', icon: 'users', show: teaches },
    { id: 'filiere', label: 'Espace chef de filière', icon: 'layers', show: (u) => u.role === 'chef' },
    { id: 'academique', label: 'Vie académique', icon: 'book' },
    { id: 'annuaire', label: 'Personnel de l’IST', icon: 'briefcase' },
    { id: 'agenda', label: 'Agenda étudiant', icon: 'calendar' },
    { id: 'actualites', label: 'Actualités', icon: 'newspaper' },
    { id: 'documents', label: 'Documents officiels', icon: 'file' },
    { id: 'services', label: 'Services du campus', icon: 'pin' },
    { id: 'plan', label: "Plan de l'université", icon: 'map' },
    { id: 'identite', label: "Identité de l'IST", icon: 'music' },
  ];
  const NAV_ACCOUNT = [
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'profil', label: 'Mon profil', icon: 'user' },
  ];
  function bottomItems(u) {
    const second = u.role === 'etudiant'
      ? { id: 'classe', label: 'Ma classe', icon: 'users' }
      : teaches(u) ? { id: 'classes', label: 'Classes', icon: 'users' } : { id: 'admin', label: 'Admin', icon: 'shield' };
    return [
      { id: 'home', label: 'Accueil', icon: 'home' },
      second,
      { id: 'academique', label: 'Cours', icon: 'book' },
      { id: 'actualites', label: 'Actualités', icon: 'newspaper' },
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
    const admin = user.role === 'admin' ? [{ id: 'admin', label: 'Administration', icon: 'shield' }] : [];
    const sub = isHome ? D.long(new Date()) : (typeof page.subtitle === 'function' ? page.subtitle(user) : page.subtitle) || cfg.schoolName;
    const title = typeof page.title === 'function' ? page.title(user) : page.title;
    return `
      <aside class="sidebar" id="sidebar" aria-label="Menu principal">
        <div class="brand">${ui.logoMark(42)}<div><strong>Campus+</strong><small>${cfg.schoolShort} · ${cfg.motto}</small></div>
          <button class="icon-btn drawer-close" data-drawer="close" aria-label="Fermer le menu">${icon('x')}</button></div>
        <nav class="nav">
          ${NAV.filter((n) => !n.show || n.show(user)).map((n) => navLink(n, name)).join('')}
          <p class="nav-label">Mon compte</p>
          ${[...NAV_ACCOUNT, ...admin].map((n) => navLink(n, name, unread)).join('')}
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

    if (!name) return go(user ? 'home' : 'welcome');

    const pub = IST.authPages[name];
    if (pub) {
      if (user) return go('home');
      if (pub.guard && !pub.guard()) return go(pub.fallback);
      app.innerHTML = pub.render();
      pub.mount && pub.mount(app);
      document.title = 'Campus+ · IST';
      window.scrollTo(0, 0);
      return;
    }

    if (!user) return go('welcome');
    const page = IST.pages[name];
    if (!page || (page.admin && user.role !== 'admin') || (page.can && !page.can(user))) return go('home');

    app.innerHTML = shellHTML(page, name, user);
    document.title = `${typeof page.title === 'function' ? page.title(user) : page.title} · Campus+`;
    let content = document.getElementById('content');
    const ctx = {
      user, params,
      refresh() {
        ctx.user = auth.current();
        // Nouvel élément à chaque rendu : les anciens écouteurs disparaissent avec l'ancien.
        const fresh = content.cloneNode(false);
        content.replaceWith(fresh);
        content = fresh;
        content.innerHTML = page.render(ctx);
        page.mount && page.mount(content, ctx);
      },
      refreshShell: render,
    };
    ctx.refresh();
    window.scrollTo(0, 0);
  }

  /* ---------- Actions globales ---------- */
  document.addEventListener('click', async (e) => {
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
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  })();
})();
