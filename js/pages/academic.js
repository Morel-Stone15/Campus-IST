/* Vie académique : emploi du temps, examens, programmes */
(function () {
  const { ui, db, date: D } = IST;
  const icon = IST.icon;
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const st = { tab: 'edt', date: null, view: 'jour' };

  function initialDate() {
    // Le dimanche, on affiche directement le lundi suivant.
    const d = D.startOfDay(new Date());
    return d.getDay() === 0 ? D.addDays(d, 1) : d;
  }

  function courseState(c, date) {
    const now = new Date();
    const diff = D.diffDays(now, date);
    if (diff !== 0) return diff < 0 ? 'past' : '';
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= D.toMin(c.end) ? 'past' : m >= D.toMin(c.start) ? 'now' : '';
  }

  function timetable(user) {
    const d = st.date;
    const ws = D.startOfWeek(d);
    const todayIso = D.iso(new Date());
    const week = DAYS.map((label, i) => {
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
        const day = D.addDays(ws, i);
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

  function examCard(x) {
    const n = D.diffDays(new Date(), x.date);
    const tone = n <= 7 ? 'red' : 'blue';
    const d = D.toDate(x.date);
    return `<div class="card exam tone-${tone}">
      <div class="date-block"><b>${d.getDate()}</b><small>${D.fmt(d, { month: 'short' }).replace('.', '')}</small></div>
      <div class="grow">
        <h4>${ui.esc(x.title)}</h4>
        <div class="meta"><span>${icon('clock')}${D.hm(x.start)} – ${D.hm(x.end)}</span><span>${icon('pin')}${ui.esc(x.room)}</span>${x.seat ? `<span>${icon('hash')}${ui.esc(x.seat)}</span>` : ''}</div>
      </div>
      <span class="tag">${n === 0 ? "Aujourd'hui" : n === 1 ? 'Demain' : 'J-' + n}</span>
    </div>`;
  }

  function examsTab(user) {
    const all = db.exams(user);
    const up = all.filter((x) => D.diffDays(new Date(), x.date) >= 0);
    const past = all.filter((x) => D.diffDays(new Date(), x.date) < 0);
    return `
      <div class="info-box">${icon('info')}<div><b>Le jour de l'examen</b>Présente-toi 15 minutes avant le début de l'épreuve avec ta carte d'étudiant. Les téléphones doivent être éteints.</div></div>
      <section class="section"><div class="section-head"><h2>À venir</h2><span class="muted small">${up.length} épreuve${up.length > 1 ? 's' : ''}</span></div>
        ${up.length ? `<div class="stack">${up.map(examCard).join('')}</div>` : `<div class="card">${ui.empty('checkCircle', 'Aucun examen programmé', 'Le calendrier sera publié par la scolarité.', 'green')}</div>`}
      </section>
      ${past.length ? `<section class="section"><div class="section-head"><h2>Passés</h2></div><div class="stack" style="opacity:.65">${past.map(examCard).join('')}</div></section>` : ''}`;
  }

  function programmesTab(user) {
    const ues = db.programmes(user);
    const credits = ues.reduce((s, u) => s + (+u.credits || 0), 0);
    const hours = ues.reduce((s, u) => s + (+u.hours || 0), 0);
    const groups = {};
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

  IST.pages.academique = {
    title: 'Vie académique',
    subtitle: 'Emploi du temps, examens et programmes',
    render({ user }) {
      if (!st.date) st.date = initialDate();
      const body = st.tab === 'edt' ? timetable(user) : st.tab === 'examens' ? examsTab(user) : programmesTab(user);
      return `<div class="page-tabs">${ui.seg([['edt', 'Emploi du temps'], ['examens', 'Examens'], ['programmes', 'Programmes']], st.tab, 'tab')}</div>${body}`;
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
            if (step === 1 && d.getDay() === 0) d = D.addDays(d, n); // on saute le dimanche
            st.date = d;
          }
        }
        ctx.refresh();
      });
    },
  };
})();
