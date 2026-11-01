/* Agenda : activités étudiantes + agenda personnel + gestion événements (Communication / Admin) */
(function () {
  const { ui, db, auth, date: D } = IST;
  const icon = IST.icon;
  const st = { tab: 'activites', when: null, showCourses: true };

  function canManageEvents(u) {
    return Boolean(u && (
      u.role === 'admin' ||
      u.role === 'communication' ||
      u.role === 'staff' ||
      u.role === 'chef' ||
      (u.fonction && u.fonction.toLowerCase().includes('com')) ||
      (u.email && u.email.toLowerCase().includes('com'))
    ));
  }

  /* ---------- Détail d'un événement (utilisé aussi par l'accueil) ---------- */
  function openEvent(ev, ctx) {
    if (!ev) return;
    const u = auth.current();
    const tone = ui.TONES.event[ev.category] || 'blue';
    const isIn = () => (auth.current().events || []).includes(ev.id);
    const range = ev.endDate && ev.endDate !== ev.date ? `Du ${D.long(ev.date)} au ${D.long(ev.endDate)}` : D.long(ev.date);
    const allowManage = canManageEvents(u);

    const btn = () => (isIn()
      ? `<button class="btn btn-outline" data-toggle>${icon('check')}Dans mon agenda</button>`
      : `<button class="btn btn-primary" data-toggle>${icon('plus')}Ajouter à mon agenda</button>`);

    const adminActions = allowManage
      ? `<button class="btn btn-danger-outline btn-sm" data-del-event="${ev.id}">${icon('trash')}Supprimer l'événement</button>`
      : '';

    const s = ui.sheet({
      title: 'Détails de l'événement',
      body: `<div class="tone-${tone}">
        <div class="event-hero">${icon(ui.EVENT_ICONS[ev.category] || 'calendar')}<span class="tag">${ui.esc(ev.category)} · ${ev.type === 'externe' ? 'Externe' : 'Interne'}</span><h2>${ui.esc(ev.title)}</h2></div>
        <div class="detail-rows">
          <div><span class="ic-box sm">${icon('calendar')}</span><div><small>Date</small>${range}</div></div>
          ${ev.time ? `<div><span class="ic-box sm">${icon('clock')}</span><div><small>Heure</small>${ui.esc(D.hm(ev.time))}</div></div>` : ''}
          <div><span class="ic-box sm">${icon('pin')}</span><div><small>Lieu</small>${ui.esc(ev.place)}</div></div>
          ${ev.organizer ? `<div><span class="ic-box sm">${icon('users')}</span><div><small>Organisé par</small>${ui.esc(ev.organizer)}</div></div>` : ''}
        </div>
        <p class="prose">${ui.esc(ev.description || '')}</p></div>`,
      footer: `<div class="row-between grow" style="gap:12px;">${adminActions}<div class="push"></div><span data-slot>${btn()}</span></div>`,
    });

    s.el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-toggle]')) {
        const currentUser = auth.current();
        const list = new Set(currentUser.events || []);
        const adding = !list.has(ev.id);
        adding ? list.add(ev.id) : list.delete(ev.id);
        auth.update(currentUser.id, { events: [...list] });
        s.el.querySelector('[data-slot]').innerHTML = btn();
        ui.toast(adding ? 'Ajouté à ton agenda.' : 'Retiré de ton agenda.', 'success');
        ctx && ctx.refresh();
        return;
      }

      if (e.target.closest('[data-del-event]')) {
        if (await ui.confirm(`Voulez-vous supprimer l'événement « ${ev.title} » ?`, { ok: 'Supprimer', danger: true })) {
          db.remove('events', ev.id);
          s.close();
          ui.toast('Événement supprimé.', 'success');
          ctx && ctx.refresh();
        }
      }
    });
  }
  IST.agenda = { openEvent };

  /* ---------- Modal Ajout d'événement (Communication / Admin) ---------- */
  function addEventModal(ctx) {
    const u = ctx.user || auth.current() || {};
    const categories = Object.keys(ui.TONES.event);

    const s = ui.sheet({
      title: 'Publier un nouvel événement',
      body: `<form class="admin-form stack-lg" id="event-add-form" novalidate>
        ${ui.field({ name: 'title', label: "Titre de l'événement", placeholder: 'Ex. Grande Conférence : Métiers du Numérique', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Catégorie', type: 'select', options: categories, value: 'Culture' })}
          ${ui.field({ name: 'type', label: 'Portée', type: 'select', options: [['interne', 'Interne (Campus IST)'], ['externe', 'Externe (Partenaires)']], value: 'interne' })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'date', label: 'Date de début', type: 'date', value: D.iso(new Date()), required: true })}
          ${ui.field({ name: 'endDate', label: 'Date de fin (optionnel)', type: 'date', optional: true })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'time', label: 'Heure', type: 'time', value: '10:00', optional: true })}
          ${ui.field({ name: 'place', label: 'Lieu', placeholder: 'Ex. Amphithéâtre / Campus IST', value: 'Campus IST', required: true })}
        </div>
        ${ui.field({ name: 'organizer', label: 'Organisateur', value: u.role === 'communication' ? 'Service Communication' : 'Direction des études', required: true })}
        ${ui.field({ name: 'description', label: 'Description détaillée', type: 'textarea', rows: 4, placeholder: 'Programme, intervenants, conditions de participation…' })}
        <label class="check">
          <input type="checkbox" name="notify" checked>
          Notifier tous les étudiants de cet événement
        </label>
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="event-add-form">${icon('plus')}Enregistrer l'événement</button>`,
    });

    const f = s.el.querySelector('#event-add-form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = ui.formData(f);
      ui.setErr(f, 'title', d.title.trim() ? '' : "Donnez un titre à l'événement.");
      ui.setErr(f, 'date', d.date ? '' : 'Indiquez la date.');
      ui.setErr(f, 'place', d.place.trim() ? '' : 'Indiquez le lieu.');
      if (!d.title.trim() || !d.date || !d.place.trim()) return;

      const newEv = {
        title: d.title.trim(),
        category: d.category || 'Culture',
        type: d.type || 'interne',
        date: d.date,
        endDate: d.endDate || '',
        time: d.time || '',
        place: d.place.trim(),
        organizer: (d.organizer || 'Service Communication').trim(),
        description: (d.description || '').trim(),
        createdAt: new Date().toISOString(),
      };

      db.add('events', newEv);

      if (d.notify) {
        db.notify({
          type: 'evenement',
          icon: 'calendar',
          title: `Nouvel événement : ${newEv.title}`,
          body: `${newEv.category} · Le ${D.fmt(newEv.date, { day: 'numeric', month: 'long' })} à ${newEv.place}.`,
          link: 'agenda',
        });
      }

      s.close();
      ui.toast(`Événement « ${newEv.title} » publié avec succès !`, 'success');
      ctx.refresh();
    });
  }

  /* ---------- Onglet Activités ---------- */
  function activities(user) {
    const today = D.iso(new Date());
    const all = db.upcomingEvents();
    const ongoing = all.filter((e) => db.isOngoing(e, today));
    if (!st.when) st.when = ongoing.length ? 'encours' : 'avenir';
    const list = st.when === 'encours' ? ongoing : all.filter((e) => e.date > today);
    const mine = new Set(user.events || []);
    const allowManage = canManageEvents(user);

    const manageBar = allowManage
      ? `<div class="row-between mb" style="flex-wrap:wrap;gap:12px;background:var(--surface,#fff);padding:12px 16px;border-radius:12px;border:1px solid var(--border,#e2e8f0);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="badge tone-purple" style="font-size:12px;">${icon('megaphone')} Service Communication & Admin</span>
            <span class="muted small">Actualisez les activités du campus en direct.</span>
          </div>
          <button class="btn btn-primary" data-add-event>${icon('plus')}Ajouter un événement</button>
        </div>`
      : '';

    const section = (title, items) => `<section class="section">
      <div class="section-head"><h2>${title}</h2><span class="muted small">${items.length}</span></div>
      ${items.length ? `<div class="grid-2">${items.map((e) => ui.eventCard(e, { participating: mine.has(e.id) })).join('')}</div>`
        : `<div class="card">${ui.empty('calendar', 'Rien pour le moment', 'Les prochains événements apparaîtront ici.')}</div>`}
    </section>`;

    return `
      ${manageBar}
      ${ui.seg([['encours', `En cours${ongoing.length ? ` (${ongoing.length})` : ''}`], ['avenir', 'À venir']], st.when, 'when', 'full')}
      ${section('Événements internes', list.filter((e) => e.type !== 'externe'))}
      ${section('Événements externes', list.filter((e) => e.type === 'externe'))}`;
  }

  /* ---------- Onglet Mon agenda ---------- */
  function myAgenda(user) {
    const now = new Date();
    const mine = new Set(user.events || []);
    const reminders = db.reminders(user);
    const exams = db.exams(user);
    const events = db.eventsSorted();
    let html = '';
    for (let i = 0; i < 14; i++) {
      const d = D.addDays(now, i);
      const iso = D.iso(d);
      const items = [];
      if (st.showCourses) db.coursesOn(d, user).forEach((c) =>
        items.push({ time: c.start, title: c.title, sub: `${c.type} · ${c.room}`, tone: ui.TONES.course[c.type] || 'blue', icon: 'book' }));
      exams.filter((x) => x.date === iso).forEach((x) =>
        items.push({ time: x.start, title: `Examen : ${x.title}`, sub: x.room, tone: 'red', icon: 'alert' }));
      events.filter((e) => mine.has(e.id) && e.date <= iso && (e.endDate || e.date) >= iso).forEach((e) =>
        items.push({ time: /^\d\d:\d\d$/.test(e.time) ? e.time : '', title: e.title, sub: e.place, tone: ui.TONES.event[e.category] || 'blue', icon: 'star', event: e.id }));
      reminders.filter((r) => r.date === iso).forEach((r) =>
        items.push({ time: r.time || '', title: r.title, sub: r.note || 'Rappel personnel', tone: 'yellow', icon: 'bell', reminder: r.id }));
      if (!items.length) continue;
      items.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
      html += `<div class="agenda-day">
        <div class="agenda-date ${i === 0 ? 'today' : ''}"><small>${i === 0 ? "Auj." : D.fmt(d, { weekday: 'short' }).replace('.', '')}</small><b>${d.getDate()}</b><small>${D.fmt(d, { month: 'short' }).replace('.', '')}</small></div>
        <div class="stack" style="gap:8px">${items.map((it) => `
          <div class="agenda-item tone-${it.tone}">
            <span class="time">${it.time ? D.hm(it.time) : '—'}</span>
            <div class="grow"><strong>${ui.esc(it.title)}</strong><small>${ui.esc(it.sub)}</small></div>
            ${it.reminder ? `<button class="icon-btn" data-del-reminder="${it.reminder}" aria-label="Supprimer le rappel">${icon('trash')}</button>` : ''}
            ${it.event ? `<button class="icon-btn" data-event="${it.event}" aria-label="Voir l'événement">${icon('chevronRight')}</button>` : ''}
          </div>`).join('')}</div>
      </div>`;
    }
    return `
      <div class="row-between">
        <label class="check"><input type="checkbox" data-show-courses ${st.showCourses ? 'checked' : ''}>Afficher mes cours</label>
        <button class="btn btn-primary btn-sm" data-add-reminder>${icon('plus')}Ajouter un rappel</button>
      </div>
      <div class="card mt">${html || ui.empty('calendar', 'Ton agenda est vide', 'Ajoute un rappel ou inscris-toi à un événement.')}</div>
      <p class="muted small mt">Tes 14 prochains jours : cours, examens, événements suivis et rappels personnels.</p>`;
  }

  function addReminder(ctx) {
    const s = ui.sheet({
      title: 'Nouveau rappel',
      body: `<form class="stack-lg" id="rem-form" novalidate>
        ${ui.field({ name: 'title', label: 'Titre', placeholder: 'Ex. Rendre le rapport de TP', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'date', label: 'Date', type: 'date', value: D.iso(new Date()), required: true })}
          ${ui.field({ name: 'time', label: 'Heure', type: 'time', optional: true })}
        </div>
        ${ui.field({ name: 'note', label: 'Note', type: 'textarea', rows: 3, optional: true, placeholder: 'Détails…' })}
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" form="rem-form" type="submit">Enregistrer</button>`,
    });
    s.el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const d = ui.formData(f);
      ui.setErr(f, 'title', d.title.trim() ? '' : 'Donne un titre à ton rappel.');
      ui.setErr(f, 'date', d.date ? '' : 'Choisis une date.');
      if (!d.title.trim() || !d.date) return;
      const list = db.reminders(ctx.user);
      list.push({ id: db.uid(), title: d.title.trim(), date: d.date, time: d.time, note: d.note.trim() });
      db.saveReminders(ctx.user, list);
      s.close();
      ui.toast('Rappel ajouté.', 'success');
      ctx.refresh();
    });
  }

  IST.pages.agenda = {
    title: 'Agenda étudiant',
    subtitle: 'Activités étudiantes et agenda personnel',
    render({ user }) {
      return `<div class="page-tabs">${ui.seg([['activites', 'Activités étudiantes'], ['perso', 'Mon agenda']], st.tab, 'tab')}</div>
        ${st.tab === 'activites' ? activities(user) : myAgenda(user)}`;
    },
    mount(el, ctx) {
      el.addEventListener('change', (e) => {
        if (e.target.matches('[data-show-courses]')) { st.showCourses = e.target.checked; ctx.refresh(); }
      });
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tab], [data-when], [data-event], [data-add-event], [data-add-reminder], [data-del-reminder]');
        if (!t) return;
        if (t.dataset.tab) { st.tab = t.dataset.tab; ctx.refresh(); }
        else if (t.dataset.when) { st.when = t.dataset.when; ctx.refresh(); }
        else if (t.hasAttribute('data-add-event')) addEventModal(ctx);
        else if (t.dataset.event) openEvent(db.find('events', t.dataset.event), ctx);
        else if (t.hasAttribute('data-add-reminder')) addReminder(ctx);
        else if (t.dataset.delReminder) {
          if (!(await ui.confirm('Supprimer ce rappel ?', { ok: 'Supprimer', danger: true }))) return;
          db.saveReminders(ctx.user, db.reminders(ctx.user).filter((r) => r.id !== t.dataset.delReminder));
          ctx.refresh();
        }
      });
    },
  };
})();
