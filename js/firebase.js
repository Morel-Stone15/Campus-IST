/* ==========================================================
   Campus+ IST — Synchronisation Firebase Firestore
   Partage les contenus (annonces, cours, événements…) entre
   tous les appareils en temps réel. Chaque push sur GitHub
   ne remet jamais à zéro les données créées par l'admin.
   ========================================================== */
(function () {
  window.IST = window.IST || {};

  /* ── Configuration Firebase (projet Campus-IST) ──────────── */
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyBcrMZe2U-gUUOg1UstwHP9GEvIrNXZRDU",
    authDomain:        "campus-ist-ga.firebaseapp.com",
    projectId:         "campus-ist-ga",
    storageBucket:     "campus-ist-ga.firebasestorage.app",
    messagingSenderId: "438588479247",
    appId:             "1:438588479247:web:f0f032809f6a71b527907a",
    measurementId:     "G-W7K0G5S1G9",
  };
  // ⚠️ Remplacer les valeurs ci-dessus par celles du projet Firebase
  // réel (Console Firebase > Paramètres du projet > Vos applications).
  const FB_CONFIGURED = !FIREBASE_CONFIG.apiKey.includes('Placeholder');

  /* ── Client REST Firestore (sans SDK lourd) ──────────────── */
  // Utilise l'API REST Firestore pour éviter d'importer 150 Ko de SDK.
  const BASE = FB_CONFIGURED
    ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`
    : null;

  // Nom du document racine partagé (une seule collection "campus")
  const DOC_PATH = 'campus/shared';

  /* ── Collections synchronisées ───────────────────────────── */
  const SHARED_KEYS = ['announcements', 'events', 'courses', 'exams', 'documents', 'programmes', 'posts', 'set_identity', 'set_hymn', 'set_services'];

  /* ── Conversion Firestore JSON ↔ JS plain object ─────────── */
  function toFirestore(data) {
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) {
        fields[k] = { nullValue: null };
      } else if (typeof v === 'boolean') {
        fields[k] = { booleanValue: v };
      } else if (typeof v === 'number') {
        fields[k] = { integerValue: String(v) };
      } else if (typeof v === 'string') {
        fields[k] = { stringValue: v };
      } else {
        // Arrays / Objects → JSON string
        fields[k] = { stringValue: JSON.stringify(v) };
      }
    }
    return { fields };
  }

  function fromFirestore(doc) {
    if (!doc || !doc.fields) return null;
    const out = {};
    for (const [k, v] of Object.entries(doc.fields)) {
      if      (v.stringValue  !== undefined) {
        try { out[k] = JSON.parse(v.stringValue); } catch { out[k] = v.stringValue; }
      }
      else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
      else if (v.doubleValue  !== undefined) out[k] = v.doubleValue;
      else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
      else                                   out[k] = null;
    }
    return out;
  }

  /* ── API clé Firestore (token anonyme via REST) ──────────── */
  let _anonToken = null;
  let _tokenExpiry = 0;

  async function getToken() {
    if (_anonToken && Date.now() < _tokenExpiry) return _anonToken;
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInAnonymously?key=${FIREBASE_CONFIG.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      _anonToken = data.idToken;
      _tokenExpiry = Date.now() + (Number(data.expiresIn) - 60) * 1000;
      return _anonToken;
    } catch {
      return null;
    }
  }

  /* ── Lecture & écriture Firestore ───────────────────────────── */
  async function fsGet() {
    if (!BASE) return null;
    try {
      const token = await getToken();
      const headers = {};
      let url = `${BASE}/${DOC_PATH}`;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        url += `?key=${FIREBASE_CONFIG.apiKey}`;
      }
      const res = await fetch(url, { headers });
      if (res.status === 404) return {}; // Pas encore initialisé
      if (!res.ok) return null;
      return fromFirestore(await res.json());
    } catch {
      return null;
    }
  }

  async function fsPatch(data) {
    if (!BASE) return false;
    try {
      const token = await getToken();
      const headers = { 'Content-Type': 'application/json' };
      const fields = toFirestore(data);
      const updateMask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      
      let url = `${BASE}/${DOC_PATH}?${updateMask}`;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const sep = updateMask ? '&' : '';
        url += `${sep}key=${FIREBASE_CONFIG.apiKey}`;
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ── Interface publique ────────────────────────────────────── */
  IST.fsync = {
    configured: FB_CONFIGURED,
    sharedKeys: SHARED_KEYS,

    /** Charge toutes les collections depuis Firestore */
    async load() {
      if (!FB_CONFIGURED) return null;
      return fsGet();
    },

    /** Sauvegarde une ou plusieurs clés dans Firestore */
    async save(patch) {
      if (!FB_CONFIGURED) return false;
      return fsPatch(patch);
    },

    /** Sauvegarde une seule clé */
    async saveKey(key, value) {
      return IST.fsync.save({ [key]: value });
    },
  };
})();
