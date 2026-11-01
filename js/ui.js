/* ==========================================================
   Outils d'interface partagés : dates, toasts, fenêtres,
   champs de formulaire, cartes réutilisables.
   ========================================================== */
(function () {
  const IST = (window.IST = window.IST || {});
  IST.pages = IST.pages || {};
  const icon = (...a) => IST.icon(...a);

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Dates ---------- */
  const D = {
    iso(d) {
      const z = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
    },
    toDate(x) {
      if (x instanceof Date) return x;
      if (typeof x === 'string' && x.length === 10) {
        const [y, m, d] = x.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(x);
    },
    addDays(d, n) {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    },
    startOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },
    startOfWeek(d) {
      const r = D.startOfDay(d);
      r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
      return r;
    },
    diffDays(a, b) {
      return Math.round((D.startOfDay(D.toDate(b)) - D.startOfDay(D.toDate(a))) / 864e5);
    },
    toMin(t) {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    },
    hm: (t) => (t ? t.replace(':', 'h') : ''),
    fmt: (d, opts) => new Intl.DateTimeFormat('fr-FR', opts).format(D.toDate(d)),
    long: (d) => cap(D.fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
    dayMonth: (d) => D.fmt(d, { day: 'numeric', month: 'long' }),
    weekday: (d) => cap(D.fmt(d, { weekday: 'long' })),
    relative(x) {
      const n = D.diffDays(new Date(), x);
      if (n === 0) return "Aujourd'hui";
      if (n === -1) return 'Hier';
      if (n === 1) return 'Demain';
      if (n < 0 && n > -7) return `Il y a ${-n} jours`;
      if (n > 1 && n < 7) return `Dans ${n} jours`;
      return D.fmt(x, { day: 'numeric', month: 'short', year: 'numeric' });
    },
    duration(min) {
      if (min < 60) return `${min} min`;
      const h = Math.floor(min / 60), m = min % 60;
      return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
    },
  };
  IST.date = D;

  /* ---------- Couleurs par catégorie ---------- */
  const TONES = {
    course: { Cours: 'green', TD: 'purple', TP: 'orange' },
    news: { 'Scolarité': 'blue', 'Vie étudiante': 'purple', Urgent: 'red', 'Général': 'teal' },
    event: { Culture: 'purple', Sport: 'green', Emploi: 'orange', Formation: 'teal', 'Conférence': 'blue', 'Intégration': 'pink' },
  };
  const EVENT_ICONS = { Culture: 'music', Sport: 'ball', Emploi: 'briefcase', Formation: 'cap', 'Conférence': 'megaphone', 'Intégration': 'users' };

  /* ---------- Toasts ---------- */
  function toast(msg, type = 'info') {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = icon(type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info') + `<span>${esc(msg)}</span>`;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3400);
  }

  /* ---------- Fenêtre (bottom sheet sur mobile, dialogue sur ordinateur) ---------- */
  function sheet({ title, body, footer = '', size = '', onClose }) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `
      <div class="sheet ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet-handle"></div>
        <header class="sheet-head"><h3>${esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button></header>
        <div class="sheet-body">${body}</div>
        ${footer ? `<footer class="sheet-foot">${footer}</footer>` : ''}
      </div>`;
    const prevFocus = document.activeElement;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => wrap.classList.add('open'));

    let closed = false;
    const onKey = (e) => e.key === 'Escape' && close();
    function close() {
      if (closed) return;
      closed = true;
      wrap.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        wrap.remove();
        if (!document.querySelector('.sheet-backdrop')) document.body.classList.remove('no-scroll');
        prevFocus && prevFocus.focus && prevFocus.focus();
      }, 220);
      onClose && onClose();
    }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    setTimeout(() => {
      const f = wrap.querySelector('.sheet-body input:not([type=hidden]), .sheet-body select, .sheet-body textarea') || wrap.querySelector('[data-close]');
      f && f.focus();
    }, 60);
    return { el: wrap, close };
  }

  function confirmDialog(message, { ok = 'Confirmer', danger = false } = {}) {
    return new Promise((resolve) => {
      let answered = false;
      const s = sheet({
        title: 'Confirmation',
        body: `<p class="text-2">${esc(message)}</p>`,
        footer: `<button class="btn btn-ghost" data-close>Annuler</button>
                 <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button>`,
        onClose: () => !answered && resolve(false),
      });
      s.el.querySelector('[data-ok]').addEventListener('click', () => {
        answered = true;
        resolve(true);
        s.close();
      });
    });
  }

  /* ---------- Formulaires ---------- */
  let fid = 0;
  function field(o) {
    const id = `f-${o.name}-${++fid}`;
    const attrs = [
      `id="${id}"`, `name="${o.name}"`,
      o.required ? 'required' : '',
      o.autocomplete ? `autocomplete="${o.autocomplete}"` : '',
      o.placeholder && o.type !== 'select' ? `placeholder="${esc(o.placeholder)}"` : '',
      o.readonly ? 'readonly' : '',
      o.attrs || '',
    ].join(' ');
    let control;
    if (o.type === 'select') {
      const opt = (op) => {
        const [v, l] = Array.isArray(op) ? op : [op, op];
        return `<option value="${esc(v)}" ${String(v) === String(o.value ?? '') ? 'selected' : ''}>${esc(l)}</option>`;
      };
      const opts = o.options
        .map((op) => (op && op.group ? `<optgroup label="${esc(op.group)}">${op.options.map(opt).join('')}</optgroup>` : opt(op)))
        .join('');
      const ph = o.placeholder ? `<option value="" disabled ${o.value ? '' : 'selected'}>${esc(o.placeholder)}</option>` : '';
      control = `<select ${attrs}>${ph}${opts}</select>`;
    } else if (o.type === 'textarea') {
      control = `<textarea ${attrs} rows="${o.rows || 4}">${esc(o.value || '')}</textarea>`;
    } else {
      control = `<input type="${o.type || 'text'}" ${attrs} value="${esc(o.value ?? '')}">`;
    }
    const pw = o.type === 'password'
      ? `<button type="button" class="pw-toggle" data-pw-toggle aria-label="Afficher le mot de passe">${icon('eye')}</button>` : '';
    return `<div class="field ${o.cls || ''}" data-field="${o.name}">
      <label for="${id}">${esc(o.label)}${o.optional ? ' <span class="muted">(facultatif)</span>' : ''}</label>
      <div class="control ${o.icon ? 'has-icon' : ''} ${pw ? 'has-toggle' : ''}">${o.icon ? icon(o.icon, 'ctl-ic') : ''}${control}${pw}</div>
      ${o.hint ? `<small class="hint">${o.hint}</small>` : ''}
      <small class="err" aria-live="polite"></small>
    </div>`;
  }
  function setErr(form, name, msg) {
    const f = form.querySelector(`[data-field="${name}"]`);
    if (!f) return;
    f.classList.toggle('invalid', !!msg);
    f.querySelector('.err').textContent = msg || '';
    const input = f.querySelector('input, select, textarea');
    input && input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  const formData = (form) => Object.fromEntries(new FormData(form));

  /** Remplit la liste des niveaux selon la filière choisie. */
  function fillLevels(select, filiere, placeholder = true) {
    const current = select.value;
    const opts = IST.school.levelOptions(filiere);
    select.innerHTML = (placeholder ? '<option value="" disabled>Choisir…</option>' : '') +
      opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    select.value = opts.some(([v]) => v === current) ? current : '';
    if (!select.value && !placeholder && opts.length) select.value = opts[0][0];
  }
  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

  /* ---------- Éléments visuels ---------- */
  const logoMark = (size = 40) => `<span class="logo-mark" style="width:${size}px;height:${size}px">${icon('cap')}</span>`;

  function avatar(u, size = 44) {
    const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px`;
    if (u && u.avatar) return `<img class="avatar" src="${u.avatar}" alt="" style="${st}">`;
    const ini = (((u && u.prenom) || '?')[0] + (((u && u.nom) || '')[0] || '')).toUpperCase();
    return `<span class="avatar" style="${st}" aria-hidden="true">${esc(ini)}</span>`;
  }

  const seg = (items, active, key, cls = '') =>
    `<div class="seg ${cls}" role="tablist">${items
      .map(([v, l]) => `<button type="button" role="tab" class="${v === active ? 'active' : ''}" aria-selected="${v === active}" data-${key}="${v}">${l}</button>`)
      .join('')}</div>`;

  const empty = (ic, title, text = '', tone = 'blue') =>
    `<div class="empty"><span class="ic-box tone-${tone}">${icon(ic)}</span><strong>${esc(title)}</strong>${text ? `<p class="muted small">${esc(text)}</p>` : ''}</div>`;

  /** Illustration du campus (bâtiment + palmiers) en SVG. */
  function campusArt(cls = '') {
    let windows = '';
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 9; c++) {
        if (r === 2 && (c === 4)) continue;
        windows += `<rect x="${166 + c * 30}" y="${100 + r * 26}" width="18" height="15" rx="2"/>`;
      }
    const leaf = 'M0 0 C 14 -16 38 -20 58 -6 C 38 -10 18 -7 0 0Z';
    const palm = (x, h, s = 1) => `<g transform="translate(${x},220) scale(${s})">
      <path d="M0 0 C -4 -${h * 0.4}, 5 -${h * 0.7}, 2 -${h}" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g transform="translate(2,-${h})" fill="#fff">
        <path d="${leaf}" transform="rotate(-8)"/><path d="${leaf}" transform="rotate(28)"/>
        <path d="${leaf}" transform="scale(-1,1) rotate(-8)"/><path d="${leaf}" transform="scale(-1,1) rotate(28)"/>
        <path d="${leaf}" transform="rotate(-62)"/><path d="${leaf}" transform="scale(-1,1) rotate(-62)"/>
      </g></g>`;
    return `<svg class="campus-art ${cls}" viewBox="0 0 600 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <circle cx="505" cy="58" r="34" fill="#fff" opacity=".14"/>
      <g fill="#fff" opacity=".16"><rect x="18" y="122" width="118" height="98" rx="3"/><rect x="462" y="108" width="128" height="112" rx="3"/></g>
      <rect x="150" y="84" width="300" height="136" rx="4" fill="#fff" opacity=".92"/>
      <rect x="142" y="76" width="316" height="12" rx="3" fill="#fff"/>
      <g fill="#0A4EA3" opacity=".32">${windows}</g>
      <rect x="282" y="166" width="36" height="54" rx="2" fill="#0A4EA3" opacity=".45"/>
      <rect x="292" y="56" width="16" height="22" fill="#fff" opacity=".8"/>
      <line x1="308" y1="30" x2="308" y2="58" stroke="#fff" stroke-width="2"/>
      <rect x="309" y="31" width="24" height="5" fill="#009E60"/><rect x="309" y="36" width="24" height="5" fill="#FCD116"/><rect x="309" y="41" width="24" height="5" fill="#3A75C4"/>
      ${palm(70, 120, 0.95)}${palm(120, 92, 0.8)}${palm(500, 128, 1)}${palm(552, 96, 0.82)}
      <rect y="214" width="600" height="6" fill="#fff" opacity=".35"/>
    </svg>`;
  }

  /* ---------- Cartes réutilisables ---------- */
  function course(c, opts = {}) {
    const tone = TONES.course[c.type] || 'blue';
    return `<article class="course tone-${tone} ${opts.state || ''}">
      <div class="course-time"><span>${D.hm(c.start)}</span><small>${D.hm(c.end)}</small></div>
      <div class="course-body">
        <h4>${esc(c.title)}</h4>
        <div class="meta">${c.cls ? `<span>${icon('users')}${esc(c.cls)}</span>` : ''}<span>${icon('pin')}${esc(c.room)}</span>${c.teacher && !c.cls ? `<span>${icon('user')}${esc(c.teacher)}</span>` : ''}</div>
      </div>
      <div class="course-side">${opts.state === 'now' ? '<span class="tag tone-blue live">En cours</span>' : ''}<span class="tag">${esc(c.type)}</span></div>
    </article>`;
  }

  function eventCard(ev, opts = {}) {
    const tone = TONES.event[ev.category] || 'blue';
    const d = D.toDate(ev.date);
    const range = ev.endDate && ev.endDate !== ev.date
      ? `Du ${D.fmt(d, { day: 'numeric', month: 'short' })} au ${D.fmt(ev.endDate, { day: 'numeric', month: 'short' })}`
      : D.fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
    return `<button type="button" class="card event tone-${tone}" data-event="${ev.id}">
      <div class="event-thumb">${icon(EVENT_ICONS[ev.category] || 'calendar')}
        <span class="event-date"><b>${d.getDate()}</b>${D.fmt(d, { month: 'short' }).replace('.', '')}</span></div>
      <div class="event-body">
        <h4>${esc(ev.title)}</h4>
        <div class="meta col"><span>${icon('calendar')}${range}${ev.time ? ' · ' + esc(ev.time) : ''}</span><span>${icon('pin')}${esc(ev.place)}</span></div>
        <div class="tags"><span class="tag">${esc(ev.category)}</span>${opts.participating ? `<span class="tag tone-green">${icon('check')}Dans mon agenda</span>` : ''}</div>
      </div>
    </button>`;
  }

  /* Redimensionnement automatique d'images (pour annonces et publications) */
  function resizeImage(file, maxWidth = 1200, maxHeight = 800, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Fichier image invalide.'));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Erreur de lecture image.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Erreur lecture fichier.'));
      reader.readAsDataURL(file);
    });
  }

  function newsCard(a, opts = {}) {
    const tone = TONES.news[a.category] || 'blue';
    const imgHtml = a.image ? `<div style="overflow:hidden;border-radius:10px;margin:8px 0 10px;max-height:160px;"><img src="${a.image}" alt="${esc(a.title)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>` : '';
    return `<button type="button" class="card news tone-${tone} ${a.pinned ? 'pinned' : ''}" data-news="${a.id}">
      <div class="news-top"><span class="tag">${esc(a.category)}</span>
        ${a.pinned ? `<span class="pin-flag">${icon('bookmark')}Épinglé</span>` : ''}
        <span class="muted small push">${D.relative(a.date)}</span></div>
      ${imgHtml}
      <h3>${esc(a.title)}</h3>
      ${opts.compact ? '' : `<p>${esc(a.body)}</p>`}
      <div class="news-foot">${icon('megaphone')}${esc(a.author || 'Administration')}</div>
    </button>`;
  }

  function openNews(a) {
    const tone = TONES.news[a.category] || 'blue';
    const imgHtml = a.image ? `<div style="overflow:hidden;border-radius:12px;margin:12px 0 16px;max-height:320px;"><img src="${a.image}" alt="${esc(a.title)}" style="width:100%;height:auto;max-height:320px;object-fit:cover;border-radius:12px;display:block;"></div>` : '';
    sheet({
      title: 'Annonce',
      body: `<div class="news-detail tone-${tone}">
        <div class="news-top"><span class="tag">${esc(a.category)}</span><span class="muted small push">${D.long(a.date)}</span></div>
        ${imgHtml}
        <h2>${esc(a.title)}</h2>
        <div class="prose">${esc(a.body).replace(/\n/g, '<br>')}</div>
        <div class="news-foot">${icon('megaphone')}Publié par ${esc(a.author || 'Administration')}</div>
      </div>`,
    });
  }

  /** Sélecteur de classes (filière × niveau) pour les enseignants. */
  function classPicker(selected = [], name = 'classes') {
    const sel = new Set(selected);
    const rows = IST.config.poles.map((p) => `
      <p class="cp-pole">${esc(p.name)}</p>
      ${p.groups.flatMap((g) => g.filieres).filter((f) => f.open !== false).map((f) => `
        <div class="cp-row" data-text="${esc((f.code + ' ' + f.name).toLowerCase())}">
          <div class="cp-name"><strong>${esc(f.code)}</strong><small>${esc(f.name)}</small></div>
          <div class="cp-levels">${f.levels.map((l) => {
            const id = `${f.code}-${l}`;
            return `<label class="cp-chip"><input type="checkbox" name="${name}" value="${id}" ${sel.has(id) ? 'checked' : ''}><span>${l}</span></label>`;
          }).join('')}</div>
        </div>`).join('')}`).join('');
    return `<div class="class-picker" data-class-picker>
      <div class="cp-top"><label class="searchbar">${icon('search')}<input type="search" placeholder="Filtrer les filières…" data-cp-search aria-label="Filtrer les filières"></label>
        <span class="tag" data-cp-count>${sel.size} classe${sel.size > 1 ? 's' : ''}</span></div>
      <div class="cp-list">${rows}</div>
    </div>`;
  }
  // Recherche et compteur du sélecteur de classes (délégation globale)
  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-cp-search]')) return;
    const q = e.target.value.trim().toLowerCase();
    e.target.closest('[data-class-picker]').querySelectorAll('.cp-row').forEach((r) => { r.hidden = q && !r.dataset.text.includes(q); });
  });
  document.addEventListener('change', (e) => {
    const picker = e.target.closest('[data-class-picker]');
    if (!picker) return;
    const n = picker.querySelectorAll('.cp-chip input:checked').length;
    picker.querySelector('[data-cp-count]').textContent = `${n} classe${n > 1 ? 's' : ''}`;
  });

  const sizeLabel = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
  const roleLabel = (u) => IST.config.roles[u.role] || u.role;
  const displayName = (u) => (u.civilite ? `${u.civilite} ${u.prenom} ${u.nom}` : `${u.prenom} ${u.nom}`);

  IST.ui = {
    classPicker, sizeLabel, roleLabel, displayName, resizeImage,
    esc, cap, toast, sheet, confirm: confirmDialog, field, setErr, formData, fillLevels, busy,
    logoMark, avatar, seg, empty, campusArt, course, eventCard, newsCard, openNews,
    TONES, EVENT_ICONS,
  };

  /* ---------- Thème clair / sombre ---------- */
  IST.theme = {
    get() {
      try { return JSON.parse(localStorage.getItem('istc_theme')) || 'system'; } catch (e) { return 'system'; }
    },
    set(v) {
      try { localStorage.setItem('istc_theme', JSON.stringify(v)); } catch (e) { /* stockage indisponible */ }
      IST.theme.apply(v);
    },
    apply(v) {
      const r = document.documentElement;
      if (v === 'light' || v === 'dark') r.dataset.theme = v;
      else delete r.dataset.theme;
    },
  };
})();
