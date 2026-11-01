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
        <div class="field" data-field="image">
          <label>Illustration (Photo, affiche… redimensionnée automatiquement)</label>
          <label class="file-drop">${icon('image')}<span data-file-name>Choisir une image (JPG, PNG, WebP)…</span><input type="file" name="image" accept="image/*"></label>
          <div data-preview style="margin-top:8px;display:none;max-height:160px;overflow:hidden;border-radius:8px;"></div>
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

  /* ---------- Gestion des Programmes des UE ---------- */
  function programmesTab() {
    const list = db.all('programmes');
    return `<div class="grid-2" style="align-items:start">
      <form class="card admin-form" data-form="programme" novalidate>
        <h3>Ajouter une Unité d'Enseignement (UE)</h3>
        <div class="form-row">
          ${ui.field({ name: 'code', label: "Code de l'UE", placeholder: 'Ex. UE 101, UE 203…', required: true })}
          ${ui.field({ name: 'semestre', label: 'Semestre', type: 'select', options: ['Semestre 1', 'Semestre 2', 'Semestre 3', 'Semestre 4', 'Semestre 5', 'Semestre 6'], value: 'Semestre 1' })}
        </div>
        ${ui.field({ name: 'title', label: "Intitulé de la matière / UE", placeholder: 'Ex. Systèmes Distribués & Cloud', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'pole', label: 'Pôle académique', type: 'select', options: [['tech', 'Pôle Technologique'], ['management', 'Pôle Management'], ['*', 'Commun aux deux pôles']], value: 'tech' })}
          ${ui.field({ name: 'credits', label: 'Crédits ECTS', type: 'number', value: '5', required: true })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'hours', label: 'Volume horaire (heures)', type: 'number', value: '48', required: true })}
          ${ui.field({ name: 'teacher', label: 'Enseignant responsable', placeholder: 'Ex. Dr Moussavou, M. Ndong…', required: true })}
        </div>
        ${ui.field({ name: 'description', label: 'Objectifs et programme détaillé', type: 'textarea', rows: 4, placeholder: 'Compétences visées, chapitres du cours, modalités d\'évaluation…', required: true })}
        <button class="btn btn-primary" type="submit">${icon('plus')}Enregistrer l'UE</button>
      </form>
      <div class="stack">
        <div class="stat-row" style="margin-bottom:12px;">
          <div class="stat"><b>${list.length}</b><small>Total UE enregistrées</small></div>
          <div class="stat"><b>${list.reduce((acc, u) => acc + (+u.credits || 0), 0)}</b><small>Total crédits</small></div>
          <div class="stat"><b>${list.reduce((acc, u) => acc + (+u.hours || 0), 0)} h</b><small>Volume global</small></div>
        </div>
        ${list.map((u) => `
          <div class="card admin-row">
            <span class="ic-box sm tone-${u.pole === 'management' ? 'orange' : 'blue'}">${icon('book')}</span>
            <div class="grow">
              <strong>${ui.esc(u.code)} · ${ui.esc(u.title)}</strong>
              <small class="muted">${ui.esc(u.semestre)} · ${u.credits} crédits · ${u.hours} h · ${ui.esc(u.teacher)} · ${u.pole === 'management' ? 'Pôle Management' : u.pole === 'tech' ? 'Pôle Techno.' : 'Tous pôles'}</small>
            </div>
            ${delBtn('programmes', u.id)}
          </div>`).join('') || ui.empty('book', 'Aucune UE enregistrée')}
      </div>
    </div>`;
  }

  /* ---------- Gestion des Services du Campus ---------- */
  function servicesTab() {
    const s = db.services();
    const r = s.restaurant || {};
    const inf = s.infirmerie || {};
    const bib = s.bibliotheque || {};
    const sp = s.sport || {};
    const sout = s.soutien || {};
    const urgText = (s.urgences || []).map(([k, v]) => `${k} : ${v}`).join('\n');

    const menuLines = Object.entries(r.menu || {}).map(([d, items]) => `${d}:${items.join(', ')}`).join('\n');
    const pricesLines = (r.prices || []).map(([k, v]) => `${k} : ${v}`).join('\n');
    const restoHours = (r.hours || []).map(([k, v]) => `${k} : ${v}`).join('\n');
    const infHours = (inf.hours || []).map(([k, v]) => `${k} : ${v}`).join('\n');
    const bibHours = (bib.hours || []).map(([k, v]) => `${k} : ${v}`).join('\n');
    const sportHours = (sp.hours || []).map(([k, v]) => `${k} : ${v}`).join('\n');

    return `<div class="grid-2" style="align-items:start">
      <div class="stack">
        <form class="card admin-form" data-form="service-urgences" novalidate>
          <h3>${icon('alert')} Numéros d'urgence du campus</h3>
          <p class="text-2 muted small">Apparaissent dans la carte d'urgence avec appel direct pour tous les étudiants.</p>
          ${ui.field({ name: 'urgences', label: 'Numéros (un par ligne au format Nom : Numéro)', type: 'textarea', rows: 6, value: urgText, hint: 'Exemple :\nInfirmerie du campus : +241 01 76 34 50\nSAMU : 1300\nPompiers : 18\nPolice : 1730\nSécurité campus : +241 07 00 00 00' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer les Numéros d'urgence</button>
        </form>

        <form class="card admin-form" data-form="service-resto" novalidate>
          <h3>${icon('utensils')} Restaurant & Cafétéria Universitaire</h3>
          <div class="form-row">
            ${ui.field({ name: 'location', label: 'Localisation', value: r.location || 'Restaurant du campus' })}
            ${ui.field({ name: 'phone', label: 'Téléphone / Contact', value: r.phone || '', optional: true, placeholder: '+241 01 00 00 00' })}
          </div>
          ${ui.field({ name: 'hours', label: 'Horaires du restaurant', type: 'textarea', rows: 3, value: restoHours, hint: 'Format : Jour : Plage horaire' })}
          ${ui.field({ name: 'prices', label: 'Tarifs des repas & snacks', type: 'textarea', rows: 3, value: pricesLines, hint: 'Format : Plat du jour : 1 000 FCFA' })}
          ${ui.field({ name: 'menus', label: 'Menus de la semaine (1=Lun ... 6=Sam)', type: 'textarea', rows: 5, value: menuLines, hint: 'Format : 1:Plat 1, Plat 2, Fruit' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer le Restaurant</button>
        </form>
      </div>

      <div class="stack">
        <form class="card admin-form" data-form="service-sante" novalidate>
          <h3>${icon('medical')} Infirmerie & Soutien Psychologique</h3>
          <strong style="font-size:14px;color:var(--primary,#0A4EA3);display:block;margin-top:6px;">Infirmerie :</strong>
          <div class="form-row">
            ${ui.field({ name: 'inf_phone', label: 'Téléphone de l\'infirmerie', value: inf.phone || '+241 00 00 00 00' })}
            ${ui.field({ name: 'inf_location', label: 'Localisation', value: inf.location || 'Campus IST' })}
          </div>
          ${ui.field({ name: 'inf_hours', label: 'Horaires de l\'infirmerie', type: 'textarea', rows: 2, value: infHours, hint: 'Format : Lundi – Vendredi : 7h30 – 17h00' })}
          ${ui.field({ name: 'inf_desc', label: 'Description des soins', type: 'textarea', rows: 2, value: inf.description || '' })}

          <strong style="font-size:14px;color:var(--primary,#0A4EA3);display:block;margin-top:14px;">Soutien psychologique :</strong>
          <div class="form-row">
            ${ui.field({ name: 'sout_phone', label: 'Téléphone soutien', value: sout.phone || '+241 00 00 00 00' })}
            ${ui.field({ name: 'sout_location', label: 'Localisation', value: sout.location || 'Campus IST' })}
          </div>
          ${ui.field({ name: 'sout_hours', label: 'Permanences soutien', value: (sout.hours && sout.hours[0] ? sout.hours[0].join(' : ') : 'Mardi et jeudi : 9h00 – 16h00') })}
          ${ui.field({ name: 'sout_desc', label: 'Description', type: 'textarea', rows: 2, value: sout.description || '' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer Pôle Santé</button>
        </form>

        <form class="card admin-form" data-form="service-culture" novalidate>
          <h3>${icon('library')} Bibliothèque & Complexe Sportif</h3>
          <strong style="font-size:14px;color:var(--primary,#0A4EA3);display:block;margin-top:6px;">Bibliothèque Universitaire :</strong>
          <div class="form-row">
            ${ui.field({ name: 'bib_phone', label: 'Téléphone / Contact', value: bib.phone || '', optional: true })}
            ${ui.field({ name: 'bib_location', label: 'Localisation', value: bib.location || 'Bibliothèque centrale' })}
          </div>
          ${ui.field({ name: 'bib_hours', label: 'Horaires d\'ouverture', type: 'textarea', rows: 2, value: bibHours, hint: 'Format : Lundi – Vendredi : 7h30 – 18h00' })}
          ${ui.field({ name: 'bib_desc', label: 'Description des ressources', type: 'textarea', rows: 2, value: bib.description || '' })}

          <strong style="font-size:14px;color:var(--primary,#0A4EA3);display:block;margin-top:14px;">Complexe Sportif :</strong>
          <div class="form-row">
            ${ui.field({ name: 'sport_phone', label: 'Contact responsable', value: sp.phone || '', optional: true })}
            ${ui.field({ name: 'sport_location', label: 'Localisation', value: sp.location || 'Terrain de sport' })}
          </div>
          ${ui.field({ name: 'sport_hours', label: 'Horaires d\'accès', type: 'textarea', rows: 2, value: sportHours, hint: 'Format : Lundi – Vendredi : 16h00 – 19h00' })}
          ${ui.field({ name: 'sport_desc', label: 'Description des infrastructures', type: 'textarea', rows: 2, value: sp.description || '' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer Bibliothèque & Sport</button>
        </form>
      </div>
    </div>`;
  }

  /* ---------- Identité : hymne, paroles, coordonnées, histoire ---------- */
  function identite() {
    const id = db.identity();
    const hymn = db.setting('hymn', null);
    const phone = id.phone || cfg.phone;
    const fax = id.fax || cfg.fax;
    const address = id.address || cfg.address;
    const postalBox = id.postalBox || cfg.postalBox;
    const motto = id.motto || "Plus qu'une école, une famille !";
    const dirText = (id.directory || []).map(([n, r]) => `${n} : ${r}`).join('\n');

    return `<div class="grid-2" style="align-items:start">
      <div class="stack">
        <form class="card admin-form" data-form="contact-ist" novalidate>
          <h3>${icon('phone')} Coordonnées & Devise officielles</h3>
          <div class="form-row">
            ${ui.field({ name: 'phone', label: 'Téléphone standard', value: phone, required: true })}
            ${ui.field({ name: 'fax', label: 'Télécopie / Fax', value: fax, optional: true })}
          </div>
          <div class="form-row">
            ${ui.field({ name: 'address', label: 'Adresse physique', value: address, required: true })}
            ${ui.field({ name: 'postalBox', label: 'Boîte postale', value: postalBox, required: true })}
          </div>
          ${ui.field({ name: 'motto', label: 'Devise / Slogan officiel', value: motto, required: true })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer Coordonnées</button>
        </form>

        <form class="card admin-form" data-form="annuaire-ist" novalidate>
          <h3>${icon('building')} Annuaire des services de l'IST</h3>
          ${ui.field({ name: 'directory', label: 'Services et rôles (un par ligne : Nom : Rôle ou téléphone)', type: 'textarea', rows: 6, value: dirText })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer l'Annuaire</button>
        </form>

        <form class="card admin-form" data-form="histoire" novalidate>
          <h3>${icon('book')} Présentation & Histoire de l'IST</h3>
          ${ui.field({ name: 'history', label: 'Notre histoire', type: 'textarea', rows: 8, value: id.history })}
          ${ui.field({ name: 'values', label: 'Nos valeurs', value: (id.values || []).map((v) => v[0]).join(', '), hint: 'Séparées par des virgules (5 maximum conseillées).' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer Présentation</button>
        </form>
      </div>

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
          ${ui.field({ name: 'lyrics', label: 'Paroles', type: 'textarea', rows: 12, value: id.lyrics.map((st) => st.join('\n')).join('\n\n'), hint: 'Laisse une ligne vide entre deux couplets.' })}
          <button class="btn btn-primary" type="submit">${icon('check')}Enregistrer les paroles</button>
        </form>
      </div>
    </div>`;
  }

  function generateStaffCode(role) {
    const pfxMap = {
      admin: 'ADM',
      communication: 'COM',
      chef: 'CHF',
      enseignant: 'ENS',
      staff: 'STF',
    };
    const pfx = pfxMap[role] || 'STF';
    const num = Math.floor(1000 + Math.random() * 9000);
    return `IST-${pfx}-${num}`;
  }

  function showAccessSlip(user, plainPassword) {
    const s = ui.sheet({
      title: 'Fiche d’accès du personnel',
      body: `<div class="stack-lg">
        <div class="info-box tone-green">${icon('checkCircle')}<div><b>Membre du personnel inscrit avec succès !</b>Transmettez-lui ces identifiants pour qu'il puisse se connecter à son espace dédié.</div></div>
        <div class="card" style="background:var(--surface-variant,#f8fafc);padding:18px;border-radius:12px;border:1px solid var(--border,#cbd5e1);">
          <div style="margin-bottom:12px;"><strong>${ui.esc(ui.displayName(user))}</strong><span class="badge tone-blue" style="margin-left:8px;">${ui.esc(user.fonction || ui.roleLabel(user))}</span></div>
          <div class="stack" style="gap:8px;font-size:14px;">
            <div><small class="muted" style="display:block;">Adresse email :</small><code>${ui.esc(user.email)}</code></div>
            <div><small class="muted" style="display:block;">Code d'accès personnel :</small><strong style="font-size:16px;color:var(--primary,#0A4EA3);letter-spacing:1px;"><code>${ui.esc(user.staffCode)}</code></strong></div>
            <div><small class="muted" style="display:block;">Mot de passe temporaire :</small><code>${ui.esc(plainPassword || 'Déjà défini')}</code></div>
            <div><small class="muted" style="display:block;">Espace de travail attribué :</small><b>${ui.esc(ui.roleLabel(user))} (${ui.esc(user.fonction || 'Membre du personnel')})</b></div>
          </div>
        </div>
        <p class="muted small">Le collaborateur peut se connecter sur Campus+ soit avec son adresse email, soit directement avec son <strong>Code d'accès personnel</strong>.</p>
      </div>`,
      footer: `<button class="btn btn-primary btn-block" data-copy-slip>${icon('copy')}Copier la fiche complète</button>`,
    });

    s.el.querySelector('[data-copy-slip]').addEventListener('click', () => {
      const text = `=== CAMPUS+ IST · IDENTIFIANTS DU PERSONNEL ===\n` +
        `Nom : ${ui.displayName(user)}\n` +
        `Poste : ${user.fonction || ui.roleLabel(user)}\n` +
        `Email : ${user.email}\n` +
        `Code d'accès personnel : ${user.staffCode}\n` +
        `Mot de passe : ${plainPassword || '(personnel)'}\n` +
        `Accès direct : https://morel-stone15.github.io/Campus-IST/#/login\n` +
        `================================================`;
      navigator.clipboard.writeText(text).then(() => {
        ui.toast('Identifiants copiés dans le presse-papier !', 'success');
      }).catch(() => {
        ui.toast('Texte prêt à être copié.', 'info');
      });
    });
  }

  function registerStaffModal(ctx) {
    const roles = [
      ['enseignant', 'Enseignant / Professeur'],
      ['communication', 'Service Communication (Événements & Annonces)'],
      ['chef', 'Chef de filière'],
      ['admin', 'Administration générale / Direction'],
      ['staff', 'Personnel administratif & technique'],
    ];
    const initialRole = 'enseignant';
    const initialCode = generateStaffCode(initialRole);
    const initialPw = `IstPass${Math.floor(100 + Math.random() * 900)}!`;

    const s = ui.sheet({
      title: 'Inscrire un membre du personnel',
      body: `<form class="admin-form stack-lg" id="staff-reg-form" novalidate>
        <div class="form-row">
          ${ui.field({ name: 'civilite', label: 'Civilité', type: 'select', options: ['M.', 'Mme', 'Dr', 'Pr'], value: 'M.' })}
          ${ui.field({ name: 'role', label: 'Rôle & Espace dédié', type: 'select', options: roles, value: initialRole })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'prenom', label: 'Prénom', placeholder: 'Ex. Alexandre', required: true })}
          ${ui.field({ name: 'nom', label: 'Nom', placeholder: 'Ex. MOUSSAVOU', required: true })}
        </div>
        ${ui.field({ name: 'email', label: 'Adresse email professionnelle', type: 'email', placeholder: 'a.moussavou@ist.ga', required: true })}
        ${ui.field({ name: 'fonction', label: 'Poste ou Fonction exacte', placeholder: 'Ex. Enseignant en Réseaux, Responsable Communication, Directeur des Études...', required: true })}
        
        <div class="form-row" id="staff-chef-wrap" hidden>
          ${ui.field({ name: 'chefFiliere', label: 'Filière sous sa responsabilité', type: 'select', options: IST.school.filiereOptions() })}
        </div>

        <div style="background:var(--surface-variant,#f8fafc);padding:14px;border-radius:12px;border:1px solid var(--border,#cbd5e1);">
          <strong style="font-size:13px;display:block;margin-bottom:8px;">Identifiants d'accès attribués :</strong>
          <div class="form-row">
            ${ui.field({ name: 'staffCode', label: "Code d'accès personnel", value: initialCode, required: true, hint: 'Code unique permettant la connexion directe du membre' })}
            ${ui.field({ name: 'password', label: 'Mot de passe temporaire', value: initialPw, required: true, hint: 'Pourra être modifié par le collaborateur' })}
          </div>
        </div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="staff-reg-form">${icon('user')}Créer le compte et le code d'accès</button>`,
    });

    const f = s.el.querySelector('#staff-reg-form');
    const roleSelect = f.querySelector('select[name=role]');
    const chefWrap = f.querySelector('#staff-chef-wrap');
    const codeInput = f.querySelector('input[name=staffCode]');

    roleSelect.addEventListener('change', () => {
      const r = roleSelect.value;
      chefWrap.hidden = r !== 'chef';
      codeInput.value = generateStaffCode(r);
    });

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = ui.formData(f);
      ui.setErr(f, 'prenom', d.prenom.trim() ? '' : 'Indiquez le prénom.');
      ui.setErr(f, 'nom', d.nom.trim() ? '' : 'Indiquez le nom.');
      ui.setErr(f, 'email', d.email.trim() ? '' : 'Indiquez l\'adresse email.');
      ui.setErr(f, 'fonction', d.fonction.trim() ? '' : 'Indiquez la fonction ou le poste.');
      ui.setErr(f, 'staffCode', d.staffCode.trim() ? '' : 'Le code d\'accès est requis.');
      if (!d.prenom.trim() || !d.nom.trim() || !d.email.trim() || !d.fonction.trim() || !d.staffCode.trim()) return;

      const email = d.email.trim().toLowerCase();
      const existing = auth.findByEmail(email);
      if (existing) return ui.setErr(f, 'email', 'Un utilisateur existe déjà avec cet email.');

      const codeUpper = d.staffCode.trim().toUpperCase();
      const existingCode = auth.findByStaffCode(codeUpper);
      if (existingCode) return ui.setErr(f, 'staffCode', 'Ce code d\'accès est déjà attribué à un autre membre.');

      const btn = s.el.querySelector('button[type=submit]');
      ui.busy(btn, true);

      const plainPassword = d.password.trim() || initialPw;

      const newUser = {
        id: db.uid(),
        civilite: d.civilite || 'M.',
        prenom: d.prenom.trim(),
        nom: d.nom.trim(),
        email,
        role: d.role || 'staff',
        fonction: d.fonction.trim(),
        staffCode: codeUpper,
        chefFiliere: d.role === 'chef' ? d.chefFiliere : '',
        classes: [],
        filiere: '',
        niveau: '',
        phone: '',
        password: await IST.hash(email + '|' + plainPassword),
        createdAt: new Date().toISOString(),
        readNotifs: [],
        events: [],
        prefs: { notifs: { cours: true, annonce: true, evenement: true, system: true } },
      };

      // Si l'API est connectée, inscrire également dans la base de données backend
      if (window.IST.api && window.IST.api.auth && location.protocol !== 'file:') {
        try {
          const apiRoleMap = {
            admin: 'admin',
            communication: 'staff',
            chef: 'teacher',
            enseignant: 'teacher',
            staff: 'staff',
          };
          await window.IST.api.auth.register({
            email,
            username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `staff_${Date.now()}`,
            password: plainPassword,
            first_name: newUser.prenom,
            last_name: newUser.nom,
            role: apiRoleMap[newUser.role] || 'staff',
            employee_number: codeUpper,
            specialty: newUser.fonction,
          });
        } catch (apiErr) {
          console.warn('API staff registration note:', apiErr);
        }
      }

      const allUsers = auth.users();
      allUsers.push(newUser);
      auth.saveUsers(allUsers);

      db.notify({
        to: newUser.id,
        type: 'system',
        icon: 'key',
        link: 'profil',
        title: `🔑 Votre code d'accès personnel : ${codeUpper}`,
        body: `Bienvenue à l'IST ! L'administration a créé votre compte. Votre code d'accès aléatoire et unique est : ${codeUpper}. Utilisez-le pour vous connecter directement à votre espace de travail.`,
      });
      if (IST.pwaNotification && IST.pwaNotification.isSupported()) {
        try {
          IST.pwaNotification.send(
            "🔑 Code d'accès IST attribué",
            `Votre code d'accès personnel : ${codeUpper}. Utilisez-le pour vous connecter.`,
            'notifications'
          );
        } catch (_) {}
      }

      ui.busy(btn, false);
      s.close();

      ui.toast(`Membre du personnel ${newUser.prenom} ${newUser.nom} inscrit !`, 'success');
      ctx.refresh();

      setTimeout(() => {
        showAccessSlip(newUser, plainPassword);
      }, 350);
    });
  }

  function utilisateurs(ctx) {
    const filter = st.roleFilter || 'all';
    const us = auth.users().filter((u) => filter === 'all' || u.role === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const roles = Object.entries(cfg.roles);
    const detail = (u) => (u.role === 'etudiant'
      ? `${ui.esc(u.filiere || '—')} · ${ui.esc(u.niveau || '—')}`
      : [u.chefFiliere ? 'Chef ' + ui.esc((IST.school.find(u.chefFiliere) || {}).code || '') : '', (u.classes || []).join(', '), ui.esc(u.fonction || '')].filter(Boolean).join(' · ') || '—');

    return `
      <div class="row-between mb" style="flex-wrap:wrap;gap:12px;background:var(--surface,#fff);padding:14px 18px;border-radius:14px;border:1px solid var(--border,#e2e8f0);">
        <div>
          <h3 style="margin:0 0 4px 0;">Membres du personnel & Utilisateurs</h3>
          <p class="muted small" style="margin:0;">Inscrivez les collaborateurs, attribuez-leur un rôle/poste et générez leur code d'accès personnel.</p>
        </div>
        <button class="btn btn-primary" data-add-staff>${icon('plus')}Inscrire un membre du personnel</button>
      </div>

      <div class="chips" style="margin-bottom:14px">${[['all', 'Tous'], ...roles].map(([v, l]) => `<button type="button" class="chip ${v === filter ? 'active' : ''}" data-role-filter="${v}">${l} (${v === 'all' ? auth.users().length : auth.users().filter((u) => u.role === v).length})</button>`).join('')}</div>
      <div class="table-wrap"><table>
      <thead><tr><th>Nom</th><th>Email</th><th>Poste / Rôle</th><th>Code d'accès personnel</th><th>Filière / classes</th><th>Date</th><th></th></tr></thead>
      <tbody>${us.map((u) => `<tr>
        <td><div class="row">${ui.avatar(u, 30)}${ui.esc(ui.displayName(u))}</div></td>
        <td>${ui.esc(u.email)}</td>
        <td>
          <div style="font-size:12px;font-weight:600;margin-bottom:2px;">${ui.esc(u.fonction || ui.roleLabel(u))}</div>
          <select class="mini-select" data-set-role="${u.id}" ${u.id === ctx.user.id ? 'disabled' : ''} aria-label="Rôle de ${ui.esc(u.prenom)}">${roles.map(([v, l]) => `<option value="${v}" ${v === u.role ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </td>
        <td>
          ${u.staffCode ? `<span style="display:inline-flex;align-items:center;gap:6px;"><code style="font-size:12px;font-weight:700;color:var(--primary,#0A4EA3);background:#eff6ff;padding:3px 8px;border-radius:6px;border:1px solid #bfdbfe;">${ui.esc(u.staffCode)}</code><button class="icon-btn sm" data-copy-text="${ui.esc(u.staffCode)}" title="Copier le code d'accès">${icon('copy')}</button></span>`
            : (u.role !== 'etudiant' ? `<button class="btn btn-soft btn-xs" data-gen-code="${u.id}">${icon('key')}Créer code</button>` : '<small class="muted">Étudiant</small>')}
        </td>
        <td style="white-space:normal;max-width:240px">${detail(u)}</td>
        <td>${D.fmt(u.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td>${u.id === ctx.user.id ? '' : `<button class="icon-btn" data-del-user="${u.id}" aria-label="Supprimer le compte" title="Supprimer">${icon('trash')}</button>`}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="muted small mt">Les membres du personnel peuvent se connecter avec leur adresse email OU directement avec leur code d'accès personnel.</p>`;
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
      let imgData = '';
      const imgInput = f.querySelector('input[type=file][name=image]');
      if (imgInput && imgInput.files[0]) {
        try {
          imgData = await ui.resizeImage(imgInput.files[0], 900, 600, 0.85);
        } catch (e) {
          console.warn('Auto resize error:', e);
        }
      }
      const a = db.add('announcements', {
        title: d.title.trim(),
        body: d.body.trim(),
        category: d.category,
        filiere: d.filiere,
        image: imgData,
        author: d.author.trim() || 'Administration',
        pinned: !!d.pinned,
        date: new Date().toISOString()
      });
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
      const newCourse = db.add('courses', { title: d.title.trim(), day: +d.day, type: d.type, start: d.start, end: d.end, room: d.room.trim(), teacher: d.teacher.trim(), pole: d.pole, filiere: d.filiere, niveau: d.niveau });
      
      // Notifier immédiatement les étudiants de la classe ou de la filière avec repérage sur le plan
      const targetLabel = [d.filiere !== '*' ? d.filiere : '', d.niveau !== '*' ? d.niveau : ''].filter(Boolean).join(' ') || 'Toutes les classes';
      const roomNotice = db.roomText(d.room.trim());
      db.notify({
        type: 'cours',
        icon: 'calendar',
        filiere: d.filiere,
        niveau: d.niveau,
        title: `📅 Nouvel emploi du temps : ${d.title.trim()}`,
        body: `Séance programmée (${d.type}) de ${D.hm(d.start)} à ${D.hm(d.end)}. Salle indiquée : ${roomNotice}. Clique pour localiser la salle sur le plan !`,
        link: 'plan/' + encodeURIComponent(d.room.trim()),
      });
      ui.toast(`Séance ajoutée et étudiants de [${targetLabel}] notifiés avec signalement de la salle !`, 'success');
    } else if (kind === 'programme') {
      if (!required(f, d, ['code', 'title', 'credits', 'hours', 'teacher', 'description'])) return false;
      db.add('programmes', {
        code: d.code.trim().toUpperCase(),
        semestre: d.semestre,
        title: d.title.trim(),
        pole: d.pole,
        credits: +d.credits || 1,
        hours: +d.hours || 1,
        teacher: d.teacher.trim(),
        description: d.description.trim(),
      });
      ui.toast("Unité d'enseignement (UE) enregistrée avec succès !", 'success');
    } else if (kind === 'service-urgences') {
      const cur = db.services();
      const lines = d.urgences.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsed = lines.map((l) => {
        const parts = l.split(':');
        const name = parts[0].trim();
        const num = parts.slice(1).join(':').trim();
        let ic = 'phone';
        const lower = name.toLowerCase();
        if (lower.includes('samu') || lower.includes('santé') || lower.includes('médic')) ic = 'heart';
        else if (lower.includes('pompier') || lower.includes('secours') || lower.includes('urgence')) ic = 'alert';
        else if (lower.includes('police') || lower.includes('sécurité') || lower.includes('gardien')) ic = 'shield';
        return [name, num, ic];
      });
      db.setSetting('services', {
        ...cur,
        urgences: parsed.length ? parsed : cur.urgences,
      });
      ui.toast('Numéros d\'urgence du campus enregistrés avec succès !', 'success');
    } else if (kind === 'service-resto') {
      const cur = db.services();
      const resto = cur.restaurant || {};
      const hours = d.hours.split('\n').map((l) => l.split(':').map((s) => s.trim())).filter((x) => x.length >= 2);
      const prices = d.prices.split('\n').map((l) => l.split(':').map((s) => s.trim())).filter((x) => x.length >= 2);
      const menu = {};
      d.menus.split('\n').forEach((l) => {
        const parts = l.split(':');
        if (parts.length >= 2) {
          const dayNum = parseInt(parts[0].trim(), 10);
          if (dayNum) menu[dayNum] = parts.slice(1).join(':').split(',').map((x) => x.trim()).filter(Boolean);
        }
      });
      db.setSetting('services', {
        ...cur,
        restaurant: {
          ...resto,
          location: d.location.trim() || resto.location,
          phone: (d.phone || '').trim() || resto.phone,
          hours: hours.length ? hours : resto.hours,
          prices: prices.length ? prices : resto.prices,
          menu: Object.keys(menu).length ? menu : resto.menu,
        },
      });
      ui.toast('Informations et menus du restaurant enregistrés !', 'success');
    } else if (kind === 'service-sante') {
      const cur = db.services();
      const inf = cur.infirmerie || {};
      const sout = cur.soutien || {};
      const infHours = (d.inf_hours || '').split('\n').map((l) => l.split(':').map((s) => s.trim())).filter((x) => x.length >= 2);
      const soutHours = (d.sout_hours || '').split('\n').map((l) => l.split(':').map((s) => s.trim())).filter((x) => x.length >= 2);
      db.setSetting('services', {
        ...cur,
        infirmerie: {
          ...inf,
          phone: d.inf_phone.trim(),
          location: d.inf_location.trim(),
          hours: infHours.length ? infHours : inf.hours,
          description: d.inf_desc.trim(),
        },
        soutien: {
          ...sout,
          phone: d.sout_phone.trim(),
          location: (d.sout_location || '').trim() || sout.location,
          hours: soutHours.length ? soutHours : sout.hours,
          description: (d.sout_desc || '').trim() || sout.description,
        },
      });
      ui.toast('Informations médicales et soutien enregistrés !', 'success');
    } else if (kind === 'service-culture') {
      const cur = db.services();
      const bib = cur.bibliotheque || {};
      const sp = cur.sport || {};
      const bibHours = (d.bib_hours || '').split('\n').map((l) => l.split(':').map((s) => s.trim())).filter((x) => x.length >= 2);
      const sportHours = (d.sport_hours || '').split('\n').map((l) => l.split(':').map((s) => s.trim())).filter((x) => x.length >= 2);
      db.setSetting('services', {
        ...cur,
        bibliotheque: {
          ...bib,
          phone: (d.bib_phone || '').trim() || bib.phone,
          location: (d.bib_location || '').trim() || bib.location,
          hours: bibHours.length ? bibHours : bib.hours,
          description: d.bib_desc.trim(),
        },
        sport: {
          ...sp,
          phone: (d.sport_phone || '').trim() || sp.phone,
          location: (d.sport_location || '').trim() || sp.location,
          hours: sportHours.length ? sportHours : sp.hours,
          description: d.sport_desc.trim(),
        },
      });
      ui.toast('Informations Bibliothèque et Complexe Sportif enregistrées !', 'success');
    } else if (kind === 'contact-ist') {
      const cur = db.identity();
      db.setSetting('identity', {
        ...cur,
        phone: d.phone.trim(),
        fax: (d.fax || '').trim(),
        address: d.address.trim(),
        postalBox: d.postalBox.trim(),
        motto: d.motto.trim(),
      });
      ui.toast('Coordonnées officielles et devise de l\'IST enregistrées !', 'success');
    } else if (kind === 'annuaire-ist') {
      const cur = db.identity();
      const lines = (d.directory || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const parsedDir = lines.map((l) => {
        const parts = l.split(':');
        return [parts[0].trim(), parts.slice(1).join(':').trim()];
      }).filter(([n]) => Boolean(n));
      db.setSetting('identity', {
        ...cur,
        directory: parsedDir.length ? parsedDir : cur.directory,
      });
      ui.toast('Annuaire des services de l\'IST enregistré !', 'success');
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
      const tabs = [
        ['apercu', 'Aperçu'],
        ['annonces', 'Annonces'],
        ['programmes', 'Programmes des UE'],
        ['cours', 'Emploi du temps'],
        ['services', 'Services du campus'],
        ['evenements', 'Événements'],
        ['documents', 'Documents'],
        ['identite', "Identité de l'IST"],
        ['utilisateurs', 'Comptes'],
      ];
      const body = {
        apercu: overview,
        annonces,
        programmes: programmesTab,
        cours,
        services: servicesTab,
        evenements,
        documents,
        identite,
        utilisateurs
      }[st.tab](ctx);
      return `<div class="page-tabs">${ui.seg(tabs, st.tab, 'tab')}</div>${body}`;
    },
    mount(el, ctx) {
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tab], [data-del], [data-edit-doc], [data-role-filter], [data-del-user], [data-del-hymn], [data-add-staff], [data-copy-text], [data-gen-code]');
        if (!t) return;
        if (t.dataset.tab) { st.tab = t.dataset.tab; return ctx.refresh(); }
        if (t.dataset.editDoc) return editDoc(t.dataset.editDoc, ctx);
        if (t.dataset.roleFilter) { st.roleFilter = t.dataset.roleFilter; return ctx.refresh(); }
        if (t.dataset.addStaff !== undefined || t.hasAttribute('data-add-staff')) {
          return registerStaffModal(ctx);
        }
        if (t.dataset.copyText) {
          try {
            await navigator.clipboard.writeText(t.dataset.copyText);
            ui.toast('Code copié : ' + t.dataset.copyText, 'success');
          } catch (_) {
            prompt("Code d'accès :", t.dataset.copyText);
          }
          return;
        }
        if (t.dataset.genCode) {
          const u = auth.users().find((x) => x.id === t.dataset.genCode);
          if (u) {
            const prefix = u.role === 'admin' ? 'IST-ADM' : u.role === 'communication' ? 'IST-COM' : u.role === 'enseignant' ? 'IST-ENS' : 'IST-STF';
            const rnd = Math.floor(1000 + Math.random() * 9000);
            u.staffCode = `${prefix}-${rnd}`;
            auth.saveUsers(auth.users());
            ui.toast(`Code généré pour ${u.prenom} : ${u.staffCode}`, 'success');
            return ctx.refresh();
          }
        }
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
          const field = e.target.closest('.field');
          const nameSpan = field.querySelector('[data-file-name]');
          if (nameSpan) nameSpan.textContent = file ? `${file.name} (${ui.sizeLabel(file.size)})` : 'Choisir un fichier…';
          ui.setErr(e.target.form, e.target.name, '');
          // Image preview (for announcement illustration)
          const preview = field.querySelector('[data-preview]');
          if (preview && file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              preview.style.display = 'block';
              preview.innerHTML = `<img src="${ev.target.result}" alt="Aperçu" style="width:100%;height:160px;object-fit:cover;border-radius:8px;display:block;">`;
            };
            reader.readAsDataURL(file);
          } else if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
          }
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
