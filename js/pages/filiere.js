/* Espace chef de filière : emplois du temps, examens et informations de la filière */
(function () {
  const { ui, db, auth, date: D } = IST;
  const icon = IST.icon;
  const DAYS = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi']];
  const st = { tab: 'apercu', level: '' };

  const fil = (u) => IST.school.find(u.chefFiliere);
  const levelOpts = (f) => f.levels.map((l) => [l, IST.school.levelLabel(l)]);
  /** Enseignants qui tiennent au moins une classe de la filière. */
  function teachersOf(f) {
    const ids = new Set(IST.school.classesOfFiliere(f.name));
    return auth.users().filter((u) => (u.classes || []).some((c) => ids.has(c)));
  }
  const delBtn = (coll, id) => `<button class="icon-btn" data-del="${coll}:${id}" aria-label="Supprimer">${icon('trash')}</button>`;

  /* ---------- Onglets ---------- */
  function apercu(f) {
    const classes = IST.school.classesOfFiliere(f.name).map(IST.school.classInfo);
    const students = auth.users().filter((u) => u.role === 'etudiant' && u.filiere === f.name);
    return `
      <div class="stat-row">
        <div class="stat"><b>${students.length}</b><small>Étudiants inscrits</small></div>
        <div class="stat"><b>${teachersOf(f).length}</b><small>Enseignants</small></div>
        <div class="stat"><b>${db.all('courses').filter((c) => c.filiere === f.name).length}</b><small>Séances / semaine</small></div>
      </div>
      <section class="section"><div class="section-head"><h2>Classes de la filière</h2></div>
        <div class="grid-3">${classes.map((c) => {
          const n = db.studentsOf(c.id).length;
          return `<a class="card class-card" href="#/classes/${c.id}">
            <div class="row"><span class="ic-box tone-purple">${icon('users')}</span><div class="grow"><strong>${ui.esc(c.label)}</strong><small class="muted">${ui.esc(IST.school.levelLabel(c.niveau))}</small></div>${icon('chevronRight')}</div>
            <div class="meta"><span>${icon('door')}${ui.esc(c.room || 'Salle à venir')}</span><span>${icon('user')}${n} étudiant${n > 1 ? 's' : ''}</span></div>
          </a>`;
        }).join('')}</div>
      </section>
      <div class="info-box mt-lg">${icon('info')}<div><b>Ton rôle de chef de filière</b>Publie les emplois du temps et les examens de chaque niveau, et envoie les informations importantes aux étudiants de la filière. Ils sont notifiés automatiquement.</div></div>`;
  }

  function edt(f) {
    const teachers = teachersOf(f);
    const lvl = st.level || f.levels[0];
    const list = db.all('courses').filter((c) => c.filiere === f.name && c.niveau === lvl);
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="cours" novalidate>
        <h3>Ajouter une séance</h3>
        <div class="form-row">
          ${ui.field({ name: 'niveau', label: 'Niveau', type: 'select', options: levelOpts(f), value: lvl })}
          ${ui.field({ name: 'day', label: 'Jour', type: 'select', options: DAYS, value: 1 })}
        </div>
        ${ui.field({ name: 'title', label: 'Matière', placeholder: 'Ex. Réseaux informatiques' })}
        <div class="form-row">
          ${ui.field({ name: 'start', label: 'Début', type: 'time', value: '08:00' })}
          ${ui.field({ name: 'end', label: 'Fin', type: 'time', value: '10:00' })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'type', label: 'Type', type: 'select', options: ['Cours', 'TD', 'TP'], value: 'Cours' })}
          ${ui.field({ name: 'room', label: 'Salle', value: '@classe', hint: '« @classe » = salle de la classe' })}
        </div>
        ${ui.field({ name: 'teacherId', label: 'Enseignant', type: 'select', options: [['', '— Saisir un nom ci-dessous —'], ...teachers.map((t) => [t.id, ui.displayName(t)])], value: '' })}
        ${ui.field({ name: 'teacherName', label: "Nom de l'enseignant", optional: true, placeholder: 'Si non inscrit sur Campus+' })}
        <button class="btn btn-primary" type="submit">${icon('plus')}Ajouter la séance</button>
      </form>
      <div>
        <div class="row-between" style="margin-bottom:12px">
          <div class="chips">${f.levels.map((l) => `<button type="button" class="chip ${l === lvl ? 'active' : ''}" data-level="${l}">${l}</button>`).join('')}</div>
          <button class="btn btn-soft btn-sm" data-notify-edt="${lvl}">${icon('send')}Envoyer aux ${lvl}</button>
        </div>
        ${list.length ? DAYS.map(([d, label]) => {
          const items = list.filter((c) => c.day === d).sort((a, b) => a.start.localeCompare(b.start));
          return items.length ? `<p class="list-title">${label}</p><div class="list">${items.map((c) => `
            <div class="list-item"><span class="tag tone-${ui.TONES.course[c.type] || 'blue'}">${ui.esc(c.type)}</span>
              <div class="grow"><strong>${ui.esc(c.title)}</strong><small>${D.hm(c.start)} – ${D.hm(c.end)} · ${ui.esc(db.roomText(c.room))}${c.teacher ? ' · ' + ui.esc(c.teacher) : ''}</small></div>
              ${delBtn('courses', c.id)}</div>`).join('')}</div>` : '';
        }).join('') : `<div class="card">${ui.empty('calendar', `Aucune séance pour les ${lvl}`, 'Ajoute les séances avec le formulaire.')}</div>`}
      </div>
    </div>`;
  }

  function examens(f) {
    const list = db.all('exams').filter((x) => x.filiere === f.name).sort((a, b) => a.date.localeCompare(b.date));
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="examen" novalidate>
        <h3>Programmer un examen</h3>
        <div class="form-row">
          ${ui.field({ name: 'niveau', label: 'Niveau', type: 'select', options: levelOpts(f), value: st.level || f.levels[0] })}
          ${ui.field({ name: 'date', label: 'Date', type: 'date' })}
        </div>
        ${ui.field({ name: 'title', label: 'Matière' })}
        <div class="form-row">
          ${ui.field({ name: 'start', label: 'Début', type: 'time', value: '08:00' })}
          ${ui.field({ name: 'end', label: 'Fin', type: 'time', value: '10:00' })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'room', label: 'Salle', value: '@classe' })}
          ${ui.field({ name: 'seat', label: 'Placement', optional: true, placeholder: 'Place libre' })}
        </div>
        <button class="btn btn-primary" type="submit">${icon('plus')}Programmer</button>
      </form>
      <div class="stack">${list.map((x) => `<div class="card admin-row"><span class="tag">${ui.esc(x.niveau)}</span>
        <div class="grow"><strong>${ui.esc(x.title)}</strong><small class="muted">${D.fmt(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${D.hm(x.start)} – ${D.hm(x.end)} · ${ui.esc(db.roomText(x.room))}</small></div>
        ${delBtn('exams', x.id)}</div>`).join('') || `<div class="card">${ui.empty('clipboard', 'Aucun examen programmé')}</div>`}</div>
    </div>`;
  }

  function infos(f, u) {
    const list = db.all('announcements').filter((a) => a.filiere === f.name).sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="info" novalidate>
        <h3>Envoyer une information</h3>
        ${ui.field({ name: 'niveau', label: 'Destinataires', type: 'select', options: [['*', 'Toute la filière'], ...levelOpts(f)], value: '*' })}
        ${ui.field({ name: 'category', label: 'Catégorie', type: 'select', options: ['Scolarité', 'Urgent', 'Vie étudiante', 'Général'], value: 'Scolarité' })}
        ${ui.field({ name: 'title', label: 'Titre' })}
        ${ui.field({ name: 'body', label: 'Message', type: 'textarea', rows: 5 })}
        <label class="check"><input type="checkbox" name="pinned">Épingler en haut des actualités</label>
        <button class="btn btn-primary" type="submit">${icon('send')}Envoyer</button>
      </form>
      <div class="stack">${list.map((a) => `<div class="card admin-row"><div class="grow"><strong>${ui.esc(a.title)}</strong>
        <small class="muted">${a.niveau && a.niveau !== '*' ? ui.esc(a.niveau) : 'Toute la filière'} · ${D.relative(a.date)}</small></div>${delBtn('announcements', a.id)}</div>`).join('') || `<div class="card">${ui.empty('megaphone', 'Aucune information envoyée')}</div>`}</div>
    </div>`;
  }

  function etudiants(f) {
    const us = auth.users().filter((u) => u.role === 'etudiant' && u.filiere === f.name)
      .sort((a, b) => a.niveau.localeCompare(b.niveau) || a.nom.localeCompare(b.nom));
    const teachers = teachersOf(f);
    return `
      <p class="list-title">Enseignants de la filière (${teachers.length})</p>
      <div class="list">${teachers.map((t) => `<div class="list-item">${ui.avatar(t, 34)}<div class="grow"><strong>${ui.esc(ui.displayName(t))}</strong>
        <small>${(t.classes || []).filter((c) => c.startsWith(f.code + '-')).join(', ')}</small></div><a class="icon-btn" href="mailto:${ui.esc(t.email)}" aria-label="Écrire">${icon('mail')}</a></div>`).join('') || '<div class="list-item muted small">Aucun enseignant inscrit.</div>'}</div>
      <p class="list-title">Étudiants (${us.length})</p>
      ${us.length ? `<div class="table-wrap"><table><thead><tr><th>Nom</th><th>Niveau</th><th>Email</th><th>Inscription</th></tr></thead>
        <tbody>${us.map((u) => `<tr><td><div class="row">${ui.avatar(u, 28)}${ui.esc(u.prenom + ' ' + u.nom)}</div></td><td>${ui.esc(u.niveau)}</td><td>${ui.esc(u.email)}</td><td>${D.fmt(u.createdAt, { day: 'numeric', month: 'short' })}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="card">${ui.empty('users', 'Aucun étudiant inscrit pour le moment')}</div>`}`;
  }

  /* ---------- Enregistrement ---------- */
  function need(form, d, names) {
    let ok = true;
    names.forEach((n) => { const bad = !String(d[n] || '').trim(); ui.setErr(form, n, bad ? 'Champ obligatoire.' : ''); if (bad) ok = false; });
    return ok;
  }

  async function submit(kind, form, f, u) {
    const d = ui.formData(form);
    const author = `${ui.displayName(u)}, chef de filière ${f.code}`;
    if (kind === 'cours') {
      if (!need(form, d, ['title', 'room'])) return false;
      if (d.end <= d.start) { ui.setErr(form, 'end', "L'heure de fin doit suivre l'heure de début."); return false; }
      const t = auth.users().find((x) => x.id === d.teacherId);
      db.add('courses', { pole: '*', filiere: f.name, niveau: d.niveau, day: +d.day, start: d.start, end: d.end, title: d.title.trim(), type: d.type, room: d.room.trim(), teacherId: t ? t.id : '', teacher: t ? ui.displayName(t) : d.teacherName.trim() });
      st.level = d.niveau;
      ui.toast('Séance ajoutée.', 'success');
    } else if (kind === 'examen') {
      if (!need(form, d, ['title', 'date', 'room'])) return false;
      if (d.end <= d.start) { ui.setErr(form, 'end', "L'heure de fin doit suivre l'heure de début."); return false; }
      db.add('exams', { pole: '*', filiere: f.name, niveau: d.niveau, title: d.title.trim(), date: d.date, start: d.start, end: d.end, room: d.room.trim(), seat: d.seat.trim() });
      db.notify({ filiere: f.name, niveau: d.niveau, from: u.id, type: 'cours', icon: 'clipboard', link: 'academique', title: `Examen programmé : ${d.title.trim()}`, body: `${D.fmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' })} à ${D.hm(d.start)}` });
      ui.toast('Examen programmé. Les étudiants sont notifiés.', 'success');
    } else if (kind === 'info') {
      if (!need(form, d, ['title', 'body'])) return false;
      const a = db.add('announcements', { title: d.title.trim(), body: d.body.trim(), category: d.category, filiere: f.name, niveau: d.niveau, author, pinned: !!d.pinned, date: new Date().toISOString() });
      db.notify({ filiere: f.name, niveau: d.niveau, from: u.id, type: d.category === 'Urgent' ? 'cours' : 'annonce', icon: 'megaphone', link: 'actualites/' + a.id, title: a.title, body: a.body.slice(0, 90) });
      ui.toast('Information envoyée.', 'success');
    }
    await db.flushRemote();
    return true;
  }

  IST.pages.filiere = {
    title: 'Espace chef de filière',
    subtitle: (u) => u.chefFiliere || '',
    can: (u) => u.role === 'chef',
    render({ user }) {
      const f = fil(user);
      if (!f) return `<div class="card">${ui.empty('layers', 'Filière introuvable', 'Choisis ta filière dans ton profil.')}</div>`;
      const tabs = [['apercu', 'Aperçu'], ['edt', 'Emplois du temps'], ['examens', 'Examens'], ['infos', 'Informations'], ['etudiants', 'Étudiants & enseignants']];
      const body = { apercu, edt, examens, infos, etudiants }[st.tab](f, user);
      return `
        <div class="class-hero">
          <div class="grow"><span class="tag">${icon('layers')}${ui.esc(f.code)} · ${ui.esc(f.poleName)}</span><h2>${ui.esc(f.name)}</h2><p>${ui.esc(f.group)}</p></div>
        </div>
        <div class="page-tabs mt">${ui.seg(tabs, st.tab, 'tab')}</div>${body}`;
    },
    mount(el, ctx) {
      const f = fil(ctx.user);
      if (!f) return;
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tab], [data-level], [data-del], [data-notify-edt]');
        if (!t) return;
        if (t.dataset.tab) { st.tab = t.dataset.tab; return ctx.refresh(); }
        if (t.dataset.level) { st.level = t.dataset.level; return ctx.refresh(); }
        if (t.dataset.notifyEdt) {
          const lvl = t.dataset.notifyEdt;
          db.notify({ filiere: f.name, niveau: lvl, from: ctx.user.id, type: 'cours', icon: 'calendar', link: 'academique', title: `Emploi du temps ${f.code} ${lvl} mis à jour`, body: `Publié par ${ui.displayName(ctx.user)}.` });
          await db.flushRemote();
          return ui.toast(`Les étudiants de ${f.code} ${lvl} ont été notifiés.`, 'success');
        }
        const [coll, id] = t.dataset.del.split(':');
        if (!(await ui.confirm('Supprimer cet élément ?', { ok: 'Supprimer', danger: true }))) return;
        db.remove(coll, id);
        await db.flushRemote();
        ctx.refresh();
      });
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          if (await submit(e.target.dataset.form, e.target, f, ctx.user)) ctx.refresh();
        } catch (err) {
          ui.toast(err.message || "Impossible d'enregistrer les données.", 'error');
        }
      });
    },
  };
})();
