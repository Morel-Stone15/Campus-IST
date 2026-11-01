/* ==========================================================
   Configuration générale de Campus+
   Sources : offre de formation de l'IST et document
   « Répartition des salles » de la Direction des études.
   ========================================================== */
window.IST = window.IST || {};

IST.config = {
  appName: 'Campus+',
  schoolShort: 'IST',
  schoolName: 'Institut Supérieur de Technologie',
  motto: "Ensemble vers l'excellence",
  city: 'Libreville, Gabon',
  address: "Complexe universitaire et technologique, Parc industriel et commercial d'Oloumi",
  postalBox: 'B.P. 3878 Libreville',
  phone: '76 41 47',
  fax: '76 41 50',

  // Laisser vide pour accepter toutes les adresses email.
  // Exemple : 'ist.ga' pour n'accepter que les adresses de l'école.
  allowedEmailDomain: '',

  // Configure these only for a private, local installation.
  adminEmail: 'admin@ist.ga',
  adminPassword: 'AdminIST2025!',

  // Code unique demandé aux membres du personnel (enseignants, chefs de
  // filière, administration) avant de pouvoir créer leur compte.
  staffCode: 'IST-ADM-2025',

  roles: {
    etudiant: 'Étudiant(e)',
    enseignant: 'Enseignant(e)',
    chef: 'Chef de filière',
    admin: 'Administration',
    communication: 'Service Communication',
    personnel: 'Membre du personnel',
  },
  civilites: ['M.', 'Mme', 'Mlle', 'Dr', 'Pr'],

  // Fichier audio de l'hymne (à déposer dans le dossier assets/).
  hymnUrl: 'assets/hymne.mp3',

  levels: {
    L1: 'Licence 1 (L1)',
    L2: 'Licence 2 (L2)',
    L3: 'Licence 3 (L3)',
    M1: 'Master 1 (M1)',
    M2: 'Master 2 (M2)',
    D: 'Doctorat',
  },
};

/* ----------------------------------------------------------
   Pôles, filières et salles de cours.
   rooms : salle attribuée à chaque niveau.
     'Amphi'             → amphithéâtre
     ['B', 'P107']       → Bâtiment B, porte P107
     [null, '217']       → porte 217 (bâtiment non précisé)
   open: false            → filière en création (non proposée à l'inscription)
   ---------------------------------------------------------- */
(function () {
  const LIC_MASTER = ['L1', 'L2', 'L3', 'M1', 'M2'];

  IST.config.poles = [
    {
      id: 'management', name: 'Pôle Management', building: 'B',
      groups: [{
        name: 'DUT, Licences professionnelles et Masters',
        filieres: [
          { code: 'AGP', name: 'Administration et Gestion Publique', levels: LIC_MASTER, places: 60, rooms: { L1: 'Amphi', L2: ['B', 'P005'], L3: ['B', 'P002'] } },
          { code: 'GRH', name: 'Droit social et GRH', levels: LIC_MASTER, places: 60, rooms: { L1: 'Amphi', L2: ['B', 'P105'], L3: ['B', 'P102'] } },
          { code: 'AQL', name: 'Achat-Qualité-Logistique', levels: LIC_MASTER, places: 60, rooms: { L1: 'Amphi', L2: ['B', 'P205'], L3: ['B', 'P202'] } },
          { code: 'MDE', name: 'Marketing digital et e-commerce', levels: LIC_MASTER, places: 40, rooms: { L1: 'Amphi', L2: ['B', 'P006'], L3: ['B', 'P004'] } },
          { code: 'BFA', name: 'Banque-Finance-Assurance', levels: LIC_MASTER, places: 40, rooms: { L1: 'Amphi', L2: ['B', 'P003'], L3: ['B', 'P001'] } },
          { code: 'CFA', name: 'Comptabilité-Fiscalité-Audit', levels: LIC_MASTER, places: 40, rooms: { L1: 'Amphi', L2: ['B', 'P106'], L3: ['B', 'P104'] } },
          { code: 'GMOP', name: 'Gouvernance et Management des Organisations Publiques', levels: ['M1', 'M2'], rooms: {} },
          { code: 'MRSG', name: 'Recherche en sciences de gestion', levels: ['M1', 'M2', 'D'], rooms: {}, note: "En collaboration avec l'UOB et l'INGS" },
          { code: 'QHSE', name: 'Qualité Hygiène Sécurité Environnement', levels: ['L1'], rooms: {}, open: false, note: '1re année en janvier 2027' },
        ],
      }],
    },
    {
      id: 'tech', name: 'Pôle Technologique', building: 'B',
      groups: [
        {
          name: 'Technologie du Numérique et Intelligence Artificielle',
          filieres: [
            { code: 'IAOC', name: 'Intelligence Artificielle et Objets Connectés', levels: LIC_MASTER, places: 40, rooms: { L2: ['B', 'P203'], L3: ['B', 'P217'] } },
            { code: 'ASRT', name: 'Administration et Sécurité des Réseaux et Télécom', levels: LIC_MASTER, places: 40, rooms: { L2: ['B', 'P107'], L3: ['B', 'P103'] } },
            { code: 'ASBD', name: 'Administration et Sécurité des Bases de Données', levels: LIC_MASTER, places: 40, rooms: { L2: ['B', 'P101'], L3: ['B', 'P206'] } },
            { code: 'GLMA', name: "Génie Logiciel, Maintenance mobile et d'application", levels: LIC_MASTER, rooms: {} },
            { code: 'SICC', name: "Systèmes d'information et Cloud Computing", levels: LIC_MASTER, rooms: {} },
            { code: 'IB', name: 'Informatique Biomédicale', levels: LIC_MASTER, places: 40, rooms: { L2: ['B', 'P204'], L3: ['B', 'P201'] } },
            { code: 'CYBER', name: 'Cybersécurité', levels: ['M1', 'M2'], rooms: {}, open: false, note: 'Master en création' },
          ],
        },
        {
          name: 'Génie Électrique',
          filieres: [
            { code: 'EIM', name: 'Électricité Industrielle et Mécatronique', levels: LIC_MASTER, places: 40, rooms: { L2: ['A', 'A203'], L3: [null, '217'] } },
            { code: 'IIRC', name: 'Instrumentation Industrielle, Régulation et Contrôle', levels: LIC_MASTER, places: 40, rooms: { L1: 'Amphi', L2: ['A', 'A201'], L3: ['A', 'A206'] } },
            { code: 'ELT', name: 'Électrotechnique', levels: LIC_MASTER, rooms: {}, open: false, note: 'Filière en création' },
          ],
        },
        {
          name: 'Génie Énergétique',
          filieres: [
            { code: 'ENR', name: 'Énergie Renouvelable', levels: LIC_MASTER, rooms: {}, open: false, note: 'Filière en création' },
            { code: 'FIC', name: 'Froid Industriel et Climatisation', levels: LIC_MASTER, rooms: {}, open: false, note: 'Filière en création' },
          ],
        },
      ],
    },
  ];
})();

/* ----------------------------------------------------------
   Outils pour lire la configuration de l'école
   ---------------------------------------------------------- */
IST.school = (function () {
  const cfg = IST.config;
  const all = [];
  cfg.poles.forEach((p) => p.groups.forEach((g) =>
    g.filieres.forEach((f) => all.push({ ...f, pole: p.id, poleName: p.name, group: g.name, open: f.open !== false }))));

  const floor = (porte) => {
    const d = String(porte).replace(/\D/g, '')[0];
    return d === '0' ? 'rez-de-chaussée' : d === '1' ? '1er étage' : d ? `${d}e étage` : '';
  };

  const school = {
    all,
    open: () => all.filter((f) => f.open),
    find: (name) => all.find((f) => f.name === name),
    poleOf: (name) => (school.find(name) || {}).pole || '',
    levelLabel: (code) => cfg.levels[code] || code || '',
    levelsOf: (name) => ((school.find(name) || {}).levels || Object.keys(cfg.levels)),
    floor,

    /** Libellé d'une salle : 'Amphi', 'Porte P107 · Bâtiment B'… */
    roomLabel(r) {
      if (!r) return '';
      if (typeof r === 'string') return r;
      const [bat, porte] = r;
      return bat ? `Porte ${porte} · Bâtiment ${bat}` : `Porte ${porte}`;
    },
    /** Salle attribuée à une filière et un niveau (ou null). */
    roomOf(filiere, niveau) {
      const f = school.find(filiere);
      return f && f.rooms[niveau] ? f.rooms[niveau] : null;
    },
    /** Liste de toutes les salles avec les classes qui les occupent. */
    rooms() {
      const map = new Map();
      all.forEach((f) => Object.entries(f.rooms).forEach(([lvl, r]) => {
        if (typeof r === 'string') return; // l'amphi est traité à part
        const key = (r[0] || '') + r[1];
        if (!map.has(key)) map.set(key, { bat: r[0], porte: r[1], places: f.places, classes: [] });
        map.get(key).classes.push(`${f.code} ${lvl}`);
      }));
      return [...map.values()];
    },

    /** Options groupées pour une liste déroulante de filières. */
    filiereOptions(openOnly = true) {
      return cfg.poles.flatMap((p) => p.groups.map((g) => ({
        group: g.name === p.groups[0].name && p.groups.length === 1 ? p.name : `${p.name} · ${g.name}`,
        options: g.filieres.filter((f) => !openOnly || f.open !== false).map((f) => f.name),
      }))).filter((g) => g.options.length);
    },
    levelOptions: (name) => school.levelsOf(name).map((c) => [c, school.levelLabel(c)]),

    /* ---------- Classes (filière + niveau), ex. « ASRT-L2 » ---------- */
    classId(filiere, niveau) {
      const f = school.find(filiere);
      return f && niveau ? `${f.code}-${niveau}` : '';
    },
    classInfo(id) {
      if (!id) return null;
      const [code, niveau] = id.split('-');
      const f = all.find((x) => x.code === code);
      if (!f) return null;
      const r = f.rooms[niveau];
      return {
        id, code, niveau, filiere: f.name, pole: f.pole,
        label: `${code} ${niveau}`,
        long: `${f.name} · ${school.levelLabel(niveau)}`,
        room: r ? school.roomLabel(r) : '',
      };
    },
    /** Identifiants de toutes les classes d'une filière. */
    classesOfFiliere: (name) => {
      const f = school.find(name);
      return f ? f.levels.map((l) => `${f.code}-${l}`) : [];
    },
  };

  // Compatibilité : liste plate des filières ouvertes et des niveaux
  cfg.filieres = school.open().map((f) => f.name);
  cfg.niveaux = Object.keys(cfg.levels);
  return school;
})();
