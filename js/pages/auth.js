/* Écrans publics : bienvenue, connexion, inscription, mot de passe oublié */
(function () {
  const { ui, auth, config: cfg } = IST;
  const icon = IST.icon;

  const ASIDE = {
    login: ['Content de te revoir !', 'Connecte-toi pour retrouver ton emploi du temps, tes annonces et tous les services du campus.'],
    register: ['Rejoins ton campus en quelques secondes', "Crée ton compte avec ton adresse email et accède à toute la vie de l'IST, au même endroit."],
    forgot: ["Pas de panique, ça arrive à tout le monde", 'Réinitialise ton mot de passe et retrouve ton espace.'],
    staff: ['Espace du personnel', "Enseignants, chefs de filière et membres de l'administration : gérez vos classes, vos emplois du temps et les informations de l'IST."],
  };

  function layout(kind, inner) {
    const [title, text] = ASIDE[kind];
    return `<div class="auth">
      <aside class="auth-aside">
        ${ui.campusArt()}
        <div class="auth-aside-top">
          <a href="#/welcome" class="icon-btn" aria-label="Retour à l'accueil">${icon('arrowLeft')}</a>
          <div class="brand-inline">${ui.logoMark(36)}<span>Campus+</span></div>
        </div>
        <div class="auth-aside-copy">
          <h1>${title}</h1>
          <p>${text}</p>
          <ul class="perks">
            <li>${icon('calendar')}Emploi du temps toujours à jour</li>
            <li>${icon('megaphone')}Annonces et notifications de l'école</li>
            <li>${icon('map')}Plan interactif du campus</li>
            <li>${icon('file')}Documents officiels en un clic</li>
          </ul>
        </div>
        <p class="auth-aside-foot">${cfg.schoolName} · ${cfg.motto}</p>
      </aside>
      <main class="auth-main"><div class="auth-card">${inner}</div></main>
    </div>`;
  }

  function showAlert(form, msg) {
    const a = form.querySelector('.form-alert');
    a.innerHTML = msg ? `${icon('alert')}<span>${ui.esc(msg)}</span>` : '';
    a.hidden = !msg;
  }

  function strengthHTML() {
    return `<div class="strength" data-level="0" aria-hidden="true"><span></span><span></span><span></span><span></span></div>`;
  }
  function bindStrength(form) {
    const input = form.querySelector('input[name="password"]');
    const meter = form.querySelector('.strength');
    const hint = form.querySelector('[data-field="password"] .hint');
    const labels = ['8 caractères minimum, avec au moins une lettre et un chiffre.', 'Faible', 'Moyen', 'Bon', 'Excellent'];
    input.addEventListener('input', () => {
      const lvl = auth.strength(input.value);
      meter.dataset.level = lvl;
      hint.textContent = input.value ? `Sécurité du mot de passe : ${labels[lvl] || labels[1]}` : labels[0];
    });
  }

  IST.authPages = {
    /* ---------- Bienvenue ---------- */
    welcome: {
      render: () => `<div class="welcome">
        ${ui.campusArt('welcome-art')}
        <div class="welcome-inner">
          <div class="welcome-copy">
            <div class="welcome-logo">${ui.logoMark(64)}<span>${cfg.schoolShort}</span></div>
            <h1>Campus<span>+</span></h1>
            <p class="welcome-tag">Tout ton campus, dans une seule application.</p>
            <div class="welcome-feats desktop-only">
              <span>${icon('check')}Emploi du temps</span><span>${icon('check')}Actualités</span>
              <span>${icon('check')}Documents</span><span>${icon('check')}Plan du campus</span>
            </div>
            <div class="welcome-actions">
              <a class="btn btn-white btn-lg" href="#/login">Se connecter</a>
              <a class="btn btn-outline-white btn-lg" href="#/register">Créer un compte</a>
            </div>
            <p class="welcome-foot">${cfg.schoolShort} · ${cfg.motto}</p>
          </div>
          <div class="welcome-preview" aria-hidden="true">
            <div class="glass g1">
              <span class="tag">Prochain cours · 08h00</span>
              <h4>Mathématiques appliquées</h4>
              <p class="muted small">Amphithéâtre · Dr Obiang</p>
              <div class="bar"></div>
            </div>
            <div class="glass g2"><div class="g-row">
              <span class="g-ic" style="background:#fdecee;color:#e02d3c">${icon('megaphone')}</span>
              <div><b style="font-size:14px">Ta salle de cours</b><p class="muted small">Porte P107 · Bâtiment B</p></div>
            </div></div>
            <div class="glass g3"><div class="g-row">
              <span class="g-ic" style="background:#f1eafe;color:#7c3aed">${icon('music')}</span>
              <div><b style="font-size:14px">Journée culturelle</b><p class="muted small">Campus IST · 10h00</p></div>
            </div></div>
          </div>
        </div>
      </div>`,
    },

    /* ---------- Connexion ---------- */
    login: {
      render: () => layout('login', `
        <div class="auth-head"><h2>Se connecter</h2><p class="text-2">Entre ton adresse email et ton mot de passe.</p></div>
        <form class="stack-lg" novalidate>
          ${ui.field({ name: 'email', label: 'Adresse email', type: 'email', icon: 'mail', placeholder: 'herlienzamba@gmail.com', autocomplete: 'email', required: true })}
          ${ui.field({ name: 'password', label: 'Mot de passe', type: 'password', icon: 'lock', placeholder: 'Ton mot de passe', autocomplete: 'current-password', required: true })}
          <div class="row-between">
            <label class="check"><input type="checkbox" name="remember" checked>Rester connecté</label>
            <a class="link" href="#/forgot">Mot de passe oublié ?</a>
          </div>
          <div class="form-alert" role="alert" hidden></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Se connecter</button>
        </form>
        <p class="auth-switch">Pas encore de compte ? <a class="link" href="#/register">Créer un compte</a></p>
        <a class="staff-link" href="#/personnel">${icon('shield')}<span><b>Se connecter en tant que membre de l'administration</b><small>Enseignants, chefs de filière, personnel administratif</small></span>${icon('chevronRight')}</a>`),
      mount(el) {
        const f = el.querySelector('form');
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const d = ui.formData(f);
          showAlert(f, '');
          const eErr = d.email.trim() ? '' : 'Entre ton adresse email.';
          const pErr = d.password ? '' : 'Entre ton mot de passe.';
          ui.setErr(f, 'email', eErr);
          ui.setErr(f, 'password', pErr);
          if (eErr || pErr) return;
          const btn = f.querySelector('[type=submit]');
          ui.busy(btn, true);
          const r = await auth.login(d.email, d.password, !!d.remember);
          ui.busy(btn, false);
          if (!r.ok) return showAlert(f, r.error);
          ui.toast(`Bon retour, ${r.user.prenom} !`, 'success');
          location.hash = '#/home';
        });
      },
    },

    /* ---------- Inscription ---------- */
    register: {
      render: () => layout('register', `
        <div class="auth-head"><h2>Créer un compte</h2><p class="text-2">Ça prend moins d'une minute.</p></div>
        <form class="stack-lg" novalidate>
          <p class="form-section-title">Identité</p>
          <div class="form-row">
            ${ui.field({ name: 'prenom', label: 'Prénom', icon: 'user', placeholder: 'Herlie', autocomplete: 'given-name', required: true })}
            ${ui.field({ name: 'nom', label: 'Nom', placeholder: 'NZAMBA', autocomplete: 'family-name', required: true })}
          </div>
          ${ui.field({ name: 'email', label: 'Adresse email', type: 'email', icon: 'mail', placeholder: 'herl0ienzamba@gmail.com', autocomplete: 'email', required: true,
            hint: cfg.allowedEmailDomain ? `Utilise ton adresse de l'école (@${cfg.allowedEmailDomain}).` : 'Elle servira à te connecter.' })}
          <p class="form-section-title">Études</p>
          ${ui.field({ name: 'filiere', label: 'Filière', type: 'select', icon: 'cap', placeholder: 'Choisis ta filière…', options: IST.school.filiereOptions(), required: true })}
          ${ui.field({ name: 'niveau', label: 'Niveau', type: 'select', icon: 'award', placeholder: "Choisis d'abord ta filière", options: [], required: true })}
          <div class="info-box" data-room-preview hidden></div>
          <p class="form-section-title">Sécurité</p>
          <div class="field" data-field="password-wrap">
            ${ui.field({ name: 'password', label: 'Mot de passe', type: 'password', icon: 'lock', placeholder: '8 caractères minimum', autocomplete: 'new-password', required: true,
              hint: '8 caractères minimum, avec au moins une lettre et un chiffre.' })}
            ${strengthHTML()}
          </div>
          ${ui.field({ name: 'confirm', label: 'Confirmer le mot de passe', type: 'password', icon: 'lock', placeholder: 'Retape ton mot de passe', autocomplete: 'new-password', required: true })}
          <div class="field" data-field="terms">
            <label class="check"><input type="checkbox" name="terms">J'ai lu et j'accepte le règlement intérieur de l'IST et la charte des étudiants.</label>
            <small class="err"></small>
          </div>
          <div class="form-alert" role="alert" hidden></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Créer mon compte</button>
        </form>
        <p class="auth-switch">Déjà inscrit ? <a class="link" href="#/login">Se connecter</a></p>`),
      mount(el) {
        const f = el.querySelector('form');
        bindStrength(f);
        const rules = {
          prenom: (v) => (v.trim().length >= 2 ? '' : 'Entre ton prénom.'),
          nom: (v) => (v.trim().length >= 2 ? '' : 'Entre ton nom.'),
          email: (v) => auth.emailError(v),
          filiere: (v) => (v ? '' : 'Choisis ta filière.'),
          niveau: (v) => (v ? '' : 'Choisis ton niveau.'),
          password: (v) => auth.passwordError(v),
          confirm: (v, d) => (!v ? 'Confirme ton mot de passe.' : v === d.password ? '' : 'Les mots de passe ne correspondent pas.'),
          terms: (v) => (v ? '' : 'Tu dois accepter le règlement pour continuer.'),
        };
        const check = (name) => {
          const d = ui.formData(f);
          const msg = rules[name](d[name] || '', d);
          ui.setErr(f, name, msg);
          return !msg;
        };
        f.addEventListener('focusout', (e) => {
          const n = e.target.name;
          if (rules[n] && n !== 'terms' && e.target.value) check(n);
        });
        const lvl = f.querySelector('select[name=niveau]');
        const preview = f.querySelector('[data-room-preview]');
        function showRoom() {
          const d = ui.formData(f);
          const room = d.filiere && d.niveau ? IST.school.roomLabel(IST.school.roomOf(d.filiere, d.niveau)) : '';
          preview.hidden = !(d.filiere && d.niveau);
          preview.innerHTML = `${icon('door')}<div><b>${room ? `Ta salle de cours : ${ui.esc(room)}` : 'Salle pas encore attribuée'}</b>${room ? "D'après la répartition des salles de la Direction des études." : 'La Direction des études la communiquera prochainement.'}</div>`;
        }
        f.addEventListener('change', (e) => {
          const n = e.target.name;
          if (n === 'filiere') ui.fillLevels(lvl, e.target.value);
          if (n === 'filiere' || n === 'niveau') showRoom();
          if (n === 'filiere' || n === 'niveau' || n === 'terms') check(n);
        });
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          showAlert(f, '');
          const ok = Object.keys(rules).map(check).every(Boolean);
          if (!ok) {
            const first = f.querySelector('.field.invalid input, .field.invalid select');
            first && first.focus();
            return;
          }
          const btn = f.querySelector('[type=submit]');
          ui.busy(btn, true);
          const r = await auth.register(ui.formData(f));
          ui.busy(btn, false);
          if (!r.ok) {
            if (r.field) ui.setErr(f, r.field, r.error);
            else showAlert(f, r.error);
            return;
          }
          ui.toast(`Compte créé ! Bienvenue, ${r.user.prenom}.`, 'success');
          location.hash = '#/home';
        });
      },
    },

    /* ---------- Mot de passe oublié ---------- */
    forgot: {
      render: () => layout('forgot', `
        <div class="auth-head"><h2>Mot de passe oublié</h2><p class="text-2">Entre l'adresse email de ton compte.</p></div>
        <form class="stack-lg" data-step="1" novalidate>
          ${ui.field({ name: 'email', label: 'Adresse email', type: 'email', icon: 'mail', placeholder: 'herl0ienzamba@gmail.com', autocomplete: 'email', required: true })}
          <button class="btn btn-primary btn-lg btn-block" type="submit">Continuer</button>
        </form>
        <div class="info-box demo-note">${icon('info')}<div><b>Version de démonstration</b>Tant que l'envoi d'emails n'est pas branché au serveur, la réinitialisation se fait directement sur cet écran.</div></div>
        <p class="auth-switch"><a class="link" href="#/login">${icon('arrowLeft')}Retour à la connexion</a></p>`),
      mount(el) {
        const card = el.querySelector('.auth-card');
        let email = '';
        card.addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = e.target;
          const d = ui.formData(f);
          if (f.dataset.step === '1') {
            const err = auth.emailError(d.email);
            if (err) return ui.setErr(f, 'email', err);
            if (!auth.findByEmail(d.email)) return ui.setErr(f, 'email', 'Aucun compte ne correspond à cette adresse.');
            email = d.email;
            f.outerHTML = `<form class="stack-lg" data-step="2" novalidate>
              <div class="info-box">${icon('mail')}<div><b>${ui.esc(email)}</b>Choisis ton nouveau mot de passe.</div></div>
              ${ui.field({ name: 'password', label: 'Nouveau mot de passe', type: 'password', icon: 'lock', autocomplete: 'new-password', hint: '8 caractères minimum, avec au moins une lettre et un chiffre.' })}
              ${strengthHTML()}
              ${ui.field({ name: 'confirm', label: 'Confirmer', type: 'password', icon: 'lock', autocomplete: 'new-password' })}
              <button class="btn btn-primary btn-lg btn-block" type="submit">Enregistrer</button>
            </form>`;
            const f2 = card.querySelector('form');
            bindStrength(f2);
            f2.querySelector('input').focus();
            return;
          }
          const pErr = auth.passwordError(d.password);
          const cErr = d.confirm === d.password ? '' : 'Les mots de passe ne correspondent pas.';
          ui.setErr(f, 'password', pErr);
          ui.setErr(f, 'confirm', pErr ? '' : cErr);
          if (pErr || cErr) return;
          await auth.resetPassword(email, d.password);
          card.innerHTML = `<div class="success-screen">
            <span class="ic-box tone-green">${icon('checkCircle')}</span>
            <h2>Mot de passe modifié</h2>
            <p class="text-2">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
            <a class="btn btn-primary btn-lg btn-block mt" href="#/login">Se connecter</a>
          </div>`;
        });
      },
    },
    /* ---------- Personnel : code d'accès ---------- */
    personnel: {
      render: () => layout('staff', `
        <div class="auth-head"><span class="ic-box lg tone-blue" style="margin-bottom:14px">${icon('key')}</span>
          <h2>Accès du personnel</h2><p class="text-2">Entre le code unique fourni par l'administration de l'IST.</p></div>
        <form class="stack-lg" novalidate>
          ${ui.field({ name: 'code', label: "Code d'accès", type: 'password', icon: 'key', placeholder: 'Code du personnel', autocomplete: 'off', required: true })}
          <div class="form-alert" role="alert" hidden></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Continuer</button>
        </form>
        <div class="info-box demo-note">${icon('info')}<div><b>Pourquoi un code ?</b>Il empêche les étudiants de créer un compte enseignant ou administrateur. Ne le communique qu'aux membres du personnel.</div></div>
        <p class="auth-switch"><a class="link" href="#/login">${icon('arrowLeft')}Retour à la connexion étudiant</a></p>`),
      mount(el) {
        const f = el.querySelector('form');
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const { code } = ui.formData(f);
          if (!code.trim()) return ui.setErr(f, 'code', "Entre le code d'accès.");
          ui.setErr(f, 'code', '');
          if (!auth.staffGate.check(code)) return showAlert(f, "Code incorrect. Rapproche-toi de l'administration de l'IST.");
          auth.staffGate.open();
          location.hash = '#/personnel-compte';
        });
      },
    },

    /* ---------- Personnel : création du compte / connexion ---------- */
    'personnel-compte': {
      guard: () => auth.staffGate.isOpen(),
      fallback: 'personnel',
      render: () => layout('staff', `
        <div class="auth-head"><h2>Compte du personnel</h2><p class="text-2">Code validé. Crée ton compte ou connecte-toi.</p></div>
        <div class="page-tabs">${ui.seg([['create', 'Créer mon compte'], ['login', 'Me connecter']], 'create', 'mode', 'full')}</div>
        <form class="stack-lg" data-mode="create" novalidate>
          <p class="form-section-title">Rôle</p>
          <div class="role-grid">
            ${[['enseignant', 'presentation', 'Enseignant(e)', 'Je donne des cours'],
               ['chef', 'layers', 'Chef de filière', "J'enseigne et je gère une filière"],
               ['admin', 'building', 'Administration', "Je travaille à l'administration"]].map(([v, ic, l, d], i) => `
              <label class="role-card"><input type="radio" name="role" value="${v}" ${i === 0 ? 'checked' : ''}>
                <span class="ic-box sm tone-blue">${icon(ic)}</span><b>${l}</b><small>${d}</small></label>`).join('')}
          </div>
          <p class="form-section-title">Identité</p>
          <div class="form-row civ-row">
            ${ui.field({ name: 'civilite', label: 'Civilité', type: 'select', options: cfg.civilites, value: 'M.' })}
            ${ui.field({ name: 'prenom', label: 'Prénom', placeholder: 'Herlie', autocomplete: 'given-name' })}
          </div>
          ${ui.field({ name: 'nom', label: 'Nom', placeholder: 'NZAMBA', autocomplete: 'family-name' })}
          ${ui.field({ name: 'email', label: 'Adresse email', type: 'email', icon: 'mail', placeholder: 'herl0ienzamba@gmail.com', autocomplete: 'email' })}
          <div data-show="admin" hidden>${ui.field({ name: 'fonction', label: 'Service / fonction', placeholder: 'Ex. Scolarité, Direction des études…', optional: true })}</div>
          <div data-show="chef" hidden>
            ${ui.field({ name: 'chefFiliere', label: 'Filière dont tu es chef(fe)', type: 'select', icon: 'layers', placeholder: 'Choisir la filière…', options: IST.school.filiereOptions() })}
          </div>
          <div data-show="enseignant chef">
            <p class="form-section-title">Classes que tu tiens</p>
            <p class="muted small" style="margin:6px 0 10px">Coche chaque niveau dans lequel tu enseignes : tu verras leur emploi du temps et pourras leur envoyer des documents.</p>
            <div class="field" data-field="classes">${ui.classPicker([])}<small class="err"></small></div>
          </div>
          <p class="form-section-title">Sécurité</p>
          <div class="field">
            ${ui.field({ name: 'password', label: 'Mot de passe', type: 'password', icon: 'lock', placeholder: '8 caractères minimum', autocomplete: 'new-password', hint: '8 caractères minimum, avec au moins une lettre et un chiffre.' })}
            ${strengthHTML()}
          </div>
          ${ui.field({ name: 'confirm', label: 'Confirmer le mot de passe', type: 'password', icon: 'lock', autocomplete: 'new-password' })}
          <div class="form-alert" role="alert" hidden></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Créer mon compte et me connecter</button>
        </form>
        <form class="stack-lg" data-mode="login" hidden novalidate>
          ${ui.field({ name: 'email', label: 'Adresse email', type: 'email', icon: 'mail', placeholder: 'herl0ienzamba@gmail.com', autocomplete: 'email' })}
          ${ui.field({ name: 'password', label: 'Mot de passe', type: 'password', icon: 'lock', autocomplete: 'current-password' })}
          <div class="form-alert" role="alert" hidden></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Se connecter</button>
        </form>`),
      mount(el) {
        const create = el.querySelector('form[data-mode=create]');
        const login = el.querySelector('form[data-mode=login]');
        bindStrength(create);
        el.querySelector('.seg').addEventListener('click', (e) => {
          const b = e.target.closest('[data-mode]');
          if (!b) return;
          el.querySelectorAll('.seg button').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
          create.hidden = b.dataset.mode !== 'create';
          login.hidden = b.dataset.mode !== 'login';
        });
        const syncRole = () => {
          const role = ui.formData(create).role;
          create.querySelectorAll('[data-show]').forEach((x) => { x.hidden = !x.dataset.show.split(' ').includes(role); });
        };
        create.addEventListener('change', (e) => e.target.name === 'role' && syncRole());
        syncRole();

        create.addEventListener('submit', async (e) => {
          e.preventDefault();
          showAlert(create, '');
          const d = ui.formData(create);
          d.classes = [...create.querySelectorAll('input[name=classes]:checked')].map((x) => x.value);
          const errs = {
            prenom: d.prenom.trim().length >= 2 ? '' : 'Entre ton prénom.',
            nom: d.nom.trim().length >= 2 ? '' : 'Entre ton nom.',
            email: auth.emailError(d.email),
            chefFiliere: d.role === 'chef' && !d.chefFiliere ? 'Choisis ta filière.' : '',
            classes: d.role !== 'admin' && !d.classes.length ? 'Coche au moins une classe.' : '',
            password: auth.passwordError(d.password),
            confirm: d.confirm === d.password ? '' : 'Les mots de passe ne correspondent pas.',
          };
          Object.entries(errs).forEach(([k, v]) => ui.setErr(create, k, v));
          if (Object.values(errs).some(Boolean)) {
            const first = create.querySelector('.field.invalid');
            first && first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          const btn = create.querySelector('[type=submit]');
          ui.busy(btn, true);
          const r = await auth.registerStaff(d);
          ui.busy(btn, false);
          if (!r.ok) return r.field ? ui.setErr(create, r.field, r.error) : showAlert(create, r.error);
          ui.toast(`Compte créé. Bienvenue, ${r.user.prenom} !`, 'success');
          location.hash = '#/home';
        });

        login.addEventListener('submit', async (e) => {
          e.preventDefault();
          const d = ui.formData(login);
          const btn = login.querySelector('[type=submit]');
          ui.busy(btn, true);
          const r = await auth.login(d.email, d.password, true);
          ui.busy(btn, false);
          if (!r.ok) return showAlert(login, r.error);
          if (r.user.role === 'etudiant') {
            auth.logout();
            return showAlert(login, 'Ce compte est un compte étudiant. Utilise la connexion étudiant.');
          }
          ui.toast(`Bon retour, ${r.user.prenom} !`, 'success');
          location.hash = '#/home';
        });
      },
    },
  };
})();
