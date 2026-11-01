/* Centre de notifications */
(function () {
  const { ui, db, auth, date: D } = IST;
  const icon = IST.icon;
  const TONE = { annonce: 'blue', cours: 'red', evenement: 'purple', system: 'green' };

  IST.pages.notifications = {
    title: 'Notifications',
    subtitle: 'Ce qui a changé récemment',
    render({ user }) {
      const list = db.notifications(user);
      const read = new Set(user.readNotifs || []);
      const unread = list.filter((n) => !read.has(n.id)).length;
      return `
        <div class="row-between" style="margin-bottom:16px">
          <p class="text-2">${unread ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}</p>
          ${unread ? `<button class="btn btn-soft btn-sm" data-read-all>${icon('check')}Tout marquer comme lu</button>` : ''}
        </div>
        ${list.length ? `<div class="list">${list.map((n) => `
          <button class="list-item notif ${read.has(n.id) ? '' : 'unread'}" data-notif="${n.id}">
            <span class="ic-box sm tone-${TONE[n.type] || 'blue'}">${icon(n.icon || 'bell')}</span>
            <div class="grow"><strong>${ui.esc(n.title)}</strong><p>${ui.esc(n.body || '')}</p><small>${D.relative(n.date)}</small></div>
            ${read.has(n.id) ? '' : '<span class="unread-dot" aria-label="Non lue"></span>'}
          </button>`).join('')}</div>`
          : `<div class="card">${ui.empty('bell', 'Aucune notification', 'Tu seras prévenu ici des annonces et changements importants.')}</div>`}
        <p class="muted small mt">Tu peux choisir les notifications à recevoir dans <a class="link" href="#/profil">ton profil</a>.</p>`;
    },
    mount(el, ctx) {
      el.addEventListener('click', (e) => {
        const all = e.target.closest('[data-read-all]');
        const one = e.target.closest('[data-notif]');
        if (!all && !one) return;
        const read = new Set(ctx.user.readNotifs || []);
        if (all) db.notifications(ctx.user).forEach((n) => read.add(n.id));
        else read.add(one.dataset.notif);
        auth.update(ctx.user.id, { readNotifs: [...read] });
        if (one) {
          const n = db.find('notifications', one.dataset.notif);
          if (n && n.link) { location.hash = '#/' + n.link; return; }
        }
        ctx.refreshShell();
      });
    },
  };
})();
