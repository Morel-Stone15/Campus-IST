/* Actualités et annonces + publication (Communication / Admin) */
(function () {
  const { ui, db, auth, date: D } = IST;
  const icon = IST.icon;
  const CATS = ['Toutes', 'Scolarité', 'Vie étudiante', 'Urgent', 'Général'];
  const st = { cat: 'Toutes', q: '' };

  function canManageNews(u) {
    return Boolean(u && (
      u.role === 'admin' ||
      u.role === 'communication' ||
      u.role === 'staff' ||
      u.role === 'chef' ||
      (u.fonction && u.fonction.toLowerCase().includes('com')) ||
      (u.email && u.email.toLowerCase().includes('com'))
    ));
  }

  function filtered(user) {
    const q = st.q.trim().toLowerCase();
    return db.announcements(user).filter((a) =>
      (st.cat === 'Toutes' || a.category === st.cat) &&
      (!q || (a.title + ' ' + a.body).toLowerCase().includes(q)));
  }

  function listHTML(user) {
    const list = filtered(user);
    return list.length
      ? `<div class="grid-2">${list.map((a) => ui.newsCard(a)).join('')}</div>`
      : `<div class="card">${ui.empty('search', 'Aucune annonce trouvée', 'Essaie une autre catégorie ou un autre mot-clé.')}</div>`;
  }

  function addNewsModal(ctx) {
    const u = ctx.user || auth.current() || {};
    const ALL_FILIERES = [['*', 'Toutes les filières'], ...IST.school.filiereOptions()];

    const s = ui.sheet({
      title: 'Publier une nouvelle annonce',
      body: `<form class="admin-form stack-lg" id="news-add-form" novalidate>
        ${ui.field({ name: 'title', label: "Titre de l'annonce", placeholder: 'Ex. Organisation des rattrapages du semestre 1', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Catégorie', type: 'select', options: ['Scolarité', 'Vie étudiante', 'Urgent', 'Général'], value: 'Général' })}
          ${ui.field({ name: 'filiere', label: 'Destinataires', type: 'select', options: ALL_FILIERES, value: '*' })}
        </div>
        ${ui.field({ name: 'author', label: 'Signée par', value: u.role === 'communication' ? 'Service Communication IST' : 'Administration', required: true })}
        <div class="field" data-field="image">
          <label>Illustration (Photo, affiche… redimensionnée automatiquement)</label>
          <label class="file-drop">${icon('image')}<span data-file-name>Choisir une image (JPG, PNG, WebP)…</span><input type="file" name="image" accept="image/*"></label>
          <div data-preview style="margin-top:8px;display:none;max-height:160px;overflow:hidden;border-radius:8px;"></div>
        </div>
        ${ui.field({ name: 'body', label: 'Contenu du message', type: 'textarea', rows: 5, placeholder: 'Détails, consignes importantes et instructions pour les étudiants…', required: true })}
        <div class="row-between">
          <label class="check"><input type="checkbox" name="pinned">Épingler en haut de la liste</label>
          <label class="check"><input type="checkbox" name="notify" checked>Envoyer une alerte notification</label>
        </div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="news-add-form">${icon('megaphone')}Diffuser l'annonce</button>`,
    });

    const f = s.el.querySelector('#news-add-form');
    let resizedDataUrl = '';

    f.querySelector('input[type=file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const preview = f.querySelector('[data-preview]');
      const lbl = f.querySelector('[data-file-name]');
      if (!file) { resizedDataUrl = ''; preview.style.display = 'none'; lbl.textContent = 'Choisir une image…'; return; }
      lbl.textContent = `${file.name} (${ui.sizeLabel(file.size)})`;
      try {
        resizedDataUrl = await ui.resizeImage(file, 1200, 800, 0.85);
        preview.innerHTML = `<img src="${resizedDataUrl}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;display:block;">`;
        preview.style.display = 'block';
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = ui.formData(f);
      ui.setErr(f, 'title', d.title.trim() ? '' : "Donnez un titre à l'annonce.");
      ui.setErr(f, 'body', d.body.trim() ? '' : 'Rédigez le texte de votre annonce.');
      if (!d.title.trim() || !d.body.trim()) return;

      const newA = {
        title: d.title.trim(),
        category: d.category || 'Général',
        filiere: d.filiere || '*',
        author: (d.author || 'Service Communication').trim(),
        body: d.body.trim(),
        image: resizedDataUrl || '',
        pinned: !!d.pinned,
        date: new Date().toISOString(),
      };

      db.add('announcements', newA);

      if (d.notify) {
        db.notify({
          type: 'annonce',
          icon: 'megaphone',
          title: newA.title,
          body: newA.body.slice(0, 120) + (newA.body.length > 120 ? '…' : ''),
          link: 'actualites',
          filiere: newA.filiere,
        });
      }

      s.close();
      ui.toast(`Annonce « ${newA.title} » diffusée !`, 'success');
      ctx.refresh();
    });
  }

  IST.pages.actualites = {
    title: 'Actualités & Annonces',
    subtitle: "Informations officielles, scolarité et vie du campus",
    render({ user }) {
      const u = user || auth.current();
      const allowManage = canManageNews(u);

      const manageBar = allowManage
        ? `<div class="row-between mb" style="flex-wrap:wrap;gap:12px;background:var(--surface,#fff);padding:12px 16px;border-radius:12px;border:1px solid var(--border,#e2e8f0);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge tone-purple" style="font-size:12px;">${icon('megaphone')} Espace Communication & Admin</span>
              <span class="muted small">Publiez des annonces en temps réel pour tout le campus.</span>
            </div>
            <button class="btn btn-primary" data-add-news>${icon('plus')}Publier une annonce</button>
          </div>`
        : '';

      return `
        ${manageBar}
        <div class="toolbar mb">
          <label class="searchbar">${icon('search')}<span class="sr-only">Rechercher une annonce</span>
            <input type="search" placeholder="Rechercher une annonce par mot-clé…" value="${ui.esc(st.q)}" data-search></label>
          <div class="chips" role="tablist">${CATS.map((c) => `<button type="button" class="chip ${c === st.cat ? 'active' : ''}" data-cat="${c}" aria-pressed="${c === st.cat}">${c}</button>`).join('')}</div>
        </div>
        <div id="news-list">${listHTML(u)}</div>`;
    },
    mount(el, ctx) {
      const listEl = el.querySelector('#news-list');
      const searchInput = el.querySelector('[data-search]');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          st.q = e.target.value;
          listEl.innerHTML = listHTML(ctx.user);
        });
      }

      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-add-news]')) {
          addNewsModal(ctx);
          return;
        }

        const c = e.target.closest('[data-cat]');
        if (c) {
          st.cat = c.dataset.cat;
          el.querySelectorAll('[data-cat]').forEach((b) => {
            b.classList.toggle('active', b === c);
            b.setAttribute('aria-pressed', b === c);
          });
          listEl.innerHTML = listHTML(ctx.user);
          return;
        }

        const n = e.target.closest('[data-news]');
        if (n) ui.openNews(db.find('announcements', n.dataset.news));
      });

      // Lien direct vers une annonce : #/actualites/<id>
      const a = ctx.params[0] && db.find('announcements', ctx.params[0]);
      if (a) ui.openNews(a);
    },
  };
})();
