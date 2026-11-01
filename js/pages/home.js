/* Page d'accueil / tableau de bord */
(function () {
  const { ui, db, date: D } = IST;
  const icon = IST.icon;

  const STUDENT_QUICK = [
    ['classe', 'Ma classe & Devoirs', 'users', 'blue'],
    ['academique', 'Emploi du temps', 'book', 'green'],
    ['documents', 'Cours & Devoirs', 'file', 'teal'],
    ['agenda', 'Agenda étudiant', 'calendar', 'purple'],
    ['actualites', 'Actualités & Annonces', 'newspaper', 'orange'],
    ['services', 'Services du campus', 'pin', 'green'],
    ['plan', "Plan de l'université", 'map', 'teal'],
    ['identite', "Identité de l'IST", 'music', 'purple'],
  ];

  function nextCourseCard(next) {
    if (!next) return `<div class="card">${ui.empty('calendar', 'Aucun cours prévu', 'Profite de ce temps libre pour avancer sur tes projets.', 'green')}</div>`;
    const c = next.course;
    let when;
    if (next.ongoing) when = `Jusqu'à ${D.hm(c.end)}`;
    else if (next.offset === 0) when = `Dans ${D.duration(next.minutes)}`;
    else if (next.offset === 1) when = 'Demain';
    else when = D.weekday(next.date);
    const tone = ui.TONES.course[c.type] || 'green';
    return `<a href="#/academique" class="next-course tone-${tone}">
      <div class="nc-top">
        <span class="nc-label">${next.ongoing ? '<span class="dot"></span>En cours' : 'Prochain cours'} · ${ui.esc(c.type)}</span>
        <span class="nc-when">${when}</span>
      </div>
      <h3>${ui.esc(c.title)}</h3>
      <div class="nc-meta">
        <span>${icon('clock')}${D.hm(c.start)} – ${D.hm(c.end)}</span>
        <span>${icon('pin')}${ui.esc(c.room)}</span>
        ${c.teacher ? `<span>${icon('user')}${ui.esc(c.teacher)}</span>` : ''}
      </div>
    </a>`;
  }

  function todayList(user) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const list = db.coursesOn(now, user);
    if (!list.length) return `<div class="card">${ui.empty('smile', "Pas de cours aujourd'hui", 'Consulte ton agenda pour voir la suite de la semaine.', 'green')}</div>`;
    return `<div class="stack">${list
      .map((c) => {
        const s = D.toMin(c.start), e = D.toMin(c.end);
        return ui.course(c, { state: nowMin >= e ? 'past' : nowMin >= s ? 'now' : '' });
      })
      .join('')}</div>`;
  }

  /* ---------- Tableau de bord du personnel personnalisé par poste ---------- */
  function staffHome(user) {
    const h = new Date().getHours();
    const hello = h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour';
    const classes = (user.classes || []).map(IST.school.classInfo).filter(Boolean);
    const chef = user.role === 'chef' && IST.school.find(user.chefFiliere);
    const isCom = user.role === 'communication' || (user.email && user.email.includes('communication'));
    const isAdmin = user.role === 'admin';
    const isTeacher = user.role === 'enseignant' || classes.length > 0;

    // Définition de l'espace selon le poste
    let heroTitle = 'Espace du Personnel';
    let heroSub = `${ui.esc(IST.config.schoolName)}`;
    let heroActions = '';

    if (isAdmin) {
      heroTitle = 'Console Administration Système';
      heroSub = 'Inscriptions du personnel, codes d’accès, gestion globale et données du campus';
      heroActions = `<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap;">
        <a href="#/admin" class="btn btn-white btn-sm">${icon('shield')}Console Administration</a>
        <a href="#/documents" class="btn btn-outline-white btn-sm">${icon('file')}Gérer les cours</a>
      </div>`;
    } else if (isCom) {
      heroTitle = 'Plateforme Service Communication';
      heroSub = 'Actualisation des événements officiels et diffusion des annonces du campus';
      heroActions = `<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap;">
        <a href="#/actualites" class="btn btn-white btn-sm">${icon('megaphone')}Publier une annonce</a>
        <a href="#/agenda" class="btn btn-outline-white btn-sm">${icon('calendar')}Gérer les événements</a>
      </div>`;
    } else if (isTeacher) {
      heroTitle = 'Espace Pédagogique & Enseignement';
      heroSub = classes.length
        ? `${classes.length} classe${classes.length > 1 ? 's' : ''} sous votre responsabilité`
        : 'Partagez vos supports de cours et TD avec vos étudiants';
      heroActions = `<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap;">
        <a href="#/documents" class="btn btn-white btn-sm">${icon('upload')}Ajouter un support de cours</a>
        <a href="#/classes" class="btn btn-outline-white btn-sm">${icon('users')}Mes classes</a>
      </div>`;
    } else if (chef) {
      heroTitle = `Espace Chef de Filière · ${chef.code}`;
      heroSub = `Gestion pédagogique : ${chef.name}`;
      heroActions = `<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap;">
        <a href="#/filiere" class="btn btn-white btn-sm">${icon('layers')}Gestion de la filière</a>
        <a href="#/documents" class="btn btn-outline-white btn-sm">${icon('file')}Supports de cours</a>
      </div>`;
    }

    const tiles = [
      isAdmin && ['admin', 'Administration', 'shield', 'red'],
      isAdmin && ['academique', 'Planning global', 'book', 'blue'],
      isCom && ['actualites', 'Gestion Annonces', 'newspaper', 'orange'],
      isCom && ['documents', 'Documents officiels', 'file', 'teal'],
      isCom && ['identite', 'Identité & Hymne', 'music', 'purple'],
      isTeacher && classes.length && ['classes', 'Mes classes', 'users', 'blue'],
      isTeacher && ['documents', 'Déposer un cours', 'file', 'teal'],
      isTeacher && classes.length && ['academique', 'Mon emploi du temps', 'calendar', 'green'],
      chef && ['filiere', 'Espace chef de filière', 'layers', 'purple'],
      chef && classes.length && ['classes', 'Mes classes', 'users', 'blue'],
      user.role === 'personnel' && ['services', 'Services du campus', 'pin', 'green'],
      user.role === 'personnel' && ['annuaire', 'Personnel de l’IST', 'briefcase', 'purple'],
      user.role === 'personnel' && ['documents', 'Documents & Guides', 'file', 'teal'],
      ['annuaire', 'Personnel de l’IST', 'briefcase', 'purple'],
      ['plan', "Plan de l'université", 'map', 'teal'],
      ['notifications', 'Notifications', 'bell', 'red'],
    ].filter(Boolean);

    const news = db.announcements(user).slice(0, 3);

    return `
      <div class="home-grid">
        <div>
          <div class="greet">
            ${ui.avatar(user, 56)}
            <div>
              <h2>${hello}, ${ui.esc(ui.displayName(user))}</h2>
              <p>
                <span class="badge ${isAdmin ? 'tone-red' : isCom ? 'tone-orange' : 'tone-blue'}" style="margin-right:6px;">
                  ${ui.esc(user.fonction || ui.roleLabel(user))}
                </span>
                ${chef ? ' · ' + ui.esc(chef.name) : ''}
                ${user.staffCode ? ` · <code style="font-size:11px;background:var(--surface,#fff);padding:2px 6px;border-radius:6px;border:1px solid var(--border,#cbd5e1);">Code : ${ui.esc(user.staffCode)}</code>` : ''}
              </p>
            </div>
          </div>
          <div class="hero-banner">
            ${ui.campusArt()}
            <span class="hb-date">${icon('calendar')}${D.long(new Date())}</span>
            <h2>${ui.esc(heroTitle)}</h2>
            <p>${ui.esc(heroSub)}</p>
            ${heroActions}
          </div>
          ${classes.length ? `<section class="section">
            <div class="section-head"><h2>Ton prochain cours</h2><a class="link" href="#/academique">Emploi du temps${icon('chevronRight')}</a></div>
            ${nextCourseCard(db.nextCourse(user))}
          </section>` : ''}
          <section class="section">
            <div class="section-head"><h2>Accès rapide à votre espace</h2></div>
            <div class="quick-grid">${tiles.map(([id, label, ic, tone]) => `<a class="tile" href="#/${id}"><span class="ic-box tone-${tone}">${icon(ic)}</span><span>${label}</span></a>`).join('')}</div>
          </section>
          ${classes.length ? `<section class="section">
            <div class="section-head"><h2>Mes classes</h2><a class="link" href="#/classes">Tout voir${icon('chevronRight')}</a></div>
            <div class="grid-2">${classes.slice(0, 4).map((c) => `<a class="card class-card" href="#/classes/${c.id}">
              <div class="row"><span class="ic-box sm tone-${c.pole === 'tech' ? 'blue' : 'orange'}">${icon('users')}</span>
                <div class="grow"><strong>${ui.esc(c.label)}</strong><small class="muted">${ui.esc(c.room || 'Salle à venir')}</small></div>
                <span class="btn btn-soft btn-sm">${icon('send')}Publier</span></div></a>`).join('')}</div>
          </section>` : ''}
        </div>
        <div>
          <section class="section" style="margin-top:0">
            <div class="section-head"><h2>Dernières annonces</h2><a class="link" href="#/actualites">Voir tout${icon('chevronRight')}</a></div>
            <div class="mini-list">${news.map((a) => ui.newsCard(a, { compact: true })).join('') || `<div class="card">${ui.empty('megaphone', 'Aucune annonce')}</div>`}</div>
          </section>
        </div>
      </div>`;
  }


  IST.pages.home = {
    title: 'Accueil',
    render({ user }) {
      if (db.isStaff(user)) return staffHome(user);
      const h = new Date().getHours();
      const hello = h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour';
      const news = db.announcements(user).slice(0, 3);
      const events = db.upcomingEvents().slice(0, 3);
      const isAdmin = user.role === 'admin';
      const room = !isAdmin && db.myRoom(user);
      return `
      <div class="home-grid">
        <div>
          <div class="greet">
            ${ui.avatar(user, 56)}
            <div><h2>${hello}, ${ui.esc(user.prenom)}</h2>
            <p>${isAdmin ? 'Administrateur · Campus+' : `${ui.esc(IST.school.levelLabel(user.niveau))} · ${ui.esc(user.filiere)}`}</p>
            ${room ? `<a class="tag tone-purple" href="#/plan" style="margin-top:4px">${icon('door')}Ma salle : ${ui.esc(room.label)}</a>` : ''}</div>
          </div>
          <div class="hero-banner">
            ${ui.campusArt()}
            <span class="hb-date">${icon('calendar')}${D.long(new Date())}</span>
            <h2>Bienvenue à l'IST</h2>
            <p>${ui.esc(IST.config.motto)}</p>
          </div>

          <section class="section">
            <div class="section-head"><h2>Ton prochain cours</h2><a class="link" href="#/academique">Emploi du temps${icon('chevronRight')}</a></div>
            ${nextCourseCard(db.nextCourse(user))}
          </section>

          <section class="section">
            <div class="section-head"><h2>Accès rapide</h2></div>
            <div class="quick-grid">
              ${STUDENT_QUICK.map(([id, label, ic, tone]) => `<a class="tile" href="#/${id}"><span class="ic-box tone-${tone}">${icon(ic)}</span><span>${label}</span></a>`).join('')}
            </div>
          </section>

          <section class="section">
            <div class="section-head"><h2>Aujourd'hui</h2><span class="muted small">${D.long(new Date())}</span></div>
            ${todayList(user)}
          </section>
        </div>

        <div>
          <section class="section" style="margin-top:0">
            <div class="section-head"><h2>Dernières annonces</h2><a class="link" href="#/actualites">Voir tout${icon('chevronRight')}</a></div>
            <div class="mini-list">${news.length ? news.map((a) => ui.newsCard(a, { compact: true })).join('') : `<div class="card">${ui.empty('megaphone', 'Aucune annonce')}</div>`}</div>
          </section>
          <section class="section">
            <div class="section-head"><h2>Événements à venir</h2><a class="link" href="#/agenda">Agenda${icon('chevronRight')}</a></div>
            <div class="mini-list">${events.length ? events.map((ev) => ui.eventCard(ev, { participating: (user.events || []).includes(ev.id) })).join('') : `<div class="card">${ui.empty('calendar', 'Aucun événement prévu')}</div>`}</div>
          </section>
        </div>
      </div>`;
    },
    mount(el, ctx) {
      el.addEventListener('click', (e) => {
        const n = e.target.closest('[data-news]');
        if (n) return ui.openNews(db.find('announcements', n.dataset.news));
        const ev = e.target.closest('[data-event]');
        if (ev) IST.agenda.openEvent(db.find('events', ev.dataset.event), ctx);
      });
    },
  };
})();
