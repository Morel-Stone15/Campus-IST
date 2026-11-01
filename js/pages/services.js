/* Services du campus */
(function () {
  const { ui, date: D } = IST;
  const icon = IST.icon;

  const CARDS = [
    { id: 'restaurant', title: 'Restauration', sub: 'Horaires, menus et tarifs', icon: 'utensils', tone: 'orange' },
    { id: 'infirmerie', title: 'Infirmerie', sub: 'Soins et contacts', icon: 'medical', tone: 'pink' },
    { id: 'bibliotheque', title: 'Bibliothèque', sub: 'Horaires et ressources', icon: 'library', tone: 'red' },
    { id: 'sport', title: 'Aires de jeux et sport', sub: 'Loisirs et détente', icon: 'ball', tone: 'green' },
    { id: 'soutien', title: 'Soutien psychologique', sub: 'Écoute confidentielle', icon: 'heart', tone: 'purple' },
    { id: 'urgences', title: "Numéros d'urgence", sub: 'En cas de besoin', icon: 'phone', tone: 'red' },
  ];

  function restaurantOpen() {
    const r = IST.data.services.restaurant.open;
    const now = new Date();
    const day = now.getDay();
    if (!r.days.includes(day)) return false;
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= D.toMin(r.from) && m < D.toMin(r.to[day] || r.to.default);
  }

  const kv = (rows) => `<div class="kv">${rows.map(([k, v]) => `<div><span>${ui.esc(k)}</span><span>${ui.esc(v)}</span></div>`).join('')}</div>`;
  const tel = (p) => `tel:${p.replace(/\s/g, '')}`;

  function generic(s) {
    return `
      <p class="prose">${ui.esc(s.description)}</p>
      <h4 class="h-sub">Horaires</h4>${kv(s.hours)}
      <h4 class="h-sub">Où nous trouver</h4>
      <div class="detail-rows">
        <div><span class="ic-box sm">${icon('pin')}</span><div>${ui.esc(s.location)}</div></div>
        ${s.phone ? `<div><span class="ic-box sm">${icon('phone')}</span><div><a class="link" href="${tel(s.phone)}">${ui.esc(s.phone)}</a></div></div>` : ''}
      </div>`;
  }

  function restaurant() {
    const r = IST.data.services.restaurant;
    const wd = new Date().getDay();
    const today = r.menu[wd];
    const days = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return `
      <div class="menu-today">
        <div class="row-between"><strong>Menu du jour</strong>${restaurantOpen() ? '<span class="tag tone-green">Ouvert maintenant</span>' : '<span class="tag tone-red">Fermé</span>'}</div>
        ${today ? `<ul>${today.map((m) => `<li>${icon('check')}${ui.esc(m)}</li>`).join('')}</ul>` : '<p class="muted small mt">Pas de service aujourd\'hui.</p>'}
      </div>
      <h4 class="h-sub">Horaires</h4>${kv(r.hours)}
      <h4 class="h-sub">Tarifs</h4>${kv(r.prices)}
      <h4 class="h-sub">Menus de la semaine</h4>
      <div class="kv">${Object.entries(r.menu).map(([d, items]) => `<div><span>${days[d]}</span><span>${ui.esc(items.join(', '))}</span></div>`).join('')}</div>
      <p class="muted small mt">${icon('pin')} ${ui.esc(r.location)}</p>`;
  }

  function urgences() {
    return `<p class="text-2">Appuie sur un numéro pour appeler directement.</p>
      <div class="list mt">${IST.data.services.urgences.map(([label, num, ic]) => `
        <a class="list-item" href="${tel(num)}"><span class="ic-box sm tone-red">${icon(ic)}</span>
          <div class="grow"><strong>${ui.esc(label)}</strong><small>${ui.esc(num)}</small></div>${icon('phone')}</a>`).join('')}</div>`;
  }

  function open(id) {
    const card = CARDS.find((c) => c.id === id);
    const s = IST.data.services[id];
    const body = id === 'restaurant' ? restaurant() : id === 'urgences' ? urgences() : generic(s);
    ui.sheet({ title: card.title, body: `<div class="tone-${card.tone}">${body}</div>`, size: id === 'restaurant' ? 'wide' : '' });
  }

  IST.pages.services = {
    title: 'Services du campus',
    subtitle: 'Tout ce dont tu as besoin au quotidien',
    render() {
      const resto = restaurantOpen();
      return `
        <div class="grid-3">${CARDS.map((c) => `
          <button type="button" class="card service-card tone-${c.tone}" data-service="${c.id}">
            <span class="ic-box lg">${icon(c.icon)}</span>
            <div><strong>${c.title}</strong><small>${c.sub}</small></div>
            ${c.id === 'restaurant' ? `<span class="status tag ${resto ? 'tone-green' : 'tone-red'}">${resto ? 'Ouvert maintenant' : 'Fermé actuellement'}</span>` : ''}
          </button>`).join('')}
        </div>
        <div class="promo mt-lg">
          ${ui.campusArt()}
          <h3>Le campus à portée de main</h3>
          <p>Trouve facilement tous les services qui te sont utiles sur le plan interactif.</p>
          <a class="btn btn-white btn-sm mt" style="align-self:flex-start" href="#/plan">${icon('map')}Ouvrir le plan</a>
        </div>`;
    },
    mount(el) {
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-service]');
        if (t) open(t.dataset.service);
      });
    },
  };
})();
