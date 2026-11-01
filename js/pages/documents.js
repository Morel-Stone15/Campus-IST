/* Documents officiels */
(function () {
  const { ui, db, date: D } = IST;
  const icon = IST.icon;
  const st = { tab: 'reglement' };

  async function download(doc) {
    if (doc.fileId) {
      if (await IST.files.download(doc.fileId, doc.fileName || `${doc.title}.pdf`)) ui.toast('Téléchargement lancé.', 'success');
      else ui.toast('Fichier introuvable sur cet appareil.', 'error');
    } else if (doc.dataUrl) {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.fileName || `${doc.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      ui.toast('Téléchargement lancé.', 'success');
    } else if (doc.url) {
      window.open(doc.url, '_blank', 'noopener');
    } else {
      ui.toast("Ce document n'est pas encore disponible. L'administration le publiera bientôt.", 'info');
    }
  }

  const docIcon = (doc) => `<span class="doc-ic ${doc.category === 'reglement' ? '' : 'pdf'}">${icon('file')}<small>${ui.esc(doc.type || 'PDF')}</small></span>`;
  const docMeta = (doc) => [doc.type || 'PDF', doc.size, doc.version].filter(Boolean).map(ui.esc).join(' · ');

  IST.pages.documents = {
    title: 'Documents officiels',
    subtitle: 'Règlement, chartes, guides et procédures',
    render() {
      const all = db.all('documents');
      const list = all.filter((d) => d.category === st.tab);
      const others = all.filter((d) => d.category !== 'reglement');
      let body;
      if (st.tab === 'reglement') {
        body = list.map((doc) => `
          <div class="card doc-feature">
            ${docIcon(doc)}
            <div class="grow"><strong>${ui.esc(doc.title)}</strong><p class="muted small">${docMeta(doc)}</p>
              <p class="muted small">Mis à jour le ${D.fmt(doc.updated, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
            <button class="btn btn-primary" data-dl="${doc.id}">${icon('download')}<span class="desktop-only">Télécharger</span></button>
          </div>`).join('') || `<div class="card">${ui.empty('file', 'Aucun document')}</div>`;
        if (others.length) {
          body += `<section class="section"><div class="section-head"><h2>Autres documents</h2><button class="link" data-tab="autres">Voir tout${icon('chevronRight')}</button></div>
            <div class="grid-2">${others.slice(0, 4).map(docRow).join('')}</div></section>`;
        }
      } else {
        body = list.length ? `<div class="grid-2">${list.map(docRow).join('')}</div>` : `<div class="card">${ui.empty('file', 'Aucun document')}</div>`;
      }
      return `
        <div class="page-tabs">${ui.seg([['reglement', 'Règlement intérieur'], ['autres', 'Autres documents']], st.tab, 'tab')}</div>
        <div class="stack">${body}</div>
        <div class="info-box mt-lg">${icon('info')}<div><b>Reste informé !</b>Les documents officiels sont mis à jour par l'administration. Tu recevras une notification à chaque nouvelle version.</div></div>`;
    },
    mount(el, ctx) {
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab], [data-dl]');
        if (!t) return;
        if (t.dataset.tab) { st.tab = t.dataset.tab; ctx.refresh(); }
        else download(db.find('documents', t.dataset.dl));
      });
    },
  };

  function docRow(doc) {
    return `<div class="card doc">
      ${docIcon(doc)}
      <div class="grow"><strong>${ui.esc(doc.title)}</strong><small class="muted">${docMeta(doc)}</small></div>
      <button class="icon-btn outline" data-dl="${doc.id}" aria-label="Télécharger ${ui.esc(doc.title)}">${icon('download')}</button>
    </div>`;
  }
})();
