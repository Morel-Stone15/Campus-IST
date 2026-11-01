/* Espace administration (back-office simple) */
(function () {
  const { ui, db, auth, config: cfg, date: D } = IST;
  const icon = IST.icon;
  const st = { tab: 'apercu', roleFilter: 'all' };
  const DAYS = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi']];
  const ALL = [['*', 'Toutes les filières'], ...IST.school.filiereOptions()];
  const ALL_LEVELS = [['*', 'Tous les niveaux'], ...cfg.niveaux.map((n) => [n, IST.school.levelLabel(n)])];
  const POLES = [['*', 'Tous les pôles'], ...cfg.poles.map((p) => [p.id, p.name])];
  const MAX_FILE = 15 * 1024 * 1024; // documents
  const MAX_AUDIO = 25 * 1024 * 1024; // hymne

  const delBtn = (coll, id) => `<button class="icon-btn" data-del="${coll}:${id}" aria-label="Supprimer">${icon('trash')}</button>`;

  /* ---------- Onglets ---------- */
  function overview() {
    const all = auth.users();
    const students = all.filter((u) => u.role === 'etudiant');
    const staff = all.filter((u) => u.role !== 'etudiant');
    const recent = students.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    return `
      <div class="grid-3" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <div class="stat"><b>${students.length}</b><small>Étudiants inscrits</small></div>
        <div class="stat"><b>${staff.length}</b><small>Membres du personnel</small></div>
        <div class="stat"><b>${db.all('announcements').length}</b><small>Annonces</small></div>
        <div class="stat"><b>${db.all('events').length}</b><small>Événements</small></div>
        <div class="stat"><b>${db.all('courses').length}</b><small>Séances / semaine</small></div>
        <div class="stat"><b>${db.all('documents').length}</b><small>Documents</small></div>
      </div>
      <section class="section"><div class="section-head"><h2>Dernières inscriptions</h2></div>
        ${recent.length ? `<div class="list">${recent.map((u) => `<div class="list-item">${ui.avatar(u, 38)}<div class="grow"><strong>${ui.esc(u.prenom + ' ' + u.nom)}</strong><small>${ui.esc(u.filiere)} · ${ui.esc(u.niveau)}${db.myRoom(u) ? ' · ' + ui.esc(db.myRoom(u).label) : ''}</small></div><small>${D.relative(u.createdAt)}</small></div>`).join('')}</div>`
          : `<div class="card">${ui.empty('users', 'Aucun étudiant inscrit pour le moment')}</div>`}
      </section>
      <div class="info-box mt-lg">${icon('info')}<div><b>Comment ça marche ?</b>Les contenus publiés ici apparaissent immédiatement dans l'application. Chaque annonce ou événement publié envoie aussi une notification aux étudiants.</div></div>`;
  }

  function annonces() {
    const list = db.all('announcements').sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="annonce" novalidate>
        <h3>Publier une annonce</h3>
        ${ui.field({ name: 'title', label: 'Titre', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Catégorie', type: 'select', options: ['Scolarité', 'Vie étudiante', 'Urgent', 'Général'], value: 'Général' })}
          ${ui.field({ name: 'filiere', label: 'Destinataires', type: 'select', options: ALL, value: '*' })}
        </div>
        ${ui.field({ name: 'body', label: 'Contenu', type: 'textarea', rows: 5, required: true })}
        ${ui.field({ name: 'author', label: 'Signée par', value: 'Administration' })}
        <label class="check"><input type="checkbox" name="pinned">Épingler en haut de la liste</label>
        <button class="btn btn-primary" type="submit">${icon('megaphone')}Publier</button>
      </form>
      <div class="stack">${list.map((a) => `<div class="card admin-row"><div class="grow"><strong>${ui.esc(a.title)}</strong><small class="muted">${ui.esc(a.category)} · ${D.relative(a.date)}${a.pinned ? ' · Épinglée' : ''}</small></div>${delBtn('announcements', a.id)}</div>`).join('') || ui.empty('megaphone', 'Aucune annonce')}</div>
    </div>`;
  }

  function evenements() {
    const list = db.eventsSorted();
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="evenement" novalidate>
        <h3>Ajouter un événement</h3>
        ${ui.field({ name: 'title', label: 'Titre', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Catégorie', type: 'select', options: Object.keys(ui.TONES.event), value: 'Culture' })}
          ${ui.field({ name: 'type', label: 'Type', type: 'select', options: [['interne', 'Interne'], ['externe', 'Externe']], value: 'interne' })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'date', label: 'Date de début', type: 'date', required: true })}
          ${ui.field({ name: 'endDate', label: 'Date de fin', type: 'date', optional: true })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'time', label: 'Heure', type: 'time', optional: true })}
          ${ui.field({ name: 'place', label: 'Lieu', required: true })}
        </div>
        ${ui.field({ name: 'organizer', label: 'Organisateur', optional: true })}
        ${ui.field({ name: 'description', label: 'Description', type: 'textarea', rows: 4 })}
        <button class="btn btn-primary" type="submit">${icon('plus')}Ajouter</button>
      </form>
      <div class="stack">${list.map((e) => `<div class="card admin-row"><div class="grow"><strong>${ui.esc(e.title)}</strong><small class="muted">${D.fmt(e.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${ui.esc(e.place)}</small></div>${delBtn('events', e.id)}</div>`).join('') || ui.empty('calendar', 'Aucun événement')}</div>
    </div>`;
  }

  function cours() {
    const list = db.all('courses');
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="cours" novalidate>
        <h3>Ajouter une séance à l'emploi du temps</h3>
        ${ui.field({ name: 'title', label: 'Matière', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'day', label: 'Jour', type: 'select', options: DAYS, value: 1 })}
          ${ui.field({ name: 'type', label: 'Type', type: 'select', options: ['Cours', 'TD', 'TP'], value: 'Cours' })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'start', label: 'Début', type: 'time', value: '08:00' })}
          ${ui.field({ name: 'end', label: 'Fin', type: 'time', value: '10:00' })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'room', label: 'Salle', required: true, value: '@classe', hint: '« @classe » = salle de la classe (répartition des salles). Sinon : Amphi, B P107…' })}
          ${ui.field({ name: 'teacher', label: 'Enseignant', optional: true })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'pole', label: 'Pôle', type: 'select', options: POLES, value: '*' })}
          ${ui.field({ name: 'niveau', label: 'Niveau', type: 'select', options: ALL_LEVELS, value: '*' })}
        </div>
        ${ui.field({ name: 'filiere', label: 'Filière', type: 'select', options: ALL, value: '*' })}
        <button class="btn btn-primary" type="submit">${icon('plus')}Ajouter</button>
      </form>
      <div class="stack">${DAYS.map(([d, label]) => {
        const items = list.filter((c) => c.day === d).sort((a, b) => a.start.localeCompare(b.start));
        if (!items.length) return '';
        return `<div><p class="list-title">${label}</p><div class="list">${items.map((c) => `<div class="list-item"><span class="tag tone-${ui.TONES.course[c.type] || 'blue'}">${ui.esc(c.type)}</span><div class="grow"><strong>${ui.esc(c.title)}</strong><small>${D.hm(c.start)} – ${D.hm(c.end)} · ${ui.esc(db.roomText(c.room))}${c.pole && c.pole !== '*' ? ' · ' + (c.pole === 'tech' ? 'Pôle Techno.' : 'Pôle Management') : ''}${c.filiere && c.filiere !== '*' ? ' · ' + ui.esc(c.filiere) : ''}${c.niveau && c.niveau !== '*' ? ' · ' + ui.esc(c.niveau) : ''}</small></div>${delBtn('courses', c.id)}</div>`).join('')}</div></div>`;
      }).join('')}</div>
    </div>`;
  }

  function documents() {
    const list = db.all('documents');
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="document" novalidate>
        <h3>Publier un nouveau document</h3>
        ${ui.field({ name: 'title', label: 'Titre', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Rubrique', type: 'select', options: [['reglement', 'Règlement intérieur'], ['autres', 'Autres documents']], value: 'autres' })}
          ${ui.field({ name: 'version', label: 'Version', optional: true, placeholder: IST.data.academicYear })}
        </div>
        ${fileField('Fichier (PDF, Word…, 15 Mo max.)', '.pdf,.doc,.docx,.odt,.xls,.xlsx,.ppt,.pptx')}
        ${ui.field({ name: 'url', label: 'ou lien vers le document', type: 'url', optional: true, placeholder: 'https://…' })}
        <button class="btn btn-primary" type="submit">${icon('upload')}Publier</button>
      </form>
      <div class="stack">${list.map((d) => `<div class="card admin-row"><span class="ic-box sm tone-${d.category === 'reglement' ? 'blue' : 'red'}">${icon('file')}</span>
        <div class="grow"><strong>${ui.esc(d.title)}</strong><small class="muted">${d.category === 'reglement' ? 'Règlement' : 'Autres'}${d.version ? ' · ' + ui.esc(d.version) : ''} · ${d.fileId || d.dataUrl || d.url ? `${icon('check')} Fichier disponible` : 'Aucun fichier'}</small></div>
        <button class="icon-btn" data-edit-doc="${d.id}" aria-label="Modifier ${ui.esc(d.title)}">${icon('edit')}</button>${delBtn('documents', d.id)}</div>`).join('') || ui.empty('file', 'Aucun document')}</div>
    </div>`;
  }

  const fileField = (label, accept, name = 'file') => `<div class="field" data-field="${name}">
      <label>${label}</label>
      <label class="file-drop">${icon('upload')}<span data-file-name>Choisir un fichier…</span><input type="file" name="${name}" accept="${accept}"></label>
      <small class="err"></small>
    </div>`;

  /** Modifier un document existant (titre, version, remplacement du fichier). */
  function editDoc(id, ctx) {
    const doc = db.find('documents', id);
    if (!doc) return;
    const s = ui.sheet({
      title: 'Modifier le document',
      body: `<form class="admin-form" id="doc-edit" novalidate>
        ${ui.field({ name: 'title', label: 'Titre', value: doc.title })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Rubrique', type: 'select', options: [['reglement', 'Règlement intérieur'], ['autres', 'Autres documents']], value: doc.category })}
          ${ui.field({ name: 'version', label: 'Version', value: doc.version, optional: true })}
        </div>
        <div class="info-box">${icon('file')}<div><b>Fichier actuel</b>${doc.fileName ? ui.esc(doc.fileName) + (doc.size ? ' · ' + ui.esc(doc.size) : '') : doc.url ? ui.esc(doc.url) : 'Aucun fichier pour le moment'}</div></div>
        ${fileField('Remplacer par un nouveau fichier', '.pdf,.doc,.docx,.odt,.xls,.xlsx,.ppt,.pptx')}
        ${ui.field({ name: 'url', label: 'ou lien vers le document', type: 'url', value: doc.url, optional: true })}
        <label class="check"><input type="checkbox" name="notify" checked>Prévenir les étudiants de la mise à jour</label>
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="doc-edit">Enregistrer</button>`,
    });
    const f = s.el.querySelector('form');
    f.addEventListener('change', (e) => {
      if (e.target.type === 'file') f.querySelector('[data-file-name]').textContent = e.target.files[0] ? e.target.files[0].name : 'Choisir un fichier…';
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = ui.formData(f);
      if (!required(f, d, ['title'])) return;
      const file = f.querySelector('input[type=file]').files[0];
      if (file && file.size > MAX_FILE) return ui.setErr(f, 'file', 'Fichier trop lourd (15 Mo maximum).');
      const patch = { title: d.title.trim(), category: d.category, version: d.version.trim(), url: d.url.trim(), updated: D.iso(new Date()) };
      try {
        if (file) {
          const meta = await IST.files.save(file, 'doc');
          if (doc.fileId) IST.files.del(doc.fileId).catch(() => {});
          Object.assign(patch, meta, { size: ui.sizeLabel(file.size), type: (file.name.split('.').pop() || 'PDF').toUpperCase(), dataUrl: '' });
        }
      } catch (err) {
        return ui.toast("Impossible d'enregistrer le fichier.", 'error');
      }
      db.update('documents', doc.id, patch);
      if (d.notify) db.notify({ type: 'annonce', icon: 'file', title: `Document mis à jour : ${patch.title}`, body: 'Nouvelle version disponible dans Documents officiels.', link: 'documents' });
      s.close();
      ui.toast('Document mis à jour.', 'success');
      ctx.refresh();
    });
  }

  /* ---------- Identité : hymne, paroles, histoire ---------- */
  function identite() {
    const id = db.identity();
    const hymn = db.setting('hymn', null);
    return `<div class="grid-2" style="align-items:start">
      <div class="stack">
        <form class="card admin-form" data-form="hymne" novalidate>
          <h3>${icon('music')} Hymne de l'IST</h3>
          <div class="info-box">${icon(hymn ? 'checkCircle' : 'info')}<div><b>${hymn ? 'Hymne en ligne' : 'Aucun hymne importé'}</b>${hymn ? `${ui.esc(hymn.fileName)} · ${ui.sizeLabel(hymn.fileSize)}` : 'Importe le fichier audio (MP3, M4A, WAV…).'}</div></div>
          ${fileField('Fichier audio (25 Mo max.)', 'audio/*', 'audio')}
          <div class="row"><button class="btn btn-primary" type="submit">${icon('upload')}${hymn ? "Remplacer l'hymne" : "Importer l'hymne"}</button>
            ${hymn ? `<button class="btn btn-danger-outline" type="button" data-del-hymn>${icon('trash')}Retirer</button>` : ''}</div>
        </form>
        <form class="card admin-form" data-form="paroles" novalidate>
          <h3>${icon('text')} Paroles de l'hymne</h3>
          ${ui.field({ name: 'lyrics', label: 'Paroles', type: 'textarea', rows: 10, value: id.lyrics.map((st) => st.join('\n')).join('\n\n'), hint: 'Laisse une ligne vide entre deux couplets.' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer les paroles</button>
        </form>
      </div>
      <form class="card admin-form" data-form="histoire" novalidate>
        <h3>${icon('book')} Présentation de l'IST</h3>
        ${ui.field({ name: 'history', label: 'Notre histoire', type: 'textarea', rows: 9, value: id.history })}
        ${ui.field({ name: 'values', label: 'Nos valeurs', value: id.values.map((v) => v[0]).join(', '), hint: 'Séparées par des virgules (5 maximum conseillées).' })}
        <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer</button>
      </form>
    </div>`;
  }

    function utilisateurs(ctx) {
    const filter = st.roleFilter || 'all';
    const us = auth.users().filter((u) => filter === 'all' || u.role === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const roles = Object.entries(cfg.roles);
    const detail = (u) => (u.role === 'etudiant'
      ? `${ui.esc(u.filiere || '—')} · ${ui.esc(u.niveau || '—')}`
      : [u.chefFiliere ? 'Chef ' + ui.esc((IST.school.find(u.chefFiliere) || {}).code || '') : '', (u.classes || []).join(', '), ui.esc(u.fonction || '')].filter(Boolean).join(' · ') || '—');
    return `
      <div class="chips" style="margin-bottom:14px">${[['all', 'Tous'], ...roles].map(([v, l]) => `<button type="button" class="chip ${v === filter ? 'active' : ''}" data-role-filter="${v}">${l} (${v === 'all' ? auth.users().length : auth.users().filter((u) => u.role === v).length})</button>`).join('')}</div>
      <div class="table-wrap"><table>
      <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Filière / classes</th><th>Inscription</th><th></th></tr></thead>
      <tbody>${us.map((u) => `<tr>
        <td><div class="row">${ui.avatar(u, 30)}${ui.esc(ui.displayName(u))}</div></td>
        <td>${ui.esc(u.email)}</td>
        <td><select class="mini-select" data-set-role="${u.id}" ${u.id === ctx.user.id ? 'disabled' : ''} aria-label="Rôle de ${ui.esc(u.prenom)}">${roles.map(([v, l]) => `<option value="${v}" ${v === u.role ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td style="white-space:normal;max-width:280px">${detail(u)}</td>
        <td>${D.fmt(u.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td>${u.id === ctx.user.id ? '' : `<button class="icon-btn" data-del-user="${u.id}" aria-label="Supprimer le compte">${icon('trash')}</button>`}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="muted small mt">Les membres du personnel créent leur compte avec le code d'accès du personnel. Tu peux corriger leur rôle ici.</p>`;
  }

    /* ---------- Enregistrement des formulaires ---------- */
  function required(f, d, names) {
    let ok = true;
    names.forEach((n) => {
      const bad = !String(d[n] || '').trim();
      ui.setErr(f, n, bad ? 'Champ obligatoire.' : '');
      if (bad) ok = false;
    });
    return ok;
  }

  async function submit(kind, f) {
    const d = ui.formData(f);
    if (kind === 'annonce') {
      if (!required(f, d, ['title', 'body'])) return false;
      const a = db.add('announcements', { title: d.title.trim(), body: d.body.trim(), category: d.category, filiere: d.filiere, author: d.author.trim() || 'Administration', pinned: !!d.pinned, date: new Date().toISOString() });
      if (!a) return false;
      db.notify({ type: d.category === 'Urgent' ? 'cours' : 'annonce', icon: 'megaphone', title: a.title, body: a.body.slice(0, 90), link: 'actualites/' + a.id });
      ui.toast('Annonce publiée.', 'success');
    } else if (kind === 'evenement') {
      if (!required(f, d, ['title', 'date', 'place'])) return false;
      if (d.endDate && d.endDate < d.date) { ui.setErr(f, 'endDate', 'La date de fin doit suivre la date de début.'); return false; }
      const ev = db.add('events', { title: d.title.trim(), category: d.category, type: d.type, date: d.date, endDate: d.endDate || '', time: d.time, place: d.place.trim(), organizer: d.organizer.trim(), description: d.description.trim() });
      if (!ev) return false;
      db.notify({ type: 'evenement', icon: 'calendar', title: `Nouvel événement : ${ev.title}`, body: `${D.fmt(ev.date, { day: 'numeric', month: 'long' })} · ${ev.place}`, link: 'agenda' });
      ui.toast('Événement ajouté.', 'success');
    } else if (kind === 'cours') {
      if (!required(f, d, ['title', 'room', 'start', 'end'])) return false;
      if (d.end <= d.start) { ui.setErr(f, 'end', "L'heure de fin doit suivre l'heure de début."); return false; }
      db.add('courses', { title: d.title.trim(), day: +d.day, type: d.type, start: d.start, end: d.end, room: d.room.trim(), teacher: d.teacher.trim(), pole: d.pole, filiere: d.filiere, niveau: d.niveau });
      ui.toast("Séance ajoutée à l'emploi du temps.", 'success');
    } else if (kind === 'document') {
      if (!required(f, d, ['title'])) return false;
      const file = f.querySelector('input[type=file]').files[0];
      if (!file && !d.url.trim()) { ui.setErr(f, 'file', 'Ajoute un fichier ou un lien.'); return false; }
      if (file && file.size > MAX_FILE) { ui.setErr(f, 'file', 'Fichier trop lourd (15 Mo maximum).'); return false; }
      const doc = { title: d.title.trim(), category: d.category, version: d.version.trim(), type: 'PDF', url: d.url.trim(), updated: D.iso(new Date()), size: '' };
      if (file) Object.assign(doc, await IST.files.save(file, 'doc'), { size: ui.sizeLabel(file.size), type: (file.name.split('.').pop() || 'PDF').toUpperCase() });
      if (!db.add('documents', doc)) return false;
      db.notify({ type: 'annonce', icon: 'file', title: `Nouveau document : ${doc.title}`, body: 'Disponible dans Documents officiels.', link: 'documents' });
      ui.toast('Document publié.', 'success');
    } else if (kind === 'hymne') {
      const file = f.querySelector('input[type=file]').files[0];
      if (!file) { ui.setErr(f, 'audio', 'Choisis un fichier audio.'); return false; }
      if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|ogg|aac)$/i.test(file.name)) { ui.setErr(f, 'audio', "Ce fichier n'est pas un fichier audio."); return false; }
      if (file.size > MAX_AUDIO) { ui.setErr(f, 'audio', 'Fichier trop lourd (25 Mo maximum).'); return false; }
      const old = db.setting('hymn', null);
      const meta = await IST.files.save(file, 'hymn');
      if (old && old.fileId) IST.files.del(old.fileId).catch(() => {});
      db.setSetting('hymn', meta);
      IST.identityPlayer && IST.identityPlayer.reset();
      ui.toast("Hymne importé. Il est disponible dans Identité de l'IST.", 'success');
    } else if (kind === 'paroles') {
      const stanzas = d.lyrics.split(/\n\s*\n/).map((x) => x.split('\n').map((l) => l.trim()).filter(Boolean)).filter((x) => x.length);
      if (!stanzas.length) { ui.setErr(f, 'lyrics', 'Saisis les paroles.'); return false; }
      db.setSetting('identity', { ...db.setting('identity', {}), lyrics: stanzas });
      ui.toast('Paroles enregistrées.', 'success');
    } else if (kind === 'histoire') {
      if (!required(f, d, ['history'])) return false;
      const palette = [['award', 'blue'], ['target', 'purple'], ['lightbulb', 'orange'], ['handshake', 'green'], ['shield', 'teal'], ['star', 'pink']];
      const values = d.values.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 6).map((v, i) => [v, ...palette[i]]);
      db.setSetting('identity', { ...db.setting('identity', {}), history: d.history.trim(), ...(values.length ? { values } : {}) });
      ui.toast('Présentation enregistrée.', 'success');
    }
    await db.flushRemote();
    return true;
  }

  IST.pages.admin = {
    title: 'Administration',
    subtitle: 'Gérer les contenus et les comptes de Campus+',
    admin: true,
    render(ctx) {
      const tabs = [['apercu', 'Aperçu'], ['annonces', 'Annonces'], ['evenements', 'Événements'], ['cours', 'Emploi du temps'], ['documents', 'Documents'], ['identite', "Identité & hymne"], ['utilisateurs', 'Comptes']];
      const body = { apercu: overview, annonces, evenements, cours, documents, identite, utilisateurs }[st.tab](ctx);
      return `<div class="page-tabs">${ui.seg(tabs, st.tab, 'tab')}</div>${body}`;
    },
    mount(el, ctx) {
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tab], [data-del], [data-edit-doc], [data-role-filter], [data-del-user], [data-del-hymn]');
        if (!t) return;
        if (t.dataset.tab) { st.tab = t.dataset.tab; return ctx.refresh(); }
        if (t.dataset.editDoc) return editDoc(t.dataset.editDoc, ctx);
        if (t.dataset.roleFilter) { st.roleFilter = t.dataset.roleFilter; return ctx.refresh(); }
        if (t.dataset.delUser) {
          const u = auth.users().find((x) => x.id === t.dataset.delUser);
          if (!u || !(await ui.confirm(`Supprimer le compte de ${ui.displayName(u)} ?`, { ok: 'Supprimer', danger: true }))) return;
          auth.saveUsers(auth.users().filter((x) => x.id !== u.id));
          ui.toast('Compte supprimé.', 'success');
          return ctx.refresh();
        }
        if (t.hasAttribute('data-del-hymn')) {
          if (!(await ui.confirm("Retirer l'hymne de l'application ?", { ok: 'Retirer', danger: true }))) return;
          const h = db.setting('hymn', null);
          if (h) IST.files.del(h.fileId).catch(() => {});
          db.setSetting('hymn', null);
          IST.identityPlayer && IST.identityPlayer.reset();
          return ctx.refresh();
        }
        const [coll, id] = t.dataset.del.split(':');
        const item = db.find(coll, id);
        if (item && item.fileId) IST.files.del(item.fileId).catch(() => {});
        if (!(await ui.confirm('Supprimer définitivement cet élément ?', { ok: 'Supprimer', danger: true }))) return;
        db.remove(coll, id);
        await db.flushRemote();
        ui.toast('Élément supprimé.', 'success');
        ctx.refresh();
      });
      el.addEventListener('change', (e) => {
        if (e.target.dataset.setRole) {
          auth.update(e.target.dataset.setRole, { role: e.target.value });
          ui.toast('Rôle mis à jour.', 'success');
          return ctx.refresh();
        }
        if (e.target.type === 'file') {
          const file = e.target.files[0];
          e.target.closest('.field').querySelector('[data-file-name]').textContent = file ? `${file.name} (${ui.sizeLabel(file.size)})` : 'Choisir un fichier…';
          ui.setErr(e.target.form, e.target.name, '');
        }
      });
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const btn = f.querySelector('[type=submit]');
        ui.busy(btn, true);
        let ok = false;
        try {
          ok = await submit(f.dataset.form, f);
        } catch (err) {
          ui.toast(err.message || "Impossible d'enregistrer les données.", 'error');
        }
        ui.busy(btn, false);
        if (ok) ctx.refreshShell();
      });
    },
  };
})();
