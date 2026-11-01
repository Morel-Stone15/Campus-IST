/* Actualités et annonces */
(function () {
  const { ui, db } = IST;
  const icon = IST.icon;
  const CATS = ['Toutes', 'Scolarité', 'Vie étudiante', 'Urgent', 'Général'];
  const st = { cat: 'Toutes', q: '' };

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

  IST.pages.actualites = {
    title: 'Actualités',
    subtitle: "Annonces de l'administration et de la vie étudiante",
    render({ user }) {
      return `
        <div class="toolbar">
          <label class="searchbar">${icon('search')}<span class="sr-only">Rechercher une annonce</span>
            <input type="search" placeholder="Rechercher une annonce…" value="${ui.esc(st.q)}" data-search></label>
          <div class="chips" role="tablist">${CATS.map((c) => `<button type="button" class="chip ${c === st.cat ? 'active' : ''}" data-cat="${c}" aria-pressed="${c === st.cat}">${c}</button>`).join('')}</div>
        </div>
        <div id="news-list">${listHTML(user)}</div>`;
    },
    mount(el, ctx) {
      const listEl = el.querySelector('#news-list');
      el.querySelector('[data-search]').addEventListener('input', (e) => {
        st.q = e.target.value;
        listEl.innerHTML = listHTML(ctx.user);
      });
      el.addEventListener('click', (e) => {
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
