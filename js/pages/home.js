/* Page d'accueil / tableau de bord */
(function () {
  const { ui, db, date: D } = IST;
  const icon = IST.icon;

  const QUICK = [
    ['academique', 'Vie académique', 'book', 'blue'],
    ['annuaire', 'Personnel de l’IST', 'briefcase', 'purple'],
    ['documents', 'Documents officiels', 'file', 'green'],
    ['identite', "Identité de l'IST", 'music', 'purple'],
    ['agenda', 'Agenda étudiant', 'calendar', 'blue'],
    ['services', 'Services du campus', 'pin', 'green'],
    ['plan', "Plans de l'université", 'map', 'teal'],
    ['actualites', 'Actualités', 'newspaper', 'orange'],
    ['notifications', 'Notifications', 'bell', 'red'],
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

  /* ---------- Tableau de bord du personnel ---------- */
  function staffHome(user) {
    const h = new Date().getHours();
    const hello = h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour';
    const classes = (user.classes || []).map(IST.school.classInfo).filter(Boolean);
    const chef = user.role === 'chef' && IST.school.find(user.chefFiliere);
    const tiles = [
      classes.length && ['classes', 'Mes classes', 'users', 'blue'],
      classes.length && ['academique', 'Mon emploi du temps', 'calendar', 'green'],
      chef && ['filiere', 'Espace chef de filière', 'layers', 'purple'],
      user.role === 'admin' && ['admin', 'Administration', 'shield', 'red'],
      ['annuaire', 'Personnel de l’IST', 'briefcase', 'purple'],
      ['actualites', 'Actualités', 'newspaper', 'orange'],
      ['documents', 'Documents officiels', 'file', 'teal'],
      ['plan', "Plan de l'université", 'map', 'teal'],
      ['notifications', 'Notifications', 'bell', 'red'],
    ].filter(Boolean);
    const news = db.announcements(user).slice(0, 3);
    return `
      <div class="home-grid">
        <div>
          <div class="greet">
            ${ui.avatar(user, 56)}
            <div><h2>${hello}, ${ui.esc(ui.displayName(user))}</h2>
              <p>${ui.esc(ui.roleLabel(user))}${chef ? ' · ' + ui.esc(chef.name) : user.fonction ? ' · ' + ui.esc(user.fonction) : ''}</p></div>
          </div>
          <div class="hero-banner">
            ${ui.campusArt()}
            <span class="hb-date">${icon('calendar')}${D.long(new Date())}</span>
            <h2>Espace du personnel</h2>
            <p>${classes.length ? `${classes.length} classe${classes.length > 1 ? 's' : ''} · ${classes.reduce((n, c) => n + db.studentsOf(c.id).length, 0)} étudiants inscrits` : ui.esc(IST.config.schoolName)}</p>
          </div>
          ${classes.length ? `<section class="section">
            <div class="section-head"><h2>Ton prochain cours</h2><a class="link" href="#/academique">Emploi du temps${icon('chevronRight')}</a></div>
            ${nextCourseCard(db.nextCourse(user))}
          </section>` : ''}
          <section class="section">
            <div class="section-head"><h2>Accès rapide</h2></div>
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
              ${QUICK.map(([id, label, ic, tone]) => `<a class="tile" href="#/${id}"><span class="ic-box tone-${tone}">${icon(ic)}</span><span>${label}</span></a>`).join('')}
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
