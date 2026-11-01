/* Annuaire des enseignants et des membres de l'administration */
(function () {
  const { ui, auth } = IST;
  const icon = IST.icon;
  const st = { filter: 'all', query: '' };
  const filters = [
    ['all', 'Tout le personnel'],
    ['teaching', 'Enseignants'],
    ['administration', 'Administration'],
  ];

  function members() {
    return auth.users()
      .filter((u) => ['enseignant', 'chef', 'admin', 'communication', 'staff'].includes(u.role))
      .sort((a, b) => ui.displayName(a).localeCompare(ui.displayName(b), 'fr'));
  }

  function category(user) {
    return (user.role === 'admin' || user.role === 'communication' || user.role === 'staff') ? 'administration' : 'teaching';
  }

  function description(user) {
    if (user.role === 'admin') return user.fonction || 'Administration de l’IST';
    const classes = (user.classes || [])
      .map((id) => IST.school.classInfo(id))
      .filter(Boolean)
      .map((item) => item.label);
    const details = [];
    if (user.role === 'chef' && user.chefFiliere) {
      const filiere = IST.school.find(user.chefFiliere);
      details.push(`Chef de filière${filiere ? ` · ${filiere.name}` : ''}`);
    } else {
      details.push('Enseignant');
    }
    if (classes.length) details.push(classes.join(', '));
    return details.join(' · ');
  }

  function matchingMembers() {
    const query = st.query.trim().toLocaleLowerCase('fr');
    return members().filter((user) => {
      if (st.filter !== 'all' && category(user) !== st.filter) return false;
      if (!query) return true;
      return [ui.displayName(user), user.email, ui.roleLabel(user), description(user)]
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(query);
    });
  }

  function cards() {
    const list = matchingMembers();
    if (!list.length) {
      return `<div class="card">${ui.empty('users', 'Aucun membre trouvé', 'Essaie un autre nom ou une autre catégorie.')}</div>`;
    }
    return list.map((user) => {
      const isAdmin = user.role === 'admin';
      return `<article class="card">
        <div class="row">
          ${ui.avatar(user, 48)}
          <div class="grow">
            <h3>${ui.esc(ui.displayName(user))}</h3>
            <span class="tag ${isAdmin ? 'tone-purple' : 'tone-blue'}">${ui.esc(ui.roleLabel(user))}</span>
          </div>
          <span class="ic-box sm ${isAdmin ? 'tone-purple' : 'tone-blue'}">${icon(isAdmin ? 'briefcase' : 'cap')}</span>
        </div>
        <p class="muted mt">${ui.esc(description(user))}</p>
        <a class="link mt" href="mailto:${ui.esc(user.email)}">${icon('mail')}${ui.esc(user.email)}</a>
      </article>`;
    }).join('');
  }

  function resultCount() {
    const count = matchingMembers().length;
    return `${count} membre${count > 1 ? 's' : ''}`;
  }

  IST.pages.annuaire = {
    title: 'Personnel de l’IST',
    subtitle: 'Enseignants et administration',
    can: (u) => u.role !== 'etudiant',
    render() {
      const all = members();
      const counts = {
        all: all.length,
        teaching: all.filter((u) => category(u) === 'teaching').length,
        administration: all.filter((u) => category(u) === 'administration').length,
      };
      return `
        <div class="card">
          <div class="row">
            <span class="ic-box tone-blue">${icon('users')}</span>
            <div><h2>Corps enseignant et administratif</h2>
              <p class="text-2">Retrouve les enseignants, les chefs de filière et les membres de l’administration de l’IST.</p></div>
          </div>
        </div>
        <section class="section">
          <label class="searchbar">${icon('search')}<input type="search" data-staff-search value="${ui.esc(st.query)}" placeholder="Rechercher un nom, une fonction ou une filière…" aria-label="Rechercher dans le personnel"></label>
          <div class="chips mt" aria-label="Filtrer le personnel">
            ${filters.map(([value, label]) => `<button type="button" class="chip ${st.filter === value ? 'active' : ''}" data-staff-filter="${value}">${label} (${counts[value]})</button>`).join('')}
          </div>
          <p class="muted small mt" data-staff-count aria-live="polite">${resultCount()}</p>
          <div class="grid-2 mt" data-staff-results>${cards()}</div>
        </section>`;
    },
    mount(el, ctx) {
      el.addEventListener('input', (e) => {
        if (!e.target.matches('[data-staff-search]')) return;
        st.query = e.target.value;
        el.querySelector('[data-staff-count]').textContent = resultCount();
        el.querySelector('[data-staff-results]').innerHTML = cards();
      });
      el.addEventListener('click', (e) => {
        const button = e.target.closest('[data-staff-filter]');
        if (!button) return;
        st.filter = button.dataset.staffFilter;
        ctx.refresh();
      });
    },
  };
})();
