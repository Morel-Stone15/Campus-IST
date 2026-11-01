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

  function currentServices() {
    return IST.db ? IST.db.services() : IST.data.services;
  }

  function isAdmin() {
    const u = IST.auth ? IST.auth.user() : null;
    return !!(u && (u.role === 'admin' || (u.staffCode && u.staffCode.startsWith('IST-SYS'))));
  }

  function restaurantOpen() {
    const r = currentServices().restaurant.open;
    const now = new Date();
    const day = now.getDay();
    if (!r.days.includes(day)) return false;
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= D.toMin(r.from) && m < D.toMin(r.to[day] || r.to.default);
  }

  const kv = (rows) => `<div class="kv">${(rows || []).map(([k, v]) => `<div><span>${ui.esc(k)}</span><span>${ui.esc(v)}</span></div>`).join('')}</div>`;
  const tel = (p) => `tel:${(p || '').replace(/\s/g, '')}`;

  function generic(s) {
    return `
      <p class="prose">${ui.esc(s.description || '')}</p>
      <h4 class="h-sub">Horaires</h4>${kv(s.hours || [])}
      <h4 class="h-sub">Où nous trouver</h4>
      <div class="detail-rows">
        <div><span class="ic-box sm">${icon('pin')}</span><div>${ui.esc(s.location || 'Campus IST')}</div></div>
        ${s.phone ? `<div><span class="ic-box sm">${icon('phone')}</span><div><a class="link" href="${tel(s.phone)}">${ui.esc(s.phone)}</a></div></div>` : ''}
      </div>`;
  }

  function restaurant() {
    const r = currentServices().restaurant;
    const wd = new Date().getDay();
    const today = (r.menu || {})[wd];
    const days = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return `
      <div class="menu-today">
        <div class="row-between"><strong>Menu du jour</strong>${restaurantOpen() ? '<span class="tag tone-green">Ouvert maintenant</span>' : '<span class="tag tone-red">Fermé</span>'}</div>
        ${today ? `<ul>${today.map((m) => `<li>${icon('check')}${ui.esc(m)}</li>`).join('')}</ul>` : '<p class="muted small mt">Pas de service aujourd\'hui.</p>'}
      </div>
      <h4 class="h-sub">Horaires</h4>${kv(r.hours || [])}
      <h4 class="h-sub">Tarifs</h4>${kv(r.prices || [])}
      <h4 class="h-sub">Menus de la semaine</h4>
      <div class="kv">${Object.entries(r.menu || {}).map(([d, items]) => `<div><span>${days[d] || d}</span><span>${ui.esc((items || []).join(', '))}</span></div>`).join('')}</div>
      <p class="muted small mt">${icon('pin')} ${ui.esc(r.location || 'Restaurant du campus')}${r.phone ? ' · ' + icon('phone') + ' ' + ui.esc(r.phone) : ''}</p>`;
  }

  function urgences() {
    return `<p class="text-2">Appuie sur un numéro pour appeler directement.</p>
      <div class="list mt">${(currentServices().urgences || []).map(([label, num, ic]) => `
        <a class="list-item" href="${tel(num)}"><span class="ic-box sm tone-red">${icon(ic || 'phone')}</span>
          <div class="grow"><strong>${ui.esc(label)}</strong><small>${ui.esc(num)}</small></div>${icon('phone')}</a>`).join('')}</div>`;
  }

  function open(id, refreshCtx) {
    const card = CARDS.find((c) => c.id === id);
    const s = currentServices()[id] || {};
    const body = id === 'restaurant' ? restaurant() : id === 'urgences' ? urgences() : generic(s);
    const adminAction = isAdmin()
      ? `<div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border,#cbd5e1);" class="row-between">
           <small class="muted">Espace Admin Système</small>
           <button class="btn btn-primary btn-sm" data-edit-service="${id}">${icon('edit')}Modifier ce service</button>
         </div>`
      : '';

    const sheet = ui.sheet({
      title: card.title,
      body: `<div class="tone-${card.tone}">${body}${adminAction}</div>`,
      size: id === 'restaurant' ? 'wide' : '',
    });

    if (isAdmin()) {
      sheet.el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-edit-service]');
        if (btn) {
          sheet.close();
          openEditModal(btn.dataset.editService, refreshCtx);
        }
      });
    }
  }

  /* ---------- Modal de modification (Admin Système) ---------- */
  function openEditModal(serviceId, refreshCtx) {
    const s = currentServices();
    const item = s[serviceId] || {};
    const card = CARDS.find((c) => c.id === serviceId) || { title: 'Service' };

    let fieldsHtml = '';

    if (serviceId === 'urgences') {
      const urgText = (s.urgences || []).map(([label, num]) => `${label} : ${num}`).join('\n');
      fieldsHtml = `
        <div class="info-box tone-red mb-md">${icon('alert')}<div><b>Numéros d'urgence du campus</b>Indiquez un numéro par ligne au format : <code>Nom du service : Numéro</code></div></div>
        ${ui.field({ name: 'urgences', label: 'Liste des numéros', type: 'textarea', rows: 8, value: urgText, required: true, hint: 'Exemple :\nSAMU : 1300\nPompiers : 18\nPolice : 1730\nInfirmerie du campus : +241 01 76 34 50\nSécurité campus : +241 07 00 00 00' })}
      `;
    } else if (serviceId === 'restaurant') {
      const r = s.restaurant || {};
      const menuLines = Object.entries(r.menu || {}).map(([d, items]) => `${d}:${(items || []).join(', ')}`).join('\n');
      const pricesLines = (r.prices || []).map(([k, v]) => `${k} : ${v}`).join('\n');
      const hoursLines = (r.hours || []).map(([k, v]) => `${k} : ${v}`).join('\n');

      fieldsHtml = `
        <div class="form-row">
          ${ui.field({ name: 'location', label: 'Localisation', value: r.location || 'Restaurant du campus' })}
          ${ui.field({ name: 'phone', label: 'Téléphone / Contact', value: r.phone || '', optional: true, placeholder: '+241 01 00 00 00' })}
        </div>
        ${ui.field({ name: 'hours', label: 'Horaires du restaurant', type: 'textarea', rows: 3, value: hoursLines, hint: 'Une ligne par plage, ex. Lundi – Vendredi : 11h30 – 14h30' })}
        ${ui.field({ name: 'prices', label: 'Tarifs des repas', type: 'textarea', rows: 4, value: pricesLines, hint: 'Une ligne par tarif, ex. Plat du jour : 1 000 FCFA' })}
        ${ui.field({ name: 'menus', label: 'Menus de la semaine (1=Lun ... 6=Sam)', type: 'textarea', rows: 5, value: menuLines, hint: 'Format : 1:Poulet nyembwe, Riz, Salade' })}
      `;
    } else {
      const hoursLines = (item.hours || []).map(([k, v]) => `${k} : ${v}`).join('\n');
      fieldsHtml = `
        <div class="form-row">
          ${ui.field({ name: 'phone', label: 'Téléphone direct / Contact', value: item.phone || '', placeholder: '+241 01 00 00 00' })}
          ${ui.field({ name: 'location', label: 'Localisation sur le campus', value: item.location || '' })}
        </div>
        ${ui.field({ name: 'hours', label: 'Horaires d\'ouverture', type: 'textarea', rows: 3, value: hoursLines, hint: 'Une ligne par plage horaire, ex. Lundi – Vendredi : 7h30 – 17h00' })}
        ${ui.field({ name: 'description', label: 'Description & Services proposés', type: 'textarea', rows: 4, value: item.description || '' })}
      `;
    }

    const modal = ui.sheet({
      title: `Modifier : ${card.title}`,
      body: `
        <form id="edit-service-form" class="admin-form stack-lg" novalidate>
          ${fieldsHtml}
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" data-close>Annuler</button>
        <button class="btn btn-primary" type="submit" form="edit-service-form">${icon('check')}Enregistrer les modifications</button>
      `,
      size: 'wide',
    });

    const f = modal.el.querySelector('#edit-service-form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const d = Object.fromEntries(fd.entries());
      const allServices = { ...currentServices() };

      if (serviceId === 'urgences') {
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
        allServices.urgences = parsed.length ? parsed : allServices.urgences;
      } else if (serviceId === 'restaurant') {
        const r = allServices.restaurant || {};
        const hours = (d.hours || '').split('\n').map((l) => l.split(':').map((x) => x.trim())).filter((x) => x.length >= 2);
        const prices = (d.prices || '').split('\n').map((l) => l.split(':').map((x) => x.trim())).filter((x) => x.length >= 2);
        const menu = {};
        (d.menus || '').split('\n').forEach((l) => {
          const parts = l.split(':');
          if (parts.length >= 2) {
            const dayNum = parseInt(parts[0].trim(), 10);
            if (dayNum) menu[dayNum] = parts.slice(1).join(':').split(',').map((x) => x.trim()).filter(Boolean);
          }
        });
        allServices.restaurant = {
          ...r,
          location: (d.location || '').trim() || r.location,
          phone: (d.phone || '').trim() || r.phone,
          hours: hours.length ? hours : r.hours,
          prices: prices.length ? prices : r.prices,
          menu: Object.keys(menu).length ? menu : r.menu,
        };
      } else {
        const hours = (d.hours || '').split('\n').map((l) => l.split(':').map((x) => x.trim())).filter((x) => x.length >= 2);
        allServices[serviceId] = {
          ...(allServices[serviceId] || {}),
          phone: (d.phone || '').trim(),
          location: (d.location || '').trim(),
          description: (d.description || '').trim(),
          hours: hours.length ? hours : (allServices[serviceId] || {}).hours,
        };
      }

      if (IST.db && IST.db.setSetting) {
        IST.db.setSetting('services', allServices);
        if (IST.db.flushRemote) await IST.db.flushRemote();
      }

      modal.close();
      ui.toast(`Informations du service « ${card.title} » mises à jour !`, 'success');
      if (IST.render) IST.render();
      else if (refreshCtx && refreshCtx.refresh) refreshCtx.refresh();
    });
  }

  IST.pages.services = {
    title: 'Services du campus',
    subtitle: 'Tout ce dont tu as besoin au quotidien',
    render(ctx) {
      const resto = restaurantOpen();
      const adminHeader = isAdmin()
        ? `
          <div class="card tone-blue row-between mb-lg" style="padding:14px 18px;border-radius:12px;background:var(--surface-variant,#f8fafc);border:1px solid var(--border,#cbd5e1);">
            <div class="row" style="gap:12px;">
              <span class="ic-box sm tone-blue">${icon('shield')}</span>
              <div>
                <strong>Espace Administrateur Système</strong>
                <small class="muted" style="display:block;">Cliquez sur n'importe quel service pour modifier ses numéros, horaires et détails.</small>
              </div>
            </div>
            <a class="btn btn-primary btn-sm" href="#/admin">${icon('settings')}Gestion globale</a>
          </div>
        `
        : '';

      return `
        ${adminHeader}
        <div class="grid-3">${CARDS.map((c) => `
          <button type="button" class="card service-card tone-${c.tone}" data-service="${c.id}">
            <span class="ic-box lg">${icon(c.icon)}</span>
            <div><strong>${c.title}</strong><small>${c.sub}</small></div>
            ${c.id === 'restaurant' ? `<span class="status tag ${resto ? 'tone-green' : 'tone-red'}">${resto ? 'Ouvert maintenant' : 'Fermé actuellement'}</span>` : ''}
            ${isAdmin() ? `<span class="tag tone-blue" style="margin-top:6px;font-size:11px;">${icon('edit')}Modifier</span>` : ''}
          </button>`).join('')}
        </div>
        <div class="promo mt-lg">
          ${ui.campusArt()}
          <h3>Le campus à portée de main</h3>
          <p>Trouve facilement tous les services qui te sont utiles sur le plan interactif.</p>
          <a class="btn btn-white btn-sm mt" style="align-self:flex-start" href="#/plan">${icon('map')}Ouvrir le plan</a>
        </div>`;
    },
    mount(el, ctx) {
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-service]');
        if (t) open(t.dataset.service, ctx);
      });
    },
  };
})();
