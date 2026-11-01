/* ==========================================================
   Client API REST Campus+ pour le Backend Python (Flask)
   Connecte l'interface mobile / Web aux routes /api/v1/
   ========================================================== */
(function () {
  window.IST = window.IST || {};

  // ── Résolution automatique de l'URL de l'API ────────────────────────────
  // Priorité :
  //   1. window.IST_API_BASE défini manuellement (déploiement custom)
  //   2. Protocole file:// → serveur local
  //   3. GitHub Pages (*.github.io) → URL Render configurée dans CAMPUS_API_URL
  const RENDER_API_URL = window.CAMPUS_API_URL || 'https://campus-ist.onrender.com/api/v1';
  const isGitHubPages = window.location.hostname.endsWith('.github.io');

  const API_BASE = window.IST_API_BASE || (
    window.location.protocol === 'file:'
      ? 'http://localhost:5000/api/v1'
      : isGitHubPages
        ? RENDER_API_URL
        : `${window.location.origin}/api/v1`
  );

  // Avertissement développeur si on pointe vers Render depuis GitHub Pages
  if (isGitHubPages) {
    console.info(
      '[Campus+ API] GitHub Pages détecté. API pointée vers :',
      API_BASE,
      '\nPour changer, définissez window.CAMPUS_API_URL avant ce script.'
    );
  }

  const TOKEN_KEY = 'istc_jwt_token';
  const REFRESH_KEY = 'istc_jwt_refresh';

  const api = {
    base: API_BASE,

    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
      } catch (e) {
        return null;
      }
    },

    setTokens(access, refresh, remember = true) {
      const storage = remember ? localStorage : sessionStorage;
      try {
        if (access) storage.setItem(TOKEN_KEY, access);
        if (refresh) storage.setItem(REFRESH_KEY, refresh);
      } catch (e) {}
    },

    clearTokens() {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
      } catch (e) {}
    },

    async request(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
      const headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
      };

      const token = api.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      try {
        const res = await fetch(url, { ...options, headers });
        const contentType = res.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          data = await res.text();
        }

        if (!res.ok) {
          const errMsg = (data && data.message) || (data && data.error) || `Erreur serveur (${res.status})`;
          return { ok: false, status: res.status, error: errMsg, data };
        }
        return { ok: true, status: res.status, data: data ? (data.data !== undefined ? data.data : data) : null };
      } catch (err) {
        return { ok: false, status: 0, error: 'Serveur Campus+ hors-ligne ou non joignable (vérifiez la connexion réseau).' };
      }
    },

    // ── AUTHENTIFICATION ──────────────────────────────────────
    auth: {
      async login(emailOrUsername, password, remember = true) {
        const res = await api.request('/auth/login', {
          method: 'POST',
          body: { email: emailOrUsername, password }
        });
        if (res.ok && res.data) {
          api.setTokens(res.data.access_token, res.data.refresh_token, remember);
          return { ok: true, user: res.data.user, token: res.data.access_token };
        }
        return { ok: false, error: res.error || 'Identifiants invalides' };
      },

      async register(userData) {
        const res = await api.request('/auth/register', {
          method: 'POST',
          body: userData
        });
        if (res.ok && res.data) {
          api.setTokens(res.data.access_token, res.data.refresh_token, true);
          return { ok: true, user: res.data.user };
        }
        return { ok: false, error: res.error || "Impossible d'enregistrer le compte" };
      },

      async me() {
        return api.request('/auth/me');
      },

      async logout() {
        await api.request('/auth/logout', { method: 'POST' });
        api.clearTokens();
      }
    },

    // ── ACADEMICS (Emplois du temps, cours, départements) ─────
    academics: {
      schedules: (params = '') => api.request(`/academics/schedules${params ? '?' + params : ''}`),
      courses: (params = '') => api.request(`/academics/courses${params ? '?' + params : ''}`),
      departments: () => api.request('/academics/departments'),
      classrooms: () => api.request('/academics/classrooms'),
    },

    // ── DOCUMENTS ─────────────────────────────────────────────
    documents: {
      list: (params = '') => api.request(`/documents${params ? '?' + params : ''}`),
      categories: () => api.request('/documents/categories'),
      upload: (formData) => api.request('/documents', { method: 'POST', body: formData }),
    },

    // ── ÉVÉNEMENTS ───────────────────────────────────────────
    events: {
      list: (params = '') => api.request(`/events${params ? '?' + params : ''}`),
      get: (id) => api.request(`/events/${id}`),
      register: (id) => api.request(`/events/${id}/register`, { method: 'POST' }),
      cancelRegistration: (id) => api.request(`/events/${id}/register`, { method: 'DELETE' }),
    },

    // ── SERVICES & CARTOGRAPHIE ──────────────────────────────
    services: {
      list: () => api.request('/services'),
    },
    maps: {
      locations: () => api.request('/buildings/locations'),
      buildings: () => api.request('/buildings'),
    },

    // ── CASIERS & RÉSERVATIONS ────────────────────────────────
    lockers: {
      list: (params = '') => api.request(`/lockers${params ? '?' + params : ''}`),
      reserve: (data) => api.request('/lockers/reserve', { method: 'POST', body: data }),
      myReservation: () => api.request('/lockers/my-reservation'),
      history: () => api.request('/lockers/history'),
    },
    reservations: {
      list: () => api.request('/reservations'),
      create: (data) => api.request('/reservations', { method: 'POST', body: data }),
    },

    // ── STOCKAGE PARTAGÉ DES CONTENUS ─────────────────────────
    appData: {
      load: () => api.request('/app-data'),
      bootstrap: (collections) => api.request('/app-data/bootstrap', {
        method: 'POST',
        body: { collections },
      }),
      save: (key, payload) => api.request(`/app-data/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: payload,
      }),
    },

    // ── NOTIFICATIONS & HYMNE ────────────────────────────────
    notifications: {
      list: () => api.request('/notifications'),
      unreadCount: () => api.request('/notifications/unread-count'),
      markRead: (id) => api.request(`/notifications/${id}/read`, { method: 'PUT' }),
      markAllRead: () => api.request('/notifications/read-all', { method: 'PUT' }),
      hymn: () => api.request('/notifications/hymn'),
    },

    // ── SYNCHRONISATION GLOBALE API → STORE LOCAL ────────────
    async syncAll() {
      try {
        const [coursesRes, eventsRes, servicesRes, notifsRes, hymnRes] = await Promise.all([
          api.academics.courses(),
          api.events.list(),
          api.services.list(),
          api.notifications.list(),
          api.notifications.hymn()
        ]);

        if (coursesRes.ok && Array.isArray(coursesRes.data)) {
          console.log(`[Campus+ API] Synchronisation de ${coursesRes.data.length} cours.`);
        }
        if (eventsRes.ok && Array.isArray(eventsRes.data)) {
          console.log(`[Campus+ API] Synchronisation de ${eventsRes.data.length} événements.`);
        }
        if (servicesRes.ok && Array.isArray(servicesRes.data)) {
          console.log(`[Campus+ API] Synchronisation de ${servicesRes.data.length} services.`);
        }
        return true;
      } catch (err) {
        console.warn('[Campus+ API] Synchronisation en arrière-plan ignorée (serveur non joignable).');
        return false;
      }
    }
  };

  IST.api = api;
})();
