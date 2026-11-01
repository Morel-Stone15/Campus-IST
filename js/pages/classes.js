/* Classes virtuelles : « Ma classe » (étudiant) et « Mes classes » (enseignant) */
(function () {
  const { ui, db, auth, date: D } = IST;
  const icon = IST.icon;

  // Taille max fichier : 15 Mo pour les devoirs (PDF + ZIP supportés)
  const MAX_FILE = 15 * 1024 * 1024;
  const ALLOWED_DEVOIR_TYPES = ['pdf', 'zip'];

  const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const TYPES = {
    info:     ['Information',     'blue',   'megaphone'],
    document: ['Document',        'green',  'file'],
    devoir:   ['Devoir à rendre', 'orange', 'clipboard'],
  };

  const st = { tab: 'posts', submissionsOpen: null };

  /* ─── Droits ───────────────────────────────────────────────────── */
  function canPost(u, info) {
    if (u.role === 'admin') return true;
    if ((u.classes || []).includes(info.id)) return true;
    return u.role === 'chef' && u.chefFiliere === info.filiere;
  }

  /* ─── Soumissions (devoirs rendus) ─────────────────────────────── */
  // Clé de stockage local des devoirs rendus
  const SUBS_KEY = 'devoir_submissions';
  function allSubmissions()        { return IST.db.S.get(SUBS_KEY, []); }
  function saveSubmissions(arr)    { return IST.db.S.set(SUBS_KEY, arr); }

  function submissionsForPost(postId) {
    return allSubmissions().filter((s) => s.postId === postId);
  }

  function mySubmission(postId, userId) {
    return allSubmissions().find((s) => s.postId === postId && s.userId === userId);
  }

  async function submitDevoir(postId, file, user) {
    // Valider le type de fichier
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_DEVOIR_TYPES.includes(ext)) {
      return { ok: false, error: 'Seuls les fichiers PDF et ZIP sont acceptés.' };
    }
    if (file.size > MAX_FILE) {
      return { ok: false, error: 'Le fichier est trop volumineux (15 Mo maximum).' };
    }

    let fileId = null;
    let dataUrl = '';
    try {
      const meta = await IST.files.save(file, 'dv');
      fileId = meta.fileId;
      // Convertir en dataURL si < 4 Mo pour portabilité
      if (file.size <= 4 * 1024 * 1024) {
        dataUrl = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => res('');
          r.readAsDataURL(file);
        });
      }
    } catch (e) {
      console.warn('Erreur sauvegarde devoir:', e);
    }

    const existing = allSubmissions();
    // Remplacer si déjà soumis
    const prev = mySubmission(postId, user.id);
    if (prev && prev.fileId) IST.files.del(prev.fileId).catch(() => {});
    const newArr = existing.filter((s) => !(s.postId === postId && s.userId === user.id));

    const sub = {
      id: IST.db.uid(),
      postId,
      userId:    user.id,
      userName:  `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      filiere:   user.filiere,
      niveau:    user.niveau,
      fileName:  file.name,
      fileSize:  file.size,
      fileId,
      dataUrl,
      submittedAt: new Date().toISOString(),
      status: 'rendu',
    };
    newArr.push(sub);
    saveSubmissions(newArr);
    return { ok: true, sub };
  }

  /* ─── Carte de publication ──────────────────────────────────────── */
  function postCard(p, u, info) {
    const [label, tone, ic] = TYPES[p.type] || TYPES.info;
    const author = auth.users().find((x) => x.id === p.authorId);
    const canDel = p.authorId === u.id || u.role === 'admin';
    const isStudent = u.role === 'etudiant';
    const isStaff = db.isStaff(u);

    // Nombre de rendus (vue enseignant)
    const subs = submissionsForPost(p.id);
    const myDv = isStudent ? mySubmission(p.id, u.id) : null;

    return `<article class="card post tone-${tone}">
      <header class="row">
        ${author ? ui.avatar(author, 40) : `<span class="ic-box sm">${icon('user')}</span>`}
        <div class="grow"><strong>${ui.esc(p.authorName)}</strong><small class="muted">${ui.esc(p.authorRole)} · ${D.relative(p.date)}</small></div>
        <span class="tag">${icon(ic)}${label}</span>
        ${canDel ? `<button class="icon-btn" data-del-post="${p.id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
      </header>
      <h4>${ui.esc(p.title)}</h4>
      ${p.body ? `<p class="prose">${ui.esc(p.body).replace(/\n/g, '<br>')}</p>` : ''}
      ${p.due ? `<p class="due">${icon('clock')}À rendre pour le <strong>${D.fmt(p.due, { weekday: 'long', day: 'numeric', month: 'long' })}</strong></p>` : ''}
      ${p.fileId ? `<button class="attachment" data-dl-post="${p.id}">${icon('paperclip')}<span class="grow"><b>${ui.esc(p.fileName)}</b><small>${ui.sizeLabel(p.fileSize || 0)}</small></span>${icon('download')}</button>` : ''}

      ${p.type === 'devoir' && isStudent ? `
        <div class="devoir-submit-area" style="margin-top:12px;padding:14px;background:var(--surface,#f8fafc);border-radius:12px;border:1px dashed ${myDv ? '#22c55e' : '#f59e0b'};">
          ${myDv
            ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                 <span class="tag tone-green" style="flex-shrink:0;">${icon('checkCircle')}Rendu le ${D.fmt(myDv.submittedAt, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                 <span style="font-size:13px;color:var(--text-muted);">${ui.esc(myDv.fileName)}</span>
                 <button class="btn btn-soft btn-xs" data-submit-devoir="${p.id}" style="margin-left:auto;">${icon('upload')}Remplacer mon devoir</button>
               </div>`
            : `<div>
                 <p style="font-size:13px;font-weight:600;margin:0 0 10px 0;">${icon('clipboard')}Rends ton devoir (PDF ou ZIP uniquement)</p>
                 <label class="file-drop" style="border-style:dashed;">
                   ${icon('upload')}<span data-file-name-dv="${p.id}">Choisir un fichier PDF ou ZIP (15 Mo max.)</span>
                   <input type="file" name="dv_file_${p.id}" accept=".pdf,.zip" data-dv-input="${p.id}" style="display:none;">
                 </label>
                 <button class="btn btn-primary btn-sm" data-submit-devoir="${p.id}" style="margin-top:10px;">${icon('send')}Soumettre mon devoir</button>
               </div>`}
        </div>` : ''}

      ${p.type === 'devoir' && isStaff ? `
        <div style="margin-top:10px;padding:10px 14px;background:var(--surface,#f1f5f9);border-radius:10px;border:1px solid var(--border);">
          <button class="link small" data-view-subs="${p.id}" style="font-weight:600;">${icon('users')}${subs.length} rendu${subs.length !== 1 ? 's' : ''} reçu${subs.length !== 1 ? 's' : ''} · Voir les copies</button>
        </div>` : ''}
    </article>`;
  }

  /* ─── Modal : liste des devoirs rendus ──────────────────────────── */
  function viewSubmissionsModal(postId, postTitle) {
    const subs = submissionsForPost(postId);
    const rows = subs.length
      ? subs.map((s) => `
          <div class="list-item" style="align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
            <div class="grow" style="min-width:0;">
              <strong style="font-size:14px;">${ui.esc(s.userName)}</strong>
              <small class="muted" style="display:block;">${ui.esc(s.userEmail)} · ${ui.esc(s.filiere || '')} ${ui.esc(s.niveau || '')}</small>
              <small style="display:block;margin-top:2px;color:var(--text-muted);">${icon('clock')} Soumis le ${D.fmt(s.submittedAt, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })} · ${ui.sizeLabel(s.fileSize || 0)}</small>
            </div>
            <button class="btn btn-soft btn-xs" data-dl-sub="${s.id}" style="flex-shrink:0;">${icon('download')}${ui.esc(s.fileName)}</button>
          </div>`)
        .join('')
      : `<div style="padding:32px;text-align:center;color:var(--text-muted);">${icon('inbox')} Aucun étudiant n'a encore rendu ce devoir.</div>`;

    const sheet = ui.sheet({
      title: `Copies reçues : ${postTitle}`,
      body: `<div style="margin-bottom:10px;"><span class="tag tone-blue">${subs.length} rendu${subs.length !== 1 ? 's' : ''}</span></div>${rows}`,
      footer: `<button class="btn btn-ghost" data-close>Fermer</button>`,
    });

    sheet.el.addEventListener('click', async (e) => {
      const dlBtn = e.target.closest('[data-dl-sub]');
      if (!dlBtn) return;
      const sub = allSubmissions().find((s) => s.id === dlBtn.dataset.dlSub);
      if (!sub) return;
      if (sub.dataUrl) {
        const a = document.createElement('a');
        a.href = sub.dataUrl;
        a.download = sub.fileName;
        a.click();
      } else if (sub.fileId) {
        const ok = await IST.files.download(sub.fileId, sub.fileName);
        if (!ok) ui.toast('Fichier introuvable sur cet appareil.', 'error');
      } else {
        ui.toast('Fichier non disponible.', 'error');
      }
    });
  }

  /* ─── Formulaire de publication (enseignant / admin) ───────────── */
  function composer(info) {
    return `<form class="card composer" data-composer novalidate>
      <div class="row-between"><h3 style="font-size:16px;">Publier pour la classe</h3>
        ${ui.seg(Object.entries(TYPES).map(([k, [l]]) => [k, l]), 'document', 'ptype', 'sm')}</div>
      <input type="hidden" name="type" value="document">
      ${ui.field({ name: 'title', label: 'Titre', placeholder: 'Ex. Support du chapitre 3' })}
      ${ui.field({ name: 'body', label: 'Message / Consignes', type: 'textarea', rows: 3, optional: true, placeholder: 'Consignes, informations détaillées…' })}
      <div data-due hidden>${ui.field({ name: 'due', label: 'À rendre pour le', type: 'date' })}</div>
      <div class="field" data-field="file">
        <label class="file-drop">${icon('paperclip')}<span data-file-name>Joindre un fichier (PDF, Word, image, ZIP… 10 Mo max.)</span><input type="file" name="file"></label>
        <small class="err"></small>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" type="submit">${icon('send')}Publier</button></div>
    </form>`;
  }

  /* ─── Espace d'une classe ───────────────────────────────────────── */
  function classSpace(info, u) {
    const students  = db.studentsOf(info.id);
    const teachers  = db.teachersOf(info.id);
    const chef      = db.chefOf(info.filiere);
    const posts     = db.posts(info.id);
    const isStaff   = db.isStaff(u);
    const tabs      = [['posts', `Publications (${posts.length})`], ['edt', 'Emploi du temps'], ['people', isStaff ? `Membres (${students.length + teachers.length})` : 'Enseignants']];

    let body;
    if (st.tab === 'edt') {
      const courses = db.classCourses(info.id);
      body = courses.length
        ? DAYS.slice(1).map((dl, i) => {
            const list = courses.filter((c) => c.day === i + 1);
            return list.length ? `<p class="list-title">${dl}</p><div class="stack">${list.map((c) => ui.course(c)).join('')}</div>` : '';
          }).join('')
        : `<div class="card">${ui.empty('calendar', 'Aucun emploi du temps', 'Le chef de filière le publiera bientôt.')}</div>`;
    } else if (st.tab === 'people') {
      const person = (x, sub) => `<div class="list-item">${ui.avatar(x, 38)}<div class="grow"><strong>${ui.esc(ui.displayName(x))}</strong><small>${ui.esc(sub)}</small></div>
        ${isStaff || x.role !== 'etudiant' ? `<a class="icon-btn" href="mailto:${ui.esc(x.email)}" aria-label="Écrire à ${ui.esc(x.prenom)}">${icon('mail')}</a>` : ''}</div>`;
      body = `
        <p class="list-title">Encadrement</p>
        <div class="list">${chef ? person(chef, 'Chef de filière') : ''}${teachers.filter((t) => t !== chef).map((t) => person(t, 'Enseignant(e)')).join('')}
          ${!chef && !teachers.length ? `<div class="list-item muted small">Aucun enseignant inscrit pour cette classe.</div>` : ''}</div>
        ${isStaff ? `<p class="list-title">Étudiants inscrits (${students.length})</p>
          <div class="list">${students.map((x) => person(x, x.email)).join('') || '<div class="list-item muted small">Aucun étudiant inscrit pour le moment.</div>'}</div>` : ''}`;
    } else {
      // Onglet publications
      const canPublish = canPost(u, info);
      // Bannière info étudiant sur dépôt de devoirs
      const studentHint = !isStaff ? `<div class="info-box" style="margin-bottom:14px;">${icon('info')}<div><b>Rendus de devoirs</b> Lorsqu'un devoir est publié, un espace de dépôt apparaît directement sous la publication. Tu peux déposer un fichier <strong>PDF ou ZIP</strong> (15 Mo max.).</div></div>` : '';
      body = `${canPublish ? composer(info) : ''}
        ${studentHint}
        <div class="stack mt">${posts.map((p) => postCard(p, u, info)).join('') || `<div class="card">${ui.empty('presentation', 'Aucune publication', isStaff ? 'Publie un premier document pour cette classe.' : 'Les documents et informations de tes enseignants apparaîtront ici.')}</div>`}</div>`;
    }

    return `
      <div class="class-hero">
        <div class="grow">
          <span class="tag">${icon('users')}${ui.esc(info.label)}</span>
          <h2>${ui.esc(info.filiere)}</h2>
          <p>${ui.esc(IST.school.levelLabel(info.niveau))}</p>
        </div>
        <div class="class-facts">
          <div><small>Salle</small><b>${ui.esc(info.room || 'À venir')}</b></div>
          <div><small>Étudiants</small><b>${students.length}</b></div>
          <div><small>Enseignants</small><b>${teachers.length}</b></div>
        </div>
      </div>
      <div class="page-tabs mt">${ui.seg(tabs, st.tab, 'ctab')}</div>
      ${body}`;
  }

  /* ─── Montage des événements ────────────────────────────────────── */
  function mountSpace(el, ctx, info) {
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-ctab], [data-ptype], [data-dl-post], [data-del-post], [data-submit-devoir], [data-view-subs]');
      if (!t) return;

      if (t.dataset.ctab) { st.tab = t.dataset.ctab; return ctx.refresh(); }

      if (t.dataset.ptype) {
        const f = el.querySelector('[data-composer]');
        if (!f) return;
        f.type.value = t.dataset.ptype;
        f.querySelectorAll('[data-ptype]').forEach((b) => b.classList.toggle('active', b === t));
        f.querySelector('[data-due]').hidden = t.dataset.ptype !== 'devoir';
        return;
      }

      if (t.dataset.dlPost) {
        const p = db.find('posts', t.dataset.dlPost);
        if (!p) return;
        if (p.dataUrl) {
          const a = document.createElement('a'); a.href = p.dataUrl; a.download = p.fileName; a.click();
        } else if (p.fileId) {
          const ok = await IST.files.download(p.fileId, p.fileName);
          if (!ok) ui.toast('Fichier introuvable sur cet appareil.', 'error');
        } else {
          ui.toast('Aucun fichier joint à cette publication.', 'error');
        }
        return;
      }

      if (t.dataset.delPost) {
        if (!(await ui.confirm('Supprimer cette publication ?', { ok: 'Supprimer', danger: true }))) return;
        const p = db.find('posts', t.dataset.delPost);
        if (p && p.fileId) IST.files.del(p.fileId).catch(() => {});
        db.remove('posts', t.dataset.delPost);
        await db.flushRemote();
        ui.toast('Publication supprimée.', 'success');
        ctx.refresh();
        return;
      }

      // Voir les soumissions (vue enseignant)
      if (t.dataset.viewSubs) {
        const p = db.find('posts', t.dataset.viewSubs);
        if (p) viewSubmissionsModal(p.id, p.title);
        return;
      }

      // Soumettre un devoir (vue étudiant)
      if (t.dataset.submitDevoir) {
        const postId = t.dataset.submitDevoir;
        const inputEl = el.querySelector(`[data-dv-input="${postId}"]`);
        const file = inputEl && inputEl.files && inputEl.files[0];
        const u = ctx.user;

        if (!file) {
          ui.toast('Choisis d\'abord un fichier PDF ou ZIP.', 'error');
          return;
        }

        ui.busy(t, true);
        const res = await submitDevoir(postId, file, u);
        ui.busy(t, false);

        if (!res.ok) {
          ui.toast(res.error, 'error');
          return;
        }

        // Notifier les enseignants de la classe
        const teachers = db.teachersOf(info.id);
        teachers.forEach((teacher) => {
          db.notify({
            to: teacher.id,
            type: 'cours',
            icon: 'clipboard',
            title: `Devoir rendu par ${u.prenom} ${u.nom}`,
            body: `${db.find('posts', postId)?.title || 'Devoir'} · ${info.label}`,
            link: 'classes/' + info.id,
          });
        });

        ui.toast('Ton devoir a bien été soumis !', 'success');
        ctx.refresh();
        return;
      }
    });

    // Mise à jour du nom du fichier de devoir sélectionné
    el.addEventListener('change', (e) => {
      if (e.target.type !== 'file') return;
      const file = e.target.files[0];

      // Fichier joint à une publication enseignant
      const composer = e.target.closest('[data-composer]');
      if (composer) {
        el.querySelector('[data-file-name]').textContent = file ? `${file.name} (${ui.sizeLabel(file.size)})` : 'Joindre un fichier';
        return;
      }

      // Fichier de devoir étudiant
      const dvInput = e.target.dataset.dvInput;
      if (dvInput) {
        const nameEl = el.querySelector(`[data-file-name-dv="${dvInput}"]`);
        if (nameEl) nameEl.textContent = file ? `${file.name} (${ui.sizeLabel(file.size)})` : 'Choisir un fichier PDF ou ZIP…';
      }
    });

    // Formulaire de publication (enseignants)
    const form = el.querySelector('[data-composer]');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = ui.formData(form);
      const file = form.querySelector('input[type=file]').files[0];
      ui.setErr(form, 'title', d.title.trim() ? '' : 'Donne un titre à ta publication.');
      ui.setErr(form, 'file', file && file.size > MAX_FILE ? 'Fichier trop lourd (10 Mo maximum).' : '');
      if (!d.title.trim() || (file && file.size > MAX_FILE)) return;
      const btn = form.querySelector('[type=submit]');
      ui.busy(btn, true);
      try {
        let fileMeta = {};
        let dataUrl = '';
        if (file) {
          fileMeta = await IST.files.save(file, 'post');
          if (file.size <= 4 * 1024 * 1024) {
            dataUrl = await new Promise((res) => {
              const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(file);
            });
          }
        }
        const u = ctx.user;
        db.add('posts', {
          classId: info.id, type: d.type, title: d.title.trim(), body: d.body.trim(),
          due: d.type === 'devoir' ? d.due : '',
          authorId: u.id, authorName: ui.displayName(u), authorRole: ui.roleLabel(u),
          date: new Date().toISOString(),
          ...fileMeta, dataUrl,
        });
        db.notify({
          classId: info.id, from: u.id, type: 'cours', icon: d.type === 'devoir' ? 'clipboard' : 'paperclip',
          link: 'classe',
          title: `${info.label} · ${d.title.trim()}`,
          body: `${TYPES[d.type][0]} publié par ${ui.displayName(u)}`,
        });
        await db.flushRemote();
        ui.toast('Publié ! Les étudiants de la classe sont notifiés.', 'success');
        ctx.refresh();
      } catch (err) {
        ui.busy(btn, false);
        ui.toast("Impossible d'enregistrer le fichier sur cet appareil.", 'error');
      }
    });
  }

  /* ─── Page étudiant : Ma classe ─────────────────────────────────── */
  IST.pages.classe = {
    title: 'Ma classe',
    subtitle: 'Publications, devoirs et emploi du temps',
    can: (u) => u.role === 'etudiant',
    render({ user }) {
      const info = IST.school.classInfo(db.classIdOf(user));
      if (!info) return `<div class="card">${ui.empty('users', 'Classe introuvable', 'Mets à jour ta filière et ton niveau dans ton profil.')}</div>`;
      return classSpace(info, user);
    },
    mount(el, ctx) {
      const info = IST.school.classInfo(db.classIdOf(ctx.user));
      info && mountSpace(el, ctx, info);
    },
  };

  /* ─── Gestion des classes (enseignants) ─────────────────────────── */
  function editClasses(ctx) {
    const s = ui.sheet({
      title: 'Mes classes',
      size: 'wide',
      body: `<form id="cls-form">${ui.classPicker(ctx.user.classes || [])}</form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="cls-form">Enregistrer</button>`,
    });
    s.el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const classes = [...e.target.querySelectorAll('input[name=classes]:checked')].map((x) => x.value);
      if (!classes.length && ctx.user.role !== 'admin') return ui.toast('Garde au moins une classe.', 'error');
      auth.update(ctx.user.id, { classes });
      s.close();
      ui.toast('Classes mises à jour.', 'success');
      ctx.refreshShell();
    });
  }
  IST.ui.editClasses = editClasses;

  /* ─── Page enseignant : Mes classes ─────────────────────────────── */
  IST.pages.classes = {
    title: 'Mes classes',
    subtitle: 'Classes virtuelles : publications, devoirs et rendus étudiants',
    can: (u) => db.isStaff(u),
    render(ctx) {
      const u = ctx.user;
      const id = ctx.params[0];
      if (id) {
        const info = IST.school.classInfo(id);
        if (!info || !canPost(u, info)) return `<div class="card">${ui.empty('lock', 'Classe non accessible', "Ajoute cette classe à ta liste pour y accéder.")}</div>`;
        return `<a class="link" href="#/classes">${icon('arrowLeft')}Toutes mes classes</a><div class="mt">${classSpace(info, u)}</div>`;
      }
      const list = (u.classes || []).map(IST.school.classInfo).filter(Boolean);
      return `
        <div class="row-between" style="margin-bottom:16px">
          <p class="text-2">${list.length} classe${list.length > 1 ? 's' : ''}</p>
          <button class="btn btn-soft btn-sm" data-edit-classes>${icon('edit')}Modifier mes classes</button>
        </div>
        ${list.length ? `<div class="grid-3">${list.map((c) => {
          const n = db.studentsOf(c.id).length;
          const p = db.posts(c.id).length;
          const dvPosts = db.posts(c.id).filter((x) => x.type === 'devoir');
          const dvSubs  = dvPosts.reduce((s, x) => s + submissionsForPost(x.id).length, 0);
          return `<a class="card class-card" href="#/classes/${c.id}">
            <div class="row"><span class="ic-box tone-${c.pole === 'tech' ? 'blue' : 'orange'}">${icon('users')}</span>
              <div class="grow"><strong>${ui.esc(c.label)}</strong><small class="muted">${ui.esc(IST.school.levelLabel(c.niveau))}</small></div>${icon('chevronRight')}</div>
            <p class="small text-2">${ui.esc(c.filiere)}</p>
            <div class="meta">
              <span>${icon('door')}${ui.esc(c.room || 'Salle à venir')}</span>
              <span>${icon('user')}${n} étudiant${n > 1 ? 's' : ''}</span>
              <span>${icon('file')}${p} publication${p > 1 ? 's' : ''}</span>
              ${dvSubs ? `<span class="tag tone-orange" style="font-size:11px;">${icon('clipboard')}${dvSubs} rendu${dvSubs > 1 ? 's' : ''}</span>` : ''}
            </div>
          </a>`;
        }).join('')}</div>` : `<div class="card">${ui.empty('users', 'Aucune classe', 'Ajoute les classes dans lesquelles tu enseignes.')}</div>`}`;
    },
    mount(el, ctx) {
      el.addEventListener('click', (e) => e.target.closest('[data-edit-classes]') && editClasses(ctx));
      const info = ctx.params[0] && IST.school.classInfo(ctx.params[0]);
      if (info && canPost(ctx.user, info)) mountSpace(el, ctx, info);
    },
  };
})();
