/* Vie académique : emploi du temps, examens, programmes annuels */
(function () {
  const { ui, db, date: D } = IST;
  const icon = IST.icon;
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const DAY_NAMES = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const st = { tab: 'edt', date: null, view: 'jour' };

  function initialDate() {
    const d = D.startOfDay(new Date());
    return d.getDay() === 0 ? D.addDays(d, 1) : d;
  }

  function courseState(c, date) {
    const now  = new Date();
    const diff = D.diffDays(now, date);
    if (diff !== 0) return diff < 0 ? 'past' : '';
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= D.toMin(c.end) ? 'past' : m >= D.toMin(c.start) ? 'now' : '';
  }

  /* ─── Emploi du temps ───────────────────────────────────────────── */
  function timetable(user) {
    const d      = st.date;
    const ws     = D.startOfWeek(d);
    const todayIso = D.iso(new Date());
    const week   = DAYS.map((label, i) => {
      const day = D.addDays(ws, i);
      const iso = D.iso(day);
      const has = db.coursesOn(day, user).length > 0;
      return `<button type="button" data-day="${iso}" class="${iso === D.iso(d) ? 'active' : ''} ${iso === todayIso ? 'today' : ''}" aria-label="${D.long(day)}">
        <small>${label}</small><b>${day.getDate()}</b><span class="dot ${has ? '' : 'none'}"></span></button>`;
    }).join('');

    let body;
    if (st.view === 'jour') {
      const list = db.coursesOn(d, user);
      body = list.length
        ? `<div class="stack">${list.map((c) => ui.course(c, { state: courseState(c, d) })).join('')}</div>`
        : `<div class="card">${ui.empty('smile', 'Aucun cours ce jour-là', d.getDay() === 6 || d.getDay() === 0 ? 'Bon week-end !' : 'Profite-en pour réviser ou avancer tes projets.', 'green')}</div>`;
    } else {
      body = `<div class="week-grid">${DAYS.slice(0, 5).map((label, i) => {
        const day  = D.addDays(ws, i);
        const list = db.coursesOn(day, user);
        return `<div class="week-col"><h4 class="${D.iso(day) === todayIso ? 'today' : ''}"><span>${D.weekday(day)}</span><span>${day.getDate()}</span></h4>
          <div class="stack">${list.length ? list.map((c) => ui.course(c, { state: courseState(c, day) })).join('') : '<p class="muted small">Pas de cours</p>'}</div></div>`;
      }).join('')}</div>`;
    }

    const exams = db.upcomingExams(user).slice(0, 2);
    const count = db.coursesOn(d, user).length;
    return `
      <div class="card edt-head">
        <div class="date-nav">
          <span class="ic-box sm tone-blue">${icon('calendar')}</span>
          <div class="grow"><strong>${st.view === 'jour' ? D.long(d) : `Semaine du ${D.dayMonth(ws)}`}</strong>
            <small class="muted">${st.view === 'jour' ? `${count} séance${count > 1 ? 's' : ''}` : `au ${D.dayMonth(D.addDays(ws, 5))}`}</small></div>
          <button class="icon-btn outline" data-nav="-1" aria-label="Précédent">${icon('chevronLeft')}</button>
          <button class="btn btn-sm btn-outline" data-nav="0">Aujourd'hui</button>
          <button class="icon-btn outline" data-nav="1" aria-label="Suivant">${icon('chevronRight')}</button>
        </div>
        <div class="week">${week}</div>
      </div>
      <div class="row-between mt">
        <div class="legend"><span class="tone-green">Cours</span><span class="tone-purple">TD</span><span class="tone-orange">TP</span></div>
        ${ui.seg([['jour', 'Jour'], ['semaine', 'Semaine']], st.view, 'view', 'sm')}
      </div>
      <div class="mt">${body}</div>
      ${exams.length ? `<section class="section">
        <div class="section-head"><h2>Prochains examens</h2><button class="link" data-tab="examens">Voir tout${icon('chevronRight')}</button></div>
        <div class="grid-2">${exams.map(examCard).join('')}</div></section>` : ''}`;
  }

  /* ─── Carte d'examen ────────────────────────────────────────────── */
  function examCard(x) {
    const n    = D.diffDays(new Date(), x.date);
    const tone = n <= 7 ? 'red' : 'blue';
    const d    = D.toDate(x.date);
    return `<div class="card exam tone-${tone}">
      <div class="date-block"><b>${d.getDate()}</b><small>${D.fmt(d, { month: 'short' }).replace('.', '')}</small></div>
      <div class="grow">
        <h4>${ui.esc(x.title)}</h4>
        <div class="meta"><span>${icon('clock')}${D.hm(x.start)} – ${D.hm(x.end)}</span><span>${icon('pin')}${ui.esc(x.room)}</span>${x.seat ? `<span>${icon('hash')}${ui.esc(x.seat)}</span>` : ''}</div>
      </div>
      <span class="tag">${n === 0 ? "Aujourd'hui" : n === 1 ? 'Demain' : 'J-' + n}</span>
    </div>`;
  }

  /* ─── Onglet Examens ────────────────────────────────────────────── */
  function examsTab(user) {
    const all  = db.exams(user);
    const up   = all.filter((x) => D.diffDays(new Date(), x.date) >= 0);
    const past = all.filter((x) => D.diffDays(new Date(), x.date) < 0);
    return `
      <div class="info-box">${icon('info')}<div><b>Le jour de l'examen</b>Présente-toi 15 minutes avant le début de l'épreuve avec ta carte d'étudiant. Les téléphones doivent être éteints.</div></div>
      <section class="section"><div class="section-head"><h2>À venir</h2><span class="muted small">${up.length} épreuve${up.length > 1 ? 's' : ''}</span></div>
        ${up.length ? `<div class="stack">${up.map(examCard).join('')}</div>` : `<div class="card">${ui.empty('checkCircle', 'Aucun examen programmé', 'Le calendrier sera publié par la scolarité.', 'green')}</div>`}
      </section>
      ${past.length ? `<section class="section"><div class="section-head"><h2>Passés</h2></div><div class="stack" style="opacity:.65">${past.map(examCard).join('')}</div></section>` : ''}`;
  }

  /* ─── Onglet Programmes (UE par semestre) ───────────────────────── */
  function programmesTab(user) {
    const ues     = db.programmes(user);
    const credits = ues.reduce((s, u) => s + (+u.credits || 0), 0);
    const hours   = ues.reduce((s, u) => s + (+u.hours || 0), 0);
    const groups  = {};
    ues.forEach((u) => (groups[u.semestre] = groups[u.semestre] || []).push(u));

    return `
      <div class="stat-row">
        <div class="stat"><b>${ues.length}</b><small>Unités d'enseignement</small></div>
        <div class="stat"><b>${credits}</b><small>Crédits ECTS</small></div>
        <div class="stat"><b>${hours} h</b><small>Volume horaire</small></div>
      </div>
      ${Object.entries(groups).map(([sem, list]) => `
        <section class="section"><div class="section-head"><h2>${ui.esc(sem)}</h2><span class="muted small">${list.reduce((s, u) => s + (+u.credits || 0), 0)} crédits</span></div>
          <div class="stack">${list.map((u) => `
            <details class="ue">
              <summary><span class="ic-box sm tone-blue">${icon('book')}</span>
                <div><small>${ui.esc(u.code)}</small><strong>${ui.esc(u.title)}</strong></div>
                <span class="tag tone-green push" style="margin-left:auto">${u.credits} crédits</span>
                ${icon('chevronDown', 'chev')}</summary>
              <div class="ue-body"><p>${ui.esc(u.description)}</p>
                <div class="meta"><span>${icon('clock')}${u.hours} heures</span><span>${icon('user')}${ui.esc(u.teacher)}</span></div></div>
            </details>`).join('')}</div>
        </section>`).join('')}`;
  }

  /* ─── Plan annuel détaillé des matières ────────────────────────── */
  function planAnnuelTab(user) {
    // Récupère tous les cours de l'étudiant / enseignant groupés par matière
    const allCourses = db.all('courses');
    const isStaff = db.isStaff(user);
    const myC = isStaff
      ? allCourses.filter((c) => (user.classes || []).some((cls) => {
          const info = IST.school.classInfo(cls);
          return info && info.filiere === c.filiere && info.niveau === c.niveau;
        }) || c.teacherId === user.id)
      : allCourses.filter((c) =>
          (!c.filiere || c.filiere === '*' || c.filiere === user.filiere) &&
          (!c.niveau  || c.niveau  === '*' || c.niveau  === user.niveau));

    // Dédupliquer par matière (title)
    const matieresMap = {};
    myC.forEach((c) => {
      const key = (c.title || '').toLowerCase().trim();
      if (!matieresMap[key]) matieresMap[key] = { ...c, sessions: [] };
      matieresMap[key].sessions.push(c);
    });
    const matieres = Object.values(matieresMap);

    // Regrouper par type (Cours, TD, TP…)
    const byType = {};
    matieres.forEach((m) => {
      const type = m.type || 'Cours';
      (byType[type] = byType[type] || []).push(m);
    });

    if (!matieres.length) {
      return `<div class="card">${ui.empty('book', 'Aucun cours dans le programme', isStaff ? 'Ajoutez des cours dans les classes que vous enseignez.' : 'Votre programme de cours n\'a pas encore été publié.')}</div>`;
    }

    const toneMap = { Cours: 'blue', TD: 'purple', TP: 'orange', 'Cours magistral': 'blue', 'Travaux Dirigés': 'purple', 'Travaux Pratiques': 'orange' };

    return `
      <div class="info-box" style="margin-bottom:18px;">${icon('book')}<div>
        <b>Plan annuel de vos matières</b>
        Ce plan regroupe l'ensemble des matières et modules au programme pour votre formation à l'IST.
        Chaque matière indique les créneaux hebdomadaires, l'enseignant responsable et la salle.
      </div></div>

      <div class="stat-row" style="margin-bottom:20px;">
        <div class="stat"><b>${matieres.length}</b><small>Matières</small></div>
        <div class="stat"><b>${myC.length}</b><small>Créneaux / semaine</small></div>
        <div class="stat"><b>${Object.keys(byType).length}</b><small>Types de séance</small></div>
      </div>

      ${Object.entries(byType).map(([type, list]) => {
        const tone = toneMap[type] || 'blue';
        return `
          <section class="section">
            <div class="section-head">
              <h2 style="display:flex;align-items:center;gap:8px;">
                <span class="ic-box sm tone-${tone}">${icon('book')}</span>${ui.esc(type)}
              </h2>
              <span class="muted small">${list.length} matière${list.length > 1 ? 's' : ''}</span>
            </div>
            <div class="stack">
              ${list.map((m) => {
                // Grouper les sessions de cette matière par jour
                const sessionsByDay = {};
                m.sessions.forEach((s) => { (sessionsByDay[s.day] = sessionsByDay[s.day] || []).push(s); });
                const sessHtml = Object.entries(sessionsByDay)
                  .sort(([a], [b]) => +a - +b)
                  .map(([day, sess]) => sess.map((s) =>
                    `<div class="meta" style="margin-top:6px;">
                      <span>${icon('calendar')}${DAY_NAMES[+day] || 'Jour ' + day}</span>
                      <span>${icon('clock')}${s.start} – ${s.end}</span>
                      ${s.room ? `<span>${icon('door')}${ui.esc(s.room)}</span>` : ''}
                    </div>`).join('')
                  ).join('');

                return `
                  <div class="card" style="padding:16px;">
                    <div style="display:flex;align-items:flex-start;gap:12px;">
                      <span class="ic-box tone-${tone}" style="flex-shrink:0;">${icon('book')}</span>
                      <div class="grow" style="min-width:0;">
                        <strong style="font-size:15px;display:block;margin-bottom:2px;">${ui.esc(m.title)}</strong>
                        ${m.teacher ? `<small class="muted">${icon('user')}${ui.esc(m.teacher)}</small>` : ''}
                        ${m.pole ? `<span class="tag" style="font-size:11px;margin-top:4px;">${ui.esc(m.pole)}</span>` : ''}
                        ${sessHtml}
                        ${m.filiere && m.filiere !== '*' ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted);">${icon('users')}${ui.esc(m.filiere)} · ${ui.esc(m.niveau || '')}</div>` : ''}
                      </div>
                      <span class="tag tone-${tone}" style="flex-shrink:0;font-size:12px;">${m.sessions.length} créneau${m.sessions.length > 1 ? 'x' : ''}</span>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </section>`;
      }).join('')}`;
  }

  /* ─── Page principale ───────────────────────────────────────────── */
  IST.pages.academique = {
    title: 'Vie académique',
    subtitle: 'Emploi du temps, examens et plan annuel des matières',
    render({ user }) {
      if (!st.date) st.date = initialDate();
      const tabs = [
        ['edt',       'Emploi du temps'],
        ['examens',   'Examens'],
        ['plan',      'Plan annuel'],
        ['programmes','Programmes UE'],
      ];
      const body = {
        edt:        () => timetable(user),
        examens:    () => examsTab(user),
        plan:       () => planAnnuelTab(user),
        programmes: () => programmesTab(user),
      }[st.tab] ? {
        edt:        () => timetable(user),
        examens:    () => examsTab(user),
        plan:       () => planAnnuelTab(user),
        programmes: () => programmesTab(user),
      }[st.tab]() : timetable(user);

      return `<div class="page-tabs">${ui.seg(tabs, st.tab, 'tab')}</div>${body}`;
    },
    mount(el, ctx) {
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab], [data-nav], [data-day], [data-view]');
        if (!t) return;
        if (t.dataset.tab) st.tab = t.dataset.tab;
        else if (t.dataset.view) st.view = t.dataset.view;
        else if (t.dataset.day) { st.date = D.toDate(t.dataset.day); st.view = 'jour'; }
        else if (t.dataset.nav) {
          const n = +t.dataset.nav;
          if (n === 0) st.date = initialDate();
          else {
            const step = st.view === 'semaine' ? 7 : 1;
            let d = D.addDays(st.date, n * step);
            if (step === 1 && d.getDay() === 0) d = D.addDays(d, n);
            st.date = d;
          }
        }
        ctx.refresh();
      });
    },
  };
})();
