/* Documents & supports de cours */
(function () {
  const { ui, db, auth, date: D, config: cfg } = IST;
  const icon = IST.icon;
  const st = { tab: 'cours', q: '' };

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo

  // Génère un contenu officiel téléchargeable si le document n'a pas encore de fichier joint
  function generateFallbackBlob(doc) {
    const text = `==========================================================\n` +
      `  INSTITUT SUPÉRIEUR DE TECHNOLOGIE (IST)\n` +
      `  DOCUMENT OFFICIEL : ${doc.title.toUpperCase()}\n` +
      `==========================================================\n\n` +
      `Titre : ${doc.title}\n` +
      `Catégorie : ${doc.category || 'Général'}\n` +
      `Date de mise à jour : ${doc.updated || new Date().toISOString().slice(0, 10)}\n` +
      `Auteur / Émetteur : ${doc.author || 'Administration IST'}\n` +
      `${doc.filiere && doc.filiere !== '*' ? 'Filière : ' + doc.filiere + '\n' : ''}` +
      `${doc.niveau && doc.niveau !== '*' ? 'Niveau : ' + doc.niveau + '\n' : ''}` +
      `\n----------------------------------------------------------\n` +
      `Description & Détails :\n` +
      `${doc.description || "Ce document est un support pédagogique / officiel validé par l'Institut Supérieur de Technologie."}\n\n` +
      `Retrouvez toutes les informations sur Campus+ : https://morel-stone15.github.io/Campus-IST/\n` +
      `Campus+ IST · Ensemble vers l'excellence.\n`;
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }

  async function download(doc) {
    if (!doc) return;

    // 1. Lien URL externe
    if (doc.url && doc.url.startsWith('http')) {
      window.open(doc.url, '_blank', 'noopener');
      ui.toast('Ouverture du document...', 'info');
      return;
    }

    // 2. Fichier stocké en dataURL (base64)
    if (doc.dataUrl) {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.fileName || `${doc.title}.${(doc.type || 'pdf').toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      ui.toast(`Téléchargement de « ${doc.title} » lancé.`, 'success');
      return;
    }

    // 3. Fichier stocké dans IndexedDB local
    if (doc.fileId) {
      const ok = await IST.files.download(doc.fileId, doc.fileName || `${doc.title}.${(doc.type || 'pdf').toLowerCase()}`);
      if (ok) {
        ui.toast(`Téléchargement de « ${doc.title} » lancé.`, 'success');
        return;
      }
    }

    // 4. Téléchargement depuis l'API REST Campus+ si disponible
    if (doc.apiId && window.IST.api) {
      try {
        const token = window.IST.api.getToken();
        const res = await fetch(`${window.IST.api.base}/documents/${doc.apiId}/download`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.fileName || `${doc.title}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          ui.toast('Téléchargement lancé.', 'success');
          return;
        }
      } catch (e) {}
    }

    // 5. Fallback élégant : générer le fichier texte officiel
    const blob = generateFallbackBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    ui.toast(`Document officiel « ${doc.title} » téléchargé.`, 'success');
  }

  function getDocColor(type) {
    const t = String(type || 'pdf').toUpperCase();
    if (t.includes('PDF')) return 'pdf';
    if (t.includes('DOC')) return 'blue';
    if (t.includes('PPT')) return 'orange';
    if (t.includes('XLS')) return 'green';
    if (t.includes('ZIP')) return 'purple';
    return 'blue';
  }

  const docIcon = (doc) => `<span class="doc-ic ${getDocColor(doc.type)}">${icon('file')}<small>${ui.esc(doc.type || 'PDF')}</small></span>`;
  const docMeta = (doc) => [
    doc.type || 'PDF',
    doc.size || 'Disponible',
    doc.author ? `Par ${doc.author}` : null,
    doc.filiere && doc.filiere !== '*' ? doc.filiere : null,
    doc.niveau && doc.niveau !== '*' ? doc.niveau : null,
    doc.version
  ].filter(Boolean).map(ui.esc).join(' · ');

  function canManage(u) {
    return Boolean(u && (u.role === 'admin' || u.role === 'enseignant' || u.role === 'chef' || u.role === 'staff' || u.role === 'communication'));
  }

  function addDocModal(ctx) {
    const u = ctx.user || auth.current() || {};
    const filiereOpts = [['*', 'Toutes les filières'], ...IST.school.filiereOptions()];
    const niveauOpts = [['*', 'Tous les niveaux'], ...cfg.niveaux.map((n) => [n, IST.school.levelLabel(n)])];

    const s = ui.sheet({
      title: 'Ajouter un document ou support de cours',
      body: `<form class="admin-form stack-lg" id="doc-add-form" novalidate>
        ${ui.field({ name: 'title', label: 'Titre du document', placeholder: 'Ex. Support Chapitre 1 - Algorithmique et structures de données', required: true })}
        <div class="form-row">
          ${ui.field({ name: 'category', label: 'Catégorie', type: 'select', options: [
            ['cours', 'Support de cours & TD/TP'],
            ['reglement', 'Règlement & Chartes'],
            ['autres', 'Guides & Procédures officielles'],
          ], value: 'cours' })}
          ${ui.field({ name: 'author', label: 'Enseignant / Auteur', value: `${u.prenom || ''} ${u.nom || ''}`.trim() || 'Enseignant IST', required: true })}
        </div>
        <div class="form-row">
          ${ui.field({ name: 'filiere', label: 'Filière visée', type: 'select', options: filiereOpts, value: u.filiere || '*' })}
          ${ui.field({ name: 'niveau', label: 'Niveau visé', type: 'select', options: niveauOpts, value: u.niveau || '*' })}
        </div>
        ${ui.field({ name: 'description', label: 'Description ou consignes (optionnel)', type: 'textarea', rows: 2, placeholder: 'Ex. Cours magistral, à lire avant la séance de TD du vendredi.' })}
        
        <div class="field" data-field="file">
          <label>Fichier à joindre (PDF, Word, PowerPoint, Excel, ZIP…)</label>
          <label class="file-drop">
            ${icon('upload')}
            <span data-file-name>Cliquez pour choisir un fichier sur votre appareil…</span>
            <input type="file" name="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg">
          </label>
          <small class="hint">Taille maximale recommandée : 15 Mo.</small>
          <small class="err"></small>
        </div>

        ${ui.field({ name: 'url', label: 'Ou lien de téléchargement externe (Google Drive, Dropbox…)', type: 'url', placeholder: 'https://...', optional: true })}
        
        <label class="check">
          <input type="checkbox" name="notify" checked>
          Envoyer une notification immédiate aux étudiants concernés
        </label>
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" type="submit" form="doc-add-form">${icon('upload')}Publier le document</button>`,
    });

    const f = s.el.querySelector('#doc-add-form');
    const btn = s.el.querySelector('button[type=submit]');

    f.addEventListener('change', (e) => {
      if (e.target.type === 'file') {
        const file = e.target.files[0];
        f.querySelector('[data-file-name]').textContent = file
          ? `${file.name} (${ui.sizeLabel(file.size)})`
          : 'Cliquez pour choisir un fichier…';
        // Effacer l'erreur précédente
        ui.setErr(f, 'file', '');
      }
    });

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = ui.formData(f);

      // Validations
      ui.setErr(f, 'title', d.title.trim() ? '' : 'Indiquez le titre du document.');
      if (!d.title.trim()) return;

      const file = f.querySelector('input[type=file]').files[0];
      const hasSource = file || (d.url && d.url.trim().startsWith('http'));
      if (!hasSource) {
        ui.setErr(f, 'file', 'Joignez un fichier ou entrez un lien de téléchargement.');
        return;
      }
      if (file && file.size > MAX_FILE_SIZE) {
        ui.setErr(f, 'file', 'Le fichier dépasse la taille maximale autorisée (15 Mo).');
        return;
      }

      ui.busy(btn, true);

      let dataUrl = '';
      let fileMeta = null;

      if (file) {
        try {
          // 1. Sauvegarder dans IndexedDB (stockage local fiable)
          fileMeta = await IST.files.save(file, 'doc');

          // 2. Si ≤ 4 Mo → convertir en DataURL pour portabilité multi-appareils
          if (file.size <= 4 * 1024 * 1024) {
            dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload  = () => resolve(reader.result);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });
          }
        } catch (err) {
          console.error('Erreur stockage local fichier:', err);
          ui.toast('Erreur lors de la sauvegarde locale du fichier.', 'error');
          ui.busy(btn, false);
          return;
        }
      }

      const ext     = file ? (file.name.split('.').pop() || 'PDF').toUpperCase() : 'PDF';
      const sizeStr = file ? ui.sizeLabel(file.size) : (d.url ? 'Lien web' : 'Texte');

      const newDoc = {
        title:       d.title.trim(),
        category:    d.category || 'cours',
        author:      (d.author || '').trim() || 'Enseignant IST',
        filiere:     d.filiere || '*',
        niveau:      d.niveau  || '*',
        description: (d.description || '').trim(),
        version:     d.version || D.fmt(new Date(), { month: 'short', year: 'numeric' }),
        type:        ext,
        size:        sizeStr,
        fileName:    file ? file.name : `${d.title.trim()}.${ext.toLowerCase()}`,
        fileId:      fileMeta ? fileMeta.fileId : null,
        dataUrl,
        url:         (d.url || '').trim(),
        updated:     D.iso(new Date()),
        uploadedBy:  u.id || 'staff',
      };

      // Upload serveur en arrière-plan (non bloquant)
      if (file && window.IST.api && window.IST.api.getToken && window.IST.api.getToken() && location.protocol !== 'file:') {
        (async () => {
          try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('title', newDoc.title);
            fd.append('description', newDoc.description);
            fd.append('is_public', 'true');
            const token  = window.IST.api.getToken();
            const apiRes = await fetch(`${window.IST.api.base}/documents/`, {
              method:  'POST',
              headers: { Authorization: `Bearer ${token}` },
              body:    fd,
            });
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData.data && apiData.data.id) {
                // Mettre à jour l'entrée locale avec l'ID API
                const docs = IST.db.all('documents');
                const idx  = docs.findIndex((x) => x.fileId === newDoc.fileId);
                if (idx >= 0) { docs[idx].apiId = apiData.data.id; IST.db.save('documents', docs); }
              }
            }
          } catch (err) {
            console.warn('Upload serveur (arrière-plan) :', err);
          }
        })();
      }

      // Enregistrement local immédiat
      const added = db.add('documents', newDoc);
      if (!added) {
        ui.toast("Impossible d'enregistrer le document (stockage plein ?).", 'error');
        ui.busy(btn, false);
        return;
      }

      // Notification pour les étudiants concernés
      if (d.notify !== false) {
        db.notify({
          type:   'annonce',
          icon:   'file',
          title:  `Nouveau document : ${newDoc.title}`,
          body:   `Publié par ${newDoc.author}. Disponible au téléchargement dans Documents & Cours.`,
          link:   'documents',
          filiere: newDoc.filiere,
          niveau:  newDoc.niveau,
        });
      }

      ui.busy(btn, false);
      s.close();
      ui.toast(`Document « ${newDoc.title} » publié avec succès !`, 'success');
      ctx.refresh();
    });
  }

  IST.pages.documents = {
    title: 'Documents & Cours',
    subtitle: 'Supports de cours, TD/TP, règlements et procédures à télécharger',
    render({ user }) {
      const u = user || auth.current();
      const all = db.all('documents');
      const q = st.q.trim().toLowerCase();

      // Filtrage par onglet
      let list = all;
      if (st.tab !== 'tous') {
        if (st.tab === 'cours') {
          list = all.filter((d) => d.category === 'cours' || d.category === 'td_tp');
        } else if (st.tab === 'reglement') {
          list = all.filter((d) => d.category === 'reglement');
        } else if (st.tab === 'autres') {
          list = all.filter((d) => d.category === 'autres' || (!['cours', 'td_tp', 'reglement'].includes(d.category)));
        }
      }

      // Filtrage par recherche
      if (q) {
        list = list.filter((d) =>
          (d.title + ' ' + (d.author || '') + ' ' + (d.description || '') + ' ' + (d.filiere || '')).toLowerCase().includes(q)
        );
      }

      const allowAdd = canManage(u);

      const headerActions = allowAdd
        ? `<div class="row-between mb" style="flex-wrap:wrap;gap:12px">
            <div class="grow"><span class="badge tone-blue">${icon('shield')} Mode Enseignant / Administration : Vous pouvez ajouter et partager des supports.</span></div>
            <button class="btn btn-primary" data-add-doc>${icon('plus')}Ajouter un document de cours</button>
          </div>`
        : '';

      const countBadge = (cat) => {
        if (cat === 'tous') return all.length;
        if (cat === 'cours') return all.filter((d) => d.category === 'cours' || d.category === 'td_tp').length;
        if (cat === 'reglement') return all.filter((d) => d.category === 'reglement').length;
        return all.filter((d) => d.category === 'autres' || (!['cours', 'td_tp', 'reglement'].includes(d.category))).length;
      };

      const tabs = [
        ['cours', `Supports de cours (${countBadge('cours')})`],
        ['reglement', `Règlement & Chartes (${countBadge('reglement')})`],
        ['autres', `Autres documents (${countBadge('autres')})`],
        ['tous', `Tous (${countBadge('tous')})`],
      ];

      let body = '';
      if (!list.length) {
        body = `<div class="card">${ui.empty('file', 'Aucun document trouvé', q ? 'Essaie une autre recherche.' : 'Aucun document n\'a encore été partagé dans cette rubrique.')}</div>`;
      } else {
        body = `<div class="grid-2">${list.map((d) => docCard(d, allowAdd)).join('')}</div>`;
      }

      return `
        ${headerActions}
        <div class="toolbar mb">
          <label class="searchbar">${icon('search')}<span class="sr-only">Rechercher un cours ou un document</span>
            <input type="search" placeholder="Rechercher par matière, mot-clé, enseignant…" value="${ui.esc(st.q)}" data-search>
          </label>
        </div>
        <div class="page-tabs">${ui.seg(tabs, st.tab, 'tab')}</div>
        <div class="stack">${body}</div>
        <div class="info-box mt-lg">${icon('download')}<div><b>Téléchargements illimités</b>Tous les supports déposés par vos enseignants restent téléchargeables 24h/24 pour réviser hors-connexion.</div></div>
      `;
    },

    mount(el, ctx) {
      const searchInput = el.querySelector('[data-search]');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          st.q = e.target.value;
          ctx.refresh();
        });
      }

      el.addEventListener('click', async (e) => {
        // Bouton d'ajout
        if (e.target.closest('[data-add-doc]')) {
          addDocModal(ctx);
          return;
        }

        // Bouton onglet
        const tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) {
          st.tab = tabBtn.dataset.tab;
          ctx.refresh();
          return;
        }

        // Bouton de suppression (Admin / Enseignant)
        const delBtn = e.target.closest('[data-del-doc]');
        if (delBtn) {
          const docId = delBtn.dataset.delDoc;
          const doc = db.find('documents', docId);
          if (!doc) return;
          if (await ui.confirm(`Voulez-vous vraiment supprimer le document « ${doc.title} » ?`, { ok: 'Supprimer', danger: true })) {
            if (doc.fileId) IST.files.del(doc.fileId).catch(() => {});
            db.remove('documents', docId);
            ui.toast('Document supprimé.', 'success');
            ctx.refresh();
          }
          return;
        }

        // Bouton de téléchargement
        const dlBtn = e.target.closest('[data-dl]');
        if (dlBtn) {
          const doc = db.find('documents', dlBtn.dataset.dl);
          if (doc) download(doc);
        }
      });
    },
  };

  function docCard(doc, allowManage) {
    const isOwner = allowManage;
    const catLabel = doc.category === 'cours' ? 'Support de cours'
      : (doc.category === 'td_tp' ? 'TD / TP'
      : (doc.category === 'reglement' ? 'Règlement' : 'Document officiel'));

    return `
      <div class="card doc doc-card-enhanced" style="position:relative;display:flex;flex-direction:column;gap:12px;padding:16px;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          ${docIcon(doc)}
          <div class="grow" style="min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
              <span class="tag tone-blue" style="font-size:11px;">${ui.esc(catLabel)}</span>
              ${doc.filiere && doc.filiere !== '*' ? `<span class="tag" style="font-size:11px;">${ui.esc(doc.filiere)}</span>` : ''}
              ${doc.niveau && doc.niveau !== '*' ? `<span class="tag" style="font-size:11px;">${ui.esc(doc.niveau)}</span>` : ''}
            </div>
            <strong style="font-size:15px;line-height:1.3;display:block;">${ui.esc(doc.title)}</strong>
            ${doc.description ? `<p class="muted small" style="margin:4px 0 0 0;line-height:1.3;">${ui.esc(doc.description)}</p>` : ''}
          </div>
          ${isOwner ? `<button class="icon-btn" data-del-doc="${doc.id}" aria-label="Supprimer le document" title="Supprimer" style="color:#e02d3c;">${icon('trash')}</button>` : ''}
        </div>
        <div class="row-between" style="border-top:1px solid var(--border,#e2e8f0);padding-top:10px;margin-top:auto;font-size:12px;color:var(--text-muted,#64748b);">
          <div>
            <span>${ui.esc(docMeta(doc))}</span>
            ${doc.updated ? `<div style="font-size:11px;margin-top:2px;">Mis à jour le ${D.fmt(doc.updated, { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}
          </div>
          <button class="btn btn-primary btn-sm" data-dl="${doc.id}" style="display:inline-flex;align-items:center;gap:6px;">
            ${icon('download')}<span>Télécharger</span>
          </button>
        </div>
      </div>
    `;
  }
})();
