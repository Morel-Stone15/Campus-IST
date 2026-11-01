/* ==========================================================
   Stockage et comptes.
   Le navigateur conserve un cache local ; les collections partagées
   sont également enregistrées sur l'API Campus+.
   ========================================================== */
(function () {
  const D = IST.date;
  const PFX = 'istc_';
  const REMOTE_KEYS = new Map([
    ['announcements', 'announcements'],
    ['events', 'events'],
    ['courses', 'courses'],
    ['exams', 'exams'],
    ['documents', 'documents'],
    ['programmes', 'programmes'],
    ['posts', 'posts'],
    ['set_identity', 'identity'],
    ['set_hymn', 'hymn'],
  ]);
  let remoteReady = false;
  const remoteWrites = new Map();

  function queueRemoteWrite(localKey, value) {
    const remoteKey = REMOTE_KEYS.get(localKey);
    if (!remoteReady || !remoteKey || !IST.api || !IST.api.getToken()) return;

    const previous = remoteWrites.get(remoteKey) || Promise.resolve();
    const write = previous.catch(() => {}).then(async () => {
      const result = await IST.api.appData.save(remoteKey, value);
      if (!result.ok) throw new Error(result.error || "Échec de l'enregistrement sur le serveur.");
    });
    write.catch((error) => IST.ui.toast(error.message, 'error'));
    remoteWrites.set(remoteKey, write);
  }

  const S = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem(PFX + k);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(PFX + k, JSON.stringify(v));
        queueRemoteWrite(k, v);
        return true;
      } catch (e) {
        IST.ui.toast("L'espace de stockage du navigateur est plein.", 'error');
        return false;
      }
    },
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let h = 0;
      for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
      return 'x' + h;
    }
  }

  /* ---------- Contenus ---------- */
  const SEED_VERSION = 2;
  const COLLECTIONS = ['announcements', 'events', 'courses', 'exams', 'documents', 'programmes', 'notifications'];
  const isStaff = (u) => !!u && u.role !== 'etudiant';
  const forUser = (item, u) =>
    (!item.pole || item.pole === '*' || item.pole === IST.school.poleOf(u.filiere)) &&
    (!item.filiere || item.filiere === '*' || item.filiere === u.filiere) &&
    (!item.niveau || item.niveau === '*' || item.niveau === u.niveau);
  /** Classe visée par un élément (cours, examen) quand il cible une filière et un niveau précis. */
  const itemClass = (item) =>
    item.filiere && item.filiere !== '*' && item.niveau && item.niveau !== '*' ? IST.school.classId(item.filiere, item.niveau) : '';
  /** Éléments qui concernent l'enseignant : ceux qui lui sont attribués ou qui visent une de ses classes. */
  const forTeacher = (item, u) => item.teacherId === u.id || (u.classes || []).includes(itemClass(item));

  // '@classe' = salle attribuée à la classe (voir js/config.js)
  const CLASSROOM = '@classe';
  function withRoom(item, u) {
    const cls = isStaff(u) ? IST.school.classInfo(itemClass(item)) : null;
    const out = cls ? { ...item, cls: cls.label } : item;
    if (item.room !== CLASSROOM) return out;
    const r = cls ? cls.room : IST.school.roomLabel(IST.school.roomOf(u.filiere, u.niveau));
    return { ...out, room: r || 'Salle de la classe' };
  }

  const db = {
    S, uid, isStaff,
    init() {
      // Augmenter SEED_VERSION remplace les contenus de démonstration enregistrés.
      const fresh = S.get('seed_version') !== SEED_VERSION;
      COLLECTIONS.forEach((k) => (fresh || S.get(k) == null) && S.set(k, IST.data[k] || []));
      S.set('seed_version', SEED_VERSION);
    },
    async syncRemote(user) {
      if (location.protocol === 'file:' || !IST.api || !IST.api.appData || !IST.api.getToken()) {
        return { ok: false, error: 'Le stockage partagé nécessite une connexion au serveur Campus+.' };
      }

      if (remoteReady && !(await db.flushRemote())) {
        return { ok: false, error: "Une modification n'a pas pu être enregistrée. Vérifie la connexion au serveur." };
      }
      remoteReady = false;
      const result = await IST.api.appData.load();
      if (!result.ok) return { ok: false, error: result.error };

      let shared = result.data;
      if (!shared.initialized) {
        if (user.role !== 'admin') {
          return { ok: false, error: "L'administrateur doit initialiser les données partagées en premier." };
        }
        const collections = {};
        ['announcements', 'events', 'courses', 'exams', 'documents', 'programmes', 'posts'].forEach((key) => {
          collections[key] = S.get(key, IST.data[key] || []);
        });
        collections.identity = S.get('set_identity', IST.data.identity);
        const hymn = S.get('set_hymn', null);
        if (hymn) collections.hymn = hymn;

        const initialized = await IST.api.appData.bootstrap(collections);
        if (!initialized.ok) {
          if (initialized.status !== 409) return { ok: false, error: initialized.error };
          const refreshed = await IST.api.appData.load();
          if (!refreshed.ok) return { ok: false, error: refreshed.error };
          shared = refreshed.data;
        } else {
          shared = initialized.data;
        }
      }

      ['announcements', 'events', 'courses', 'exams', 'documents', 'programmes', 'posts'].forEach((key) => {
        S.set(key, shared.collections[key] || []);
      });
      ['identity', 'hymn'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(shared.collections, key)) {
          S.set('set_' + key, shared.collections[key]);
        }
      });
      remoteReady = true;
      return { ok: true };
    },
    async flushRemote() {
      const pending = [...remoteWrites.entries()];
      const results = await Promise.allSettled(pending.map(([, write]) => write));
      let saved = true;
      results.forEach((result, index) => {
        const [remoteKey, write] = pending[index];
        if (remoteWrites.get(remoteKey) !== write) return;
        if (result.status === 'fulfilled') {
          remoteWrites.delete(remoteKey);
          return;
        }
        saved = false;
        remoteWrites.delete(remoteKey);
        const localKey = [...REMOTE_KEYS].find(([, key]) => key === remoteKey)?.[0];
        if (localKey) queueRemoteWrite(localKey, S.get(localKey, null));
      });
      return saved;
    },
    all: (k) => S.get(k, []),
    save: (k, arr) => S.set(k, arr),
    add(k, item) {
      const arr = db.all(k);
      const it = { id: uid(), ...item };
      arr.unshift(it);
      return db.save(k, arr) ? it : null;
    },
    update(k, id, patch) {
      const arr = db.all(k);
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return null;
      arr[i] = { ...arr[i], ...patch };
      return db.save(k, arr) ? arr[i] : null;
    },
    remove(k, id) {
      db.save(k, db.all(k).filter((x) => x.id !== id));
    },
    find: (k, id) => db.all(k).find((x) => x.id === id),

    /* Réglages modifiables par l'administration (hymne, histoire…) */
    setting: (key, fallback) => S.get('set_' + key, fallback),
    setSetting: (key, value) => S.set('set_' + key, value),
    identity: () => ({ ...IST.data.identity, ...db.setting('identity', {}) }),

    CLASSROOM, itemClass,
    /** Classe de l'étudiant, ex. « ASRT-L2 ». */
    classIdOf: (u) => (isStaff(u) ? '' : IST.school.classId(u.filiere, u.niveau)),
    /** Salle de classe de l'étudiant : { label, raw } ou null si non attribuée. */
    myRoom(u) {
      const r = IST.school.roomOf(u.filiere, u.niveau);
      return r ? { raw: r, label: IST.school.roomLabel(r) } : null;
    },
    roomText: (room) => (room === CLASSROOM ? 'Salle de la classe' : room),
    coursesOn(date, u) {
      const wd = date.getDay();
      const match = isStaff(u) ? (c) => forTeacher(c, u) : (c) => forUser(c, u);
      return db.all('courses').filter((c) => c.day === wd && match(c))
        .map((c) => withRoom(c, u)).sort((a, b) => a.start.localeCompare(b.start));
    },
    /** Cours d'une classe précise (espace de classe). */
    classCourses(classId) {
      const info = IST.school.classInfo(classId);
      if (!info) return [];
      const fake = { filiere: info.filiere, niveau: info.niveau, role: 'etudiant' };
      return db.all('courses').filter((c) => forUser(c, fake)).map((c) => withRoom(c, fake))
        .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    },
    /** Cours en cours ou prochain cours dans les 7 jours. */
    nextCourse(u) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      for (let i = 0; i < 8; i++) {
        const d = D.addDays(now, i);
        const list = db.coursesOn(d, u).filter((c) => i > 0 || D.toMin(c.end) > nowMin);
        if (list.length) {
          const c = list[0];
          return { course: c, date: d, offset: i, ongoing: i === 0 && D.toMin(c.start) <= nowMin, minutes: i === 0 ? D.toMin(c.start) - nowMin : null };
        }
      }
      return null;
    },
    programmes: (u) => db.all('programmes').filter((p) => isStaff(u) || forUser(p, u)),
    exams: (u) => db.all('exams').filter((e) => (isStaff(u) ? forTeacher(e, u) : forUser(e, u)))
      .map((e) => withRoom(e, u)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    upcomingExams: (u) => db.exams(u).filter((e) => D.diffDays(new Date(), e.date) >= 0),
    announcements: (u) =>
      db.all('announcements').filter((a) => isStaff(u) || forUser(a, u))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date.localeCompare(a.date)),
    eventsSorted: () => db.all('events').sort((a, b) => a.date.localeCompare(b.date)),
    isOngoing: (ev, today = D.iso(new Date())) => ev.date <= today && (ev.endDate || ev.date) >= today,
    upcomingEvents() {
      const today = D.iso(new Date());
      return db.eventsSorted().filter((e) => (e.endDate || e.date) >= today);
    },

    /* Classes virtuelles */
    posts: (classId) => db.all('posts').filter((p) => p.classId === classId).sort((a, b) => b.date.localeCompare(a.date)),
    studentsOf: (classId) => auth.users().filter((u) => u.role === 'etudiant' && db.classIdOf(u) === classId),
    teachersOf: (classId) => auth.users().filter((u) => (u.classes || []).includes(classId)),
    chefOf: (filiere) => auth.users().find((u) => u.role === 'chef' && u.chefFiliere === filiere),

    /* Notifications (ciblées et filtrées selon les préférences de l'utilisateur) */
    notifications(u) {
      const prefs = (u.prefs && u.prefs.notifs) || {};
      const myClass = db.classIdOf(u);
      return db.all('notifications')
        .filter((n) => (!n.to || n.to === u.id) && n.from !== u.id && prefs[n.type] !== false &&
          (!n.classId || n.classId === myClass) &&
          (!n.filiere || n.filiere === '*' || n.filiere === u.filiere) &&
          (!n.niveau || n.niveau === '*' || n.niveau === u.niveau) &&
          (!n.staffOnly || isStaff(u)))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    unread(u) {
      const read = new Set(u.readNotifs || []);
      return db.notifications(u).filter((n) => !read.has(n.id)).length;
    },
    notify(n) {
      const added = db.add('notifications', { date: new Date().toISOString(), type: 'system', icon: 'bell', ...n });
      if (window.IST && window.IST.pwaNotification) {
        window.IST.pwaNotification.send(n.title || 'Campus+ IST', n.body || '', n.link || 'notifications');
      }
      return added;
    },

    /* Rappels personnels */
    reminders: (u) => S.get('reminders_' + u.id, []),
    saveReminders: (u, arr) => S.set('reminders_' + u.id, arr),
  };

  /* ---------- Comptes ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const defaultPrefs = () => ({ notifs: { cours: true, annonce: true, evenement: true, system: true } });

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(PFX + 'session') || sessionStorage.getItem(PFX + 'session') || 'null');
    } catch (e) {
      return null;
    }
  }

  const auth = {
    users: () => S.get('users', []),
    saveUsers: (a) => S.set('users', a),
    findByEmail: (email) => auth.users().find((u) => u.email === String(email).trim().toLowerCase()),
    findByStaffCode: (code) => {
      if (!code) return null;
      const c = String(code).trim().toUpperCase();
      return auth.users().find((u) => u.staffCode && u.staffCode.trim().toUpperCase() === c);
    },

    async ensureAdmin() {
      const us = auth.users();
      if (us.some((u) => u.role === 'admin') || !IST.config.adminPassword) return;
      const email = IST.config.adminEmail.toLowerCase();
      us.push({
        id: uid(), prenom: 'Admin', nom: 'IST', email, filiere: '', niveau: '', phone: '', role: 'admin',
        password: await hash(email + '|' + IST.config.adminPassword),
        createdAt: new Date().toISOString(), readNotifs: [], events: [], prefs: defaultPrefs(),
      });
      auth.saveUsers(us);
    },

    current() {
      const id = readSession();
      return id ? auth.users().find((u) => u.id === id) || null : null;
    },
    setSession(id, remember) {
      try {
        localStorage.removeItem(PFX + 'session');
        sessionStorage.removeItem(PFX + 'session');
        (remember ? localStorage : sessionStorage).setItem(PFX + 'session', JSON.stringify(id));
      } catch (e) { /* stockage indisponible */ }
    },
    logout() {
      remoteReady = false;
      if (window.IST && window.IST.api) window.IST.api.clearTokens();
      try {
        localStorage.removeItem(PFX + 'session');
        sessionStorage.removeItem(PFX + 'session');
      } catch (e) { /* stockage indisponible */ }
    },

    emailError(v) {
      const email = String(v || '').trim().toLowerCase();
      if (!email) return 'Entre ton adresse email.';
      if (!EMAIL_RE.test(email)) return "Cette adresse email n'est pas valide.";
      const dom = IST.config.allowedEmailDomain;
      if (dom && !email.endsWith('@' + dom)) return `Utilise ton adresse email de l'école (@${dom}).`;
      return '';
    },
    passwordError(v) {
      if (!v) return 'Choisis un mot de passe.';
      if (v.length < 8) return 'Au moins 8 caractères.';
      if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Utilise au moins une lettre et un chiffre.';
      return '';
    },
    /** 0 à 4 */
    strength(v) {
      if (!v) return 0;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
      return s;
    },

    async register(d) {
      const email = d.email.trim().toLowerCase();
      if (auth.findByEmail(email)) return { ok: false, field: 'email', error: 'Un compte existe déjà avec cette adresse email.' };

      const identity = d.identity || 'etudiant';
      let role = 'etudiant';
      if (identity === 'enseignant') role = 'enseignant';
      else if (identity === 'personnel') role = 'personnel';
      else if (identity === 'admin') {
        const sAdmin = (d.service_admin || '').toLowerCase();
        role = sAdmin.includes('communication') ? 'communication' : 'admin';
      }

      // Code d'accès personnel pour tout collaborateur / enseignant / admin
      let staffCode = '';
      if (role !== 'etudiant') {
        const pfxMap = {
          admin: 'ADM',
          communication: 'COM',
          chef: 'CHF',
          enseignant: 'ENS',
          personnel: 'PER',
        };
        const pfx = pfxMap[role] || 'STF';
        const num = Math.floor(1000 + Math.random() * 9000);
        staffCode = `IST-${pfx}-${num}`;
      }

      const phone = (d.phone_etudiant || d.phone_prof || d.phone_perso || d.phone_admin || d.phone || '').trim();
      const civilite = d.titre_prof || d.titre_perso || d.titre_admin || d.civilite || '';
      const fonction = (d.fonction_prof || d.fonction_perso || d.fonction_admin || d.fonction || '').trim();
      const moduleName = (d.module_prof || d.module || '').trim();
      const dureeModule = (d.duree_prof || d.dureeModule || '').trim();
      const service = (d.service_perso || d.service_admin || d.service || '').trim();
      const classes = d.classes || [];

      let apiUser = null;
      if (location.protocol !== 'file:' && window.IST && window.IST.api && window.IST.api.auth) {
        try {
          const apiRoleMap = {
            etudiant: 'student',
            enseignant: 'teacher',
            personnel: 'staff',
            communication: 'staff',
            admin: 'admin',
          };
          const result = await window.IST.api.auth.register({
            email,
            username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || ('user_' + Date.now()),
            password: d.password,
            first_name: d.prenom.trim(),
            last_name: d.nom.trim(),
            role: apiRoleMap[role] || 'student',
            student_number: role === 'etudiant' ? ('IST' + Date.now().toString().slice(-6)) : undefined,
            employee_number: staffCode || undefined,
            level: role === 'etudiant' ? d.niveau : undefined,
            phone: phone,
            specialty: fonction || moduleName || undefined,
          });
          if (result.ok && result.user) apiUser = result.user;
        } catch (_) {}
      }

      const user = {
        id: apiUser ? apiUser.id : uid(),
        prenom: d.prenom.trim(),
        nom: d.nom.trim(),
        email,
        phone,
        role,
        civilite,
        titre: civilite,
        fonction,
        module: moduleName,
        dureeModule,
        service,
        staffCode: staffCode || undefined,
        classes,
        filiere: role === 'etudiant' ? (d.filiere || '') : '',
        niveau: role === 'etudiant' ? (d.niveau || '') : '',
        password: await hash(email + '|' + d.password),
        createdAt: new Date().toISOString(),
        readNotifs: [],
        events: [],
        prefs: defaultPrefs(),
        avatar: null,
      };

      const us = auth.users();
      us.push(user);
      if (!auth.saveUsers(us)) return { ok: false, error: "Impossible d'enregistrer le compte." };
      auth.setSession(user.id, true);

      if (apiUser) {
        try {
          const synced = await db.syncRemote(user);
          if (!synced.ok) {
            auth.logout();
            IST.api.clearTokens();
            return { ok: false, error: synced.error };
          }
        } catch (_) {}
      }

      let welcomeBody = 'Ton compte est prêt. Découvre ton emploi du temps, les actualités et les services du campus.';
      if (role === 'enseignant') {
        welcomeBody = `Bienvenue au corps professoral ! Module : ${moduleName || 'Non spécifié'}${dureeModule ? ` (${dureeModule})` : ''}. Vos classes virtuelles et espaces de devoirs sont disponibles.`;
      } else if (role === 'personnel') {
        welcomeBody = `Bienvenue dans l'équipe IST ! Service : ${service || 'Général'} · Fonction : ${fonction || 'Personnel'}.`;
      } else if (role === 'admin' || role === 'communication') {
        welcomeBody = `Bienvenue dans l'administration IST ! Service : ${service || 'Direction'}. Votre console de gestion est opérationnelle.`;
      }

      db.notify({
        to: user.id, type: 'system', icon: 'sparkles', link: 'home',
        title: `Bienvenue sur Campus+, ${civilite ? civilite + ' ' : ''}${user.prenom} !`,
        body: welcomeBody,
      });

      // Notifier les enseignants de la classe si c'est un étudiant
      if (role === 'etudiant') {
        try {
          const classId = IST.school.classId(user.filiere, user.niveau);
          if (classId) {
            const teachers = auth.users().filter((u) => (u.classes || []).includes(classId) || u.role === 'chef' || u.role === 'enseignant');
            teachers.forEach((teacher) => {
              db.notify({
                to: teacher.id, type: 'system', icon: 'userPlus',
                link: 'classes/' + classId,
                title: `Nouvel étudiant inscrit dans ${classId}`,
                body: `${user.prenom} ${user.nom} vient de rejoindre votre classe (${user.filiere} · ${user.niveau}).`,
              });
            });
          }
        } catch (_) { /* ignore enrollment notification errors */ }
      }

      return { ok: true, user };
    },

    /** Compte du personnel (après saisie du code staff). */
    async registerStaff(d) {
      const email = d.email.trim().toLowerCase();
      if (auth.findByEmail(email)) return { ok: false, field: 'email', error: 'Un compte existe déjà avec cette adresse email.' };
      const user = {
        id: uid(),
        civilite: d.civilite || '', prenom: d.prenom.trim(), nom: d.nom.trim(), email,
        filiere: '', niveau: '', phone: '',
        role: d.role,
        fonction: (d.fonction || '').trim(),
        classes: d.role === 'admin' ? d.classes || [] : d.classes,
        chefFiliere: d.role === 'chef' ? d.chefFiliere : '',
        password: await hash(email + '|' + d.password),
        createdAt: new Date().toISOString(),
        readNotifs: [], events: [], prefs: defaultPrefs(), avatar: null,
      };
      const us = auth.users();
      us.push(user);
      if (!auth.saveUsers(us)) return { ok: false, error: "Impossible d'enregistrer le compte." };
      auth.setSession(user.id, true);
      db.notify({
        to: user.id, type: 'system', icon: 'sparkles', link: 'home',
        title: `Bienvenue sur Campus+, ${user.prenom} !`,
        body: user.role === 'admin' ? "Ton espace d'administration est prêt." : 'Retrouve tes classes, ton emploi du temps et publie des documents pour tes étudiants.',
      });
      return { ok: true, user };
    },

    /* Accès au formulaire du personnel : valable pendant la session du navigateur */
    staffGate: {
      check: (code) => {
        const c = String(code || '').trim().toUpperCase();
        if (IST.config.staffCode && c === IST.config.staffCode.toUpperCase()) return true;
        return Boolean(auth.findByStaffCode(c));
      },
      open() { try { sessionStorage.setItem(PFX + 'staff_gate', '1'); } catch (e) { /* stockage indisponible */ } },
      isOpen() { try { return sessionStorage.getItem(PFX + 'staff_gate') === '1'; } catch (e) { return false; } },
    },

    async login(emailOrCode, password, remember) {
      const trimmed = String(emailOrCode || '').trim();
      const byCode = auth.findByStaffCode(trimmed);
      const email = byCode ? byCode.email : trimmed;

      // Connexion directe par code personnel si mot de passe identique ou omis
      if (byCode && (!password || password.trim().toUpperCase() === byCode.staffCode.trim().toUpperCase())) {
        auth.setSession(byCode.id, remember);
        return { ok: true, user: byCode };
      }
      if (location.protocol !== 'file:' && window.IST && window.IST.api && window.IST.api.auth) {
          const res = await window.IST.api.auth.login(email, password, remember);
          if (res.ok && res.user) {
            const apiUser = res.user;
            const roleMap = {
              student: 'etudiant',
              teacher: 'enseignant',
              staff: 'admin',
              manager: 'admin',
              admin: 'admin',
              communication: 'communication',
            };
            let assignedRole = roleMap[apiUser.role] || 'etudiant';
            if (apiUser.email && apiUser.email.toLowerCase().includes('communication')) {
              assignedRole = 'communication';
            }
            const existing = auth.findByEmail(email);
            const u = {
              ...(existing || {}),
              id: apiUser.id || (existing && existing.id) || uid(),
              prenom: apiUser.first_name || 'Utilisateur',
              nom: apiUser.last_name || 'IST',
              email: apiUser.email,
              filiere: (apiUser.student_profile && apiUser.student_profile.department_code) || (existing && existing.filiere) || '',
              niveau: (apiUser.student_profile && apiUser.student_profile.level) || (existing && existing.niveau) || 'L1',
              phone: apiUser.phone || (existing && existing.phone) || '',
              role: assignedRole,
              password: await hash(email.toLowerCase() + '|' + password),
              createdAt: apiUser.created_at || (existing && existing.createdAt) || new Date().toISOString(),
              readNotifs: (existing && existing.readNotifs) || [], events: (existing && existing.events) || [],
              prefs: (existing && existing.prefs) || defaultPrefs(), avatar: apiUser.avatar_url || (existing && existing.avatar) || null,
            };
            const users = auth.users().filter((user) => user.email !== apiUser.email);
            users.push(u);
            if (!auth.saveUsers(users)) return { ok: false, error: "Impossible d'enregistrer la session." };
            auth.setSession(u.id, remember);
            const synced = await db.syncRemote(u);
            if (!synced.ok) {
              auth.logout();
              IST.api.clearTokens();
              return { ok: false, error: synced.error };
            }
            if (window.IST.api.syncAll) window.IST.api.syncAll();
            return { ok: true, user: u };
          } else if (res.status === 401 || res.status === 403) {
            return { ok: false, error: res.error || 'Email ou mot de passe incorrect.' };
          }
          return { ok: false, error: res.error || 'Connexion au serveur impossible.' };
      }
      const u = auth.findByEmail(email);
      if (!u || u.password !== (await hash(u.email + '|' + password))) return { ok: false, error: 'Email ou mot de passe incorrect.' };
      auth.setSession(u.id, remember);
      return { ok: true, user: u };
    },

    update(id, patch) {
      const us = auth.users();
      const i = us.findIndex((u) => u.id === id);
      if (i < 0) return null;
      us[i] = { ...us[i], ...patch };
      return auth.saveUsers(us) ? us[i] : null;
    },

    async changePassword(u, oldPw, newPw) {
      if (u.password !== (await hash(u.email + '|' + oldPw))) return { ok: false, field: 'old', error: 'Mot de passe actuel incorrect.' };
      auth.update(u.id, { password: await hash(u.email + '|' + newPw) });
      return { ok: true };
    },

    async resetPassword(email, newPw) {
      const u = auth.findByEmail(email);
      if (!u) return { ok: false };
      auth.update(u.id, { password: await hash(u.email + '|' + newPw) });
      return { ok: true };
    },
  };

  /* ---------- Fichiers (PDF, audio…) dans IndexedDB ----------
     localStorage est limité à ~5 Mo : les fichiers vont dans IndexedDB. */
  const files = {
    _db: null,
    open() {
      if (files._db) return files._db;
      files._db = new Promise((resolve, reject) => {
        const r = indexedDB.open('istc_files', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      return files._db;
    },
    async tx(mode, fn) {
      const idb = await files.open();
      return new Promise((resolve, reject) => {
        const t = idb.transaction('files', mode);
        const req = fn(t.objectStore('files'));
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
      });
    },
    put: (id, blob) => files.tx('readwrite', (st) => st.put(blob, id)),
    get: (id) => files.tx('readonly', (st) => st.get(id)),
    del: (id) => files.tx('readwrite', (st) => st.delete(id)),
    /** Enregistre un fichier et retourne ses métadonnées. */
    async save(file, prefix = 'f') {
      const id = `${prefix}_${uid()}`;
      await files.put(id, file);
      return { fileId: id, fileName: file.name, fileSize: file.size, fileType: file.type };
    },
    async download(id, name) {
      const blob = await files.get(id);
      if (!blob) return false;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    },
  };

  IST.db = db;
  IST.auth = auth;
  IST.files = files;
})();
