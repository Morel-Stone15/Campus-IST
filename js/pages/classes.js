/* Classes virtuelles : « Ma classe » (étudiant) et « Mes classes » (enseignant) */
(function () {
  const { ui, db, auth, date: D } = IST;
  const icon = IST.icon;
  const MAX_FILE = 10 * 1024 * 1024;
  const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const TYPES = { info: ['Information', 'blue', 'megaphone'], document: ['Document', 'green', 'file'], devoir: ['Devoir', 'orange', 'clipboard'] };
  const st = { tab: 'posts' };

  /** Peut publier dans la classe : enseignant de la classe, chef de la filière ou administration. */
  function canPost(u, info) {
    if (u.role === 'admin') return true;
    if ((u.classes || []).includes(info.id)) return true;
    return u.role === 'chef' && u.chefFiliere === info.filiere;
  }

  /* ---------- Publications ---------- */
  function composer() {
    return `<form class="card composer" data-composer novalidate>
      <div class="row-between"><h3 style="font-size:16px">Publier pour la classe</h3>
        ${ui.seg(Object.entries(TYPES).map(([k, [l]]) => [k, l]), 'document', 'ptype', 'sm')}</div>
      <input type="hidden" name="type" value="document">
      ${ui.field({ name: 'title', label: 'Titre', placeholder: 'Ex. Support du chapitre 3' })}
      ${ui.field({ name: 'body', label: 'Message', type: 'textarea', rows: 3, optional: true, placeholder: 'Consignes, informations…' })}
      <div data-due hidden>${ui.field({ name: 'due', label: 'À rendre pour le', type: 'date' })}</div>
      <div class="field" data-field="file">
        <label class="file-drop">${icon('paperclip')}<span data-file-name>Joindre un fichier (PDF, Word, image… 10 Mo max.)</span><input type="file" name="file"></label>
        <small class="err"></small>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" type="submit">${icon('send')}Publier</button></div>
    </form>`;
  }

  function postCard(p, u) {
    const [label, tone, ic] = TYPES[p.type] || TYPES.info;
    const author = auth.users().find((x) => x.id === p.authorId);
    const mine = p.authorId === u.id || u.role === 'admin';
    return `<article class="card post tone-${tone}">
      <header class="row">
        ${author ? ui.avatar(author, 40) : `<span class="ic-box sm">${icon('user')}</span>`}
        <div class="grow"><strong>${ui.esc(p.authorName)}</strong><small class="muted">${ui.esc(p.authorRole)} · ${D.relative(p.date)}</small></div>
        <span class="tag">${icon(ic)}${label}</span>
        ${mine ? `<button class="icon-btn" data-del-post="${p.id}" aria-label="Supprimer la publication">${icon('trash')}</button>` : ''}
      </header>
      <h4>${ui.esc(p.title)}</h4>
      ${p.body ? `<p class="prose">${ui.esc(p.body).replace(/\n/g, '<br>')}</p>` : ''}
      ${p.due ? `<p class="due">${icon('clock')}À rendre pour le ${D.fmt(p.due, { weekday: 'long', day: 'numeric', month: 'long' })}</p>` : ''}
      ${p.fileId ? `<button class="attachment" data-dl-post="${p.id}">${icon('paperclip')}<span class="grow"><b>${ui.esc(p.fileName)}</b><small>${ui.sizeLabel(p.fileSize || 0)}</small></span>${icon('download')}</button>` : ''}
    </article>`;
  }

  /* ---------- Espace d'une classe ---------- */
  function classSpace(info, u) {
    const students = db.studentsOf(info.id);
    const teachers = db.teachersOf(info.id);
    const chef = db.chefOf(info.filiere);
    const posts = db.posts(info.id);
    const staff = db.isStaff(u);
    const tabs = [['posts', `Publications (${posts.length})`], ['edt', 'Emploi du temps'], ['people', staff ? `Membres (${students.length + teachers.length})` : 'Enseignants']];

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
        ${staff || x.role !== 'etudiant' ? `<a class="icon-btn" href="mailto:${ui.esc(x.email)}" aria-label="Écrire à ${ui.esc(x.prenom)}">${icon('mail')}</a>` : ''}</div>`;
      body = `
        <p class="list-title">Encadrement</p>
        <div class="list">${chef ? person(chef, 'Chef de filière') : ''}${teachers.filter((t) => t !== chef).map((t) => person(t, 'Enseignant(e)')).join('')}
          ${!chef && !teachers.length ? `<div class="list-item muted small">Aucun enseignant inscrit pour cette classe.</div>` : ''}</div>
        ${staff ? `<p class="list-title">Étudiants inscrits (${students.length})</p>
          <div class="list">${students.map((x) => person(x, x.email)).join('') || '<div class="list-item muted small">Aucun étudiant inscrit pour le moment.</div>'}</div>` : ''}`;
    } else {
      body = `${canPost(u, info) ? composer() : ''}
        <div class="stack mt">${posts.map((p) => postCard(p, u)).join('') || `<div class="card">${ui.empty('presentation', 'Aucune publication', staff ? 'Publie un premier document pour cette classe.' : 'Les documents et informations de tes enseignants apparaîtront ici.')}</div>`}</div>`;
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

  function mountSpace(el, ctx, info) {
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-ctab], [data-ptype], [data-dl-post], [data-del-post]');
      if (!t) return;
      if (t.dataset.ctab) { st.tab = t.dataset.ctab; return ctx.refresh(); }
      if (t.dataset.ptype) {
        const f = el.querySelector('[data-composer]');
        f.type.value = t.dataset.ptype;
        f.querySelectorAll('[data-ptype]').forEach((b) => b.classList.toggle('active', b === t));
        f.querySelector('[data-due]').hidden = t.dataset.ptype !== 'devoir';
        return;
      }
      if (t.dataset.dlPost) {
        const p = db.find('posts', t.dataset.dlPost);
        if (!(await IST.files.download(p.fileId, p.fileName))) ui.toast('Fichier introuvable sur cet appareil.', 'error');
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
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.type !== 'file') return;
      const file = e.target.files[0];
      el.querySelector('[data-file-name]').textContent = file ? `${file.name} (${ui.sizeLabel(file.size)})` : 'Joindre un fichier';
    });
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
        const meta = file ? await IST.files.save(file, 'post') : {};
        const u = ctx.user;
        db.add('posts', {
          classId: info.id, type: d.type, title: d.title.trim(), body: d.body.trim(), due: d.type === 'devoir' ? d.due : '',
          authorId: u.id, authorName: ui.displayName(u), authorRole: ui.roleLabel(u), date: new Date().toISOString(), ...meta,
        });
        db.notify({
          classId: info.id, from: u.id, type: 'cours', icon: d.type === 'devoir' ? 'clipboard' : 'paperclip', link: 'classe',
          title: `${info.label} · ${d.title.trim()}`, body: `${TYPES[d.type][0]} publié par ${ui.displayName(u)}`,
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

  /* ---------- Page étudiant : Ma classe ---------- */
  IST.pages.classe = {
    title: 'Ma classe',
    subtitle: 'Documents et informations de tes enseignants',
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

  /* ---------- Page enseignant : Mes classes ---------- */
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

  IST.pages.classes = {
    title: 'Mes classes',
    subtitle: 'Classes virtuelles : documents, devoirs et informations',
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
          return `<a class="card class-card" href="#/classes/${c.id}">
            <div class="row"><span class="ic-box tone-${c.pole === 'tech' ? 'blue' : 'orange'}">${icon('users')}</span>
              <div class="grow"><strong>${ui.esc(c.label)}</strong><small class="muted">${ui.esc(IST.school.levelLabel(c.niveau))}</small></div>${icon('chevronRight')}</div>
            <p class="small text-2">${ui.esc(c.filiere)}</p>
            <div class="meta"><span>${icon('door')}${ui.esc(c.room || 'Salle à venir')}</span><span>${icon('user')}${n} étudiant${n > 1 ? 's' : ''}</span><span>${icon('file')}${p} publication${p > 1 ? 's' : ''}</span></div>
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
