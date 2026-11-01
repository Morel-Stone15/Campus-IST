/* ==========================================================
   Contenus de démonstration.
   Tous les noms, numéros et textes ci-dessous sont des exemples
   à remplacer par les informations officielles de l'IST.
   Les annonces, événements, cours et documents sont ensuite
   modifiables depuis l'espace Administration de l'application.
   ========================================================== */
(function () {
  const D = IST.date;
  const now = new Date();
  const day = (n) => D.iso(D.addDays(now, n));
  const stamp = (n, h = 9) => {
    const d = D.addDays(now, n);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const academicYear = `${y} – ${y + 1}`;

  /* Emploi du temps hebdomadaire de démonstration (day : 1 = lundi … 5 = vendredi).
     room '@classe' = la salle attribuée à la classe de l'étudiant (js/config.js).
     pole : 'tech', 'management' ou '*' pour tout le monde.
     Les vrais emplois du temps se saisissent dans Administration > Emploi du temps. */
  const C = '@classe';
  const c = (id, pole, dayN, start, end, title, type, room, teacher) =>
    ({ id, pole, day: dayN, start, end, title, type, room, teacher, filiere: '*', niveau: '*' });

  IST.data = {
    academicYear,

    courses: [
      // Pôle Technologique
      c('t1', 'tech', 1, '08:00', '10:00', 'Mathématiques appliquées', 'Cours', 'Amphi', 'Dr Obiang'),
      c('t2', 'tech', 1, '10:15', '12:15', 'Programmation', 'TD', C, 'M. Ndong'),
      c('t3', 'tech', 1, '13:00', '15:00', 'Bases de données', 'Cours', C, 'Mme Mba'),
      c('t4', 'tech', 1, '15:15', '17:15', 'Anglais technique', 'TD', C, 'Mme Nzé'),
      c('t5', 'tech', 2, '08:00', '10:00', 'Réseaux informatiques', 'Cours', C, 'M. Moussavou'),
      c('t6', 'tech', 2, '10:15', '12:15', 'Électronique numérique', 'TP', C, 'M. Ella'),
      c('t7', 'tech', 2, '13:00', '15:00', 'Techniques d\'expression', 'Cours', C, 'Mme Ondo'),
      c('t8', 'tech', 3, '08:00', '10:00', 'Programmation', 'Cours', C, 'M. Ndong'),
      c('t9', 'tech', 3, '10:15', '12:15', 'Mathématiques appliquées', 'TD', C, 'Dr Obiang'),
      c('t10', 'tech', 3, '14:00', '16:00', "Systèmes d'exploitation", 'TP', C, 'M. Nguema'),
      c('t11', 'tech', 4, '08:00', '10:00', 'Bases de données', 'TP', C, 'Mme Mba'),
      c('t12', 'tech', 4, '10:15', '12:15', 'Réseaux informatiques', 'TD', C, 'M. Moussavou'),
      c('t13', 'tech', 4, '13:00', '15:00', 'Gestion de projet', 'Cours', C, 'Mme Bongo'),
      c('t14', 'tech', 5, '08:00', '10:00', "Systèmes d'exploitation", 'Cours', C, 'M. Nguema'),
      c('t15', 'tech', 5, '10:15', '12:15', 'Anglais technique', 'Cours', C, 'Mme Nzé'),
      c('t16', 'tech', 5, '14:00', '16:00', 'Projet tutoré', 'TP', C, 'M. Ella'),
      // Pôle Management
      c('m1', 'management', 1, '08:00', '10:00', 'Comptabilité générale', 'Cours', 'Amphi', 'M. Mintsa'),
      c('m2', 'management', 1, '10:15', '12:15', 'Mathématiques financières', 'TD', C, 'Mme Koumba'),
      c('m3', 'management', 1, '13:00', '15:00', 'Droit des affaires', 'Cours', C, 'Me Ntoutoume'),
      c('m4', 'management', 2, '08:00', '10:00', 'Économie générale', 'Cours', 'Amphi', 'Dr Ekomi'),
      c('m5', 'management', 2, '10:15', '12:15', 'Anglais des affaires', 'TD', C, 'Mme Nzé'),
      c('m6', 'management', 2, '13:00', '15:00', 'Informatique de gestion', 'TP', C, 'M. Ndong'),
      c('m7', 'management', 3, '08:00', '10:00', 'Marketing fondamental', 'Cours', C, 'Mme Bongo'),
      c('m8', 'management', 3, '10:15', '12:15', 'Comptabilité générale', 'TD', C, 'M. Mintsa'),
      c('m9', 'management', 4, '08:00', '10:00', 'Gestion des ressources humaines', 'Cours', C, 'Mme Ondo'),
      c('m10', 'management', 4, '10:15', '12:15', 'Statistiques appliquées', 'TD', C, 'Mme Koumba'),
      c('m11', 'management', 4, '13:00', '15:00', 'Techniques d\'expression', 'Cours', C, 'Mme Ondo'),
      c('m12', 'management', 5, '08:00', '10:00', 'Fiscalité', 'Cours', C, 'M. Mintsa'),
      c('m13', 'management', 5, '10:15', '12:15', 'Management des organisations', 'Cours', C, 'Dr Ekomi'),
      c('m14', 'management', 5, '14:00', '16:00', 'Projet tutoré', 'TD', C, 'Mme Bongo'),
    ],

    exams: [
      { id: 'xt1', pole: 'tech', title: 'Réseaux informatiques', date: day(9), start: '08:00', end: '10:00', room: C, seat: 'Rangée D', filiere: '*', niveau: '*' },
      { id: 'xt2', pole: 'tech', title: 'Mathématiques appliquées', date: day(11), start: '08:00', end: '11:00', room: 'Amphi', seat: 'Rangée B', filiere: '*', niveau: '*' },
      { id: 'xt3', pole: 'tech', title: 'Bases de données', date: day(13), start: '13:00', end: '15:00', room: C, seat: 'Place libre', filiere: '*', niveau: '*' },
      { id: 'xt4', pole: 'tech', title: 'Programmation', date: day(16), start: '08:00', end: '11:00', room: C, seat: 'Place libre', filiere: '*', niveau: '*' },
      { id: 'xm1', pole: 'management', title: 'Comptabilité générale', date: day(9), start: '08:00', end: '11:00', room: 'Amphi', seat: 'Rangée C', filiere: '*', niveau: '*' },
      { id: 'xm2', pole: 'management', title: 'Économie générale', date: day(11), start: '08:00', end: '10:00', room: 'Amphi', seat: 'Rangée A', filiere: '*', niveau: '*' },
      { id: 'xm3', pole: 'management', title: 'Droit des affaires', date: day(14), start: '13:00', end: '15:00', room: C, seat: 'Place libre', filiere: '*', niveau: '*' },
    ],

    programmes: [
      { id: 'ut1', pole: 'tech', semestre: 'Semestre 1', code: 'UE 101', title: 'Mathématiques appliquées', credits: 6, hours: 60, teacher: 'Dr Obiang', description: "Algèbre linéaire, analyse numérique et probabilités appliquées aux problèmes d'ingénierie." },
      { id: 'ut2', pole: 'tech', semestre: 'Semestre 1', code: 'UE 102', title: 'Programmation', credits: 6, hours: 64, teacher: 'M. Ndong', description: 'Algorithmique, programmation structurée puis orientée objet, bonnes pratiques et tests.' },
      { id: 'ut3', pole: 'tech', semestre: 'Semestre 1', code: 'UE 103', title: 'Bases de données', credits: 5, hours: 48, teacher: 'Mme Mba', description: 'Modélisation relationnelle, langage SQL, normalisation et conception de schémas.' },
      { id: 'ut4', pole: 'tech', semestre: 'Semestre 1', code: 'UE 104', title: 'Anglais technique', credits: 3, hours: 30, teacher: 'Mme Nzé', description: 'Lecture de documentation technique, rédaction de rapports et présentation orale en anglais.' },
      { id: 'ut5', pole: 'tech', semestre: 'Semestre 2', code: 'UE 201', title: 'Réseaux informatiques', credits: 6, hours: 56, teacher: 'M. Moussavou', description: 'Modèle OSI, TCP/IP, adressage, routage et commutation. Travaux pratiques sur équipements.' },
      { id: 'ut6', pole: 'tech', semestre: 'Semestre 2', code: 'UE 202', title: "Systèmes d'exploitation", credits: 5, hours: 48, teacher: 'M. Nguema', description: 'Processus, mémoire, systèmes de fichiers. Administration Linux.' },
      { id: 'ut7', pole: 'tech', semestre: 'Semestre 2', code: 'UE 203', title: 'Électronique numérique', credits: 4, hours: 40, teacher: 'M. Ella', description: 'Logique combinatoire et séquentielle, microcontrôleurs.' },
      { id: 'ut8', pole: 'tech', semestre: 'Semestre 2', code: 'UE 204', title: 'Gestion de projet', credits: 3, hours: 30, teacher: 'Mme Bongo', description: 'Méthodes de gestion de projet, planification, travail en équipe.' },
      { id: 'ut9', pole: 'tech', semestre: 'Semestre 2', code: 'UE 205', title: 'Projet tutoré', credits: 2, hours: 40, teacher: 'M. Ella', description: "Réalisation encadrée d'un projet technique en groupe, soutenance en fin de semestre." },
      { id: 'um1', pole: 'management', semestre: 'Semestre 1', code: 'UE 101', title: 'Comptabilité générale', credits: 6, hours: 60, teacher: 'M. Mintsa', description: 'Principes comptables, enregistrement des opérations courantes, travaux de fin d\'exercice.' },
      { id: 'um2', pole: 'management', semestre: 'Semestre 1', code: 'UE 102', title: 'Économie générale', credits: 5, hours: 48, teacher: 'Dr Ekomi', description: 'Microéconomie, macroéconomie et économie gabonaise.' },
      { id: 'um3', pole: 'management', semestre: 'Semestre 1', code: 'UE 103', title: 'Mathématiques financières', credits: 4, hours: 40, teacher: 'Mme Koumba', description: 'Intérêts simples et composés, actualisation, emprunts.' },
      { id: 'um4', pole: 'management', semestre: 'Semestre 1', code: 'UE 104', title: 'Anglais des affaires', credits: 3, hours: 30, teacher: 'Mme Nzé', description: 'Communication professionnelle écrite et orale en anglais.' },
      { id: 'um5', pole: 'management', semestre: 'Semestre 2', code: 'UE 201', title: 'Droit des affaires', credits: 5, hours: 48, teacher: 'Me Ntoutoume', description: 'Droit des contrats, des sociétés et droit OHADA.' },
      { id: 'um6', pole: 'management', semestre: 'Semestre 2', code: 'UE 202', title: 'Marketing fondamental', credits: 5, hours: 48, teacher: 'Mme Bongo', description: 'Étude de marché, comportement du consommateur, marketing-mix.' },
      { id: 'um7', pole: 'management', semestre: 'Semestre 2', code: 'UE 203', title: 'Gestion des ressources humaines', credits: 4, hours: 40, teacher: 'Mme Ondo', description: 'Recrutement, formation, rémunération et relations sociales.' },
      { id: 'um8', pole: 'management', semestre: 'Semestre 2', code: 'UE 204', title: 'Projet tutoré', credits: 3, hours: 40, teacher: 'Mme Bongo', description: 'Projet de groupe encadré et soutenance en fin de semestre.' },
    ],

    documents: [
      { id: 'd1', category: 'reglement', title: "Règlement intérieur de l'IST", version: `Version ${academicYear}`, size: '1,8 Mo', type: 'PDF', url: '', updated: day(-30) },
      { id: 'd2', category: 'autres', title: 'Charte des étudiants', version: '', size: '950 Ko', type: 'PDF', url: '', updated: day(-45) },
      { id: 'd3', category: 'autres', title: "Guide de l'étudiant", version: academicYear, size: '1,2 Mo', type: 'PDF', url: '', updated: day(-40) },
      { id: 'd4', category: 'autres', title: 'Procédure des stages', version: '', size: '870 Ko', type: 'PDF', url: '', updated: day(-20) },
      { id: 'd5', category: 'autres', title: 'Calendrier académique', version: academicYear, size: '320 Ko', type: 'PDF', url: '', updated: day(-35) },
    ],

    announcements: [
      { id: 'a0', category: 'Scolarité', title: `Répartition des salles ${academicYear}`, body: "La Direction des études a publié la répartition des salles de cours. Les L1 suivent leurs cours en amphithéâtre ; les L2 et L3 du Pôle Management et du Pôle Technologique (numérique) sont au Bâtiment B, ceux du Génie Électrique au Bâtiment A, 2e étage.\n\nTa salle est indiquée sur ton accueil, dans ton profil et sur le plan du campus.", date: stamp(0, 8), author: 'Direction des études', pinned: true, filiere: '*' },
      { id: 'a1', category: 'Vie étudiante', title: "Ouverture de la filière QHSE en janvier 2027", body: "Le Pôle Management accueillera la première promotion de la filière Qualité Hygiène Sécurité Environnement (QHSE) en janvier 2027.", date: stamp(-2, 11), author: 'Direction générale', pinned: false, filiere: '*' },
      { id: 'a2', category: 'Scolarité', title: 'Calendrier des examens du semestre publié', body: "Le calendrier des examens est disponible dans l'onglet Vie académique > Examens. Vérifiez bien vos salles et vos horaires. Présentez-vous 15 minutes avant le début de chaque épreuve avec votre carte d'étudiant.", date: stamp(-1, 10), author: 'Scolarité', pinned: false, filiere: '*' },
      { id: 'a3', category: 'Vie étudiante', title: "Journée culturelle de l'IST : appel aux talents", body: 'Danse, chant, slam, mode, cuisine… Inscris-toi auprès du bureau des étudiants pour représenter ta filière lors de la journée culturelle.', date: stamp(-3, 14), author: 'Bureau des étudiants', pinned: false, filiere: '*' },
      { id: 'a4', category: 'Général', title: 'Horaires de la bibliothèque pendant les examens', body: 'Pendant la période des examens, la bibliothèque restera ouverte de 7h30 à 20h00 du lundi au samedi.', date: stamp(-6, 9), author: 'Bibliothèque', pinned: false, filiere: '*' },
      { id: 'a5', category: 'Général', title: 'Bienvenue sur Campus+', body: "Campus+ est la nouvelle application des étudiants de l'IST : emploi du temps, actualités, documents officiels, plan du campus et services, tout au même endroit.", date: stamp(-10, 9), author: 'Administration', pinned: false, filiere: '*' },
    ],

    events: [
      { id: 'e1', type: 'interne', category: 'Intégration', title: "Semaine d'intégration", date: day(-2), endDate: day(2), time: 'Toute la journée', place: 'Campus IST', organizer: 'Bureau des étudiants', description: 'Visites du campus, rencontres avec les associations, jeux et soirée de bienvenue pour les nouveaux étudiants.' },
      { id: 'e2', type: 'interne', category: 'Conférence', title: "Conférence : l'IA et les métiers de demain", date: day(3), time: '14:00', place: 'Amphi', organizer: 'Direction des études', description: "Des professionnels du numérique présentent l'impact de l'intelligence artificielle sur les métiers techniques." },
      { id: 'e3', type: 'interne', category: 'Culture', title: "Journée culturelle de l'IST", date: day(5), time: '10:00', place: 'Campus IST', organizer: 'Bureau des étudiants', description: 'Défilés, danses traditionnelles, gastronomie et concours de talents entre filières.' },
      { id: 'e4', type: 'interne', category: 'Sport', title: 'Tournoi de football inter-promotions', date: day(8), time: '08:00', place: 'Terrain de sport', organizer: 'Association sportive', description: 'Constitue ton équipe et défends les couleurs de ta promotion. Inscriptions auprès du bureau des sports.' },
      { id: 'e5', type: 'interne', category: 'Formation', title: 'Hackathon IST', date: day(20), endDate: day(21), time: '09:00', place: 'Bâtiment B', organizer: 'Club informatique', description: '48 heures pour imaginer et développer une solution numérique utile au campus.' },
      { id: 'e6', type: 'externe', category: 'Emploi', title: 'Forum Emploi Gabon', date: day(11), time: '09:00', place: 'Libreville', organizer: 'Partenaire externe', description: "Rencontre avec des entreprises qui recrutent : stages, premiers emplois et conseils pour l'insertion professionnelle." },
      { id: 'e7', type: 'externe', category: 'Formation', title: "Concours d'innovation Jeunes", date: day(16), time: '09:00', place: 'Libreville', organizer: 'Partenaire externe', description: "Présente ton projet innovant devant un jury et tente de remporter un accompagnement pour le développer." },
      { id: 'e8', type: 'externe', category: 'Conférence', title: "Salon de l'étudiant", date: day(25), time: '10:00', place: 'Libreville', organizer: 'Partenaire externe', description: 'Orientation, poursuites d\'études et bourses : rencontre les établissements et les organismes.' },
    ],

    notifications: [
      { id: 'n1', type: 'annonce', title: 'Calendrier des examens publié', body: 'Consulte tes dates et salles d\'examen.', icon: 'calendar', link: 'academique', date: stamp(-1, 10) },
      { id: 'n2', type: 'annonce', title: 'Répartition des salles publiée', body: 'Découvre ta salle de cours.', icon: 'door', link: 'actualites/a0', date: stamp(0, 8) },
    ],

    /* ---------- Services du campus (contenu statique) ---------- */
    services: {
      restaurant: {
        hours: [['Lundi – Vendredi', '11h30 – 14h30'], ['Samedi', '11h30 – 13h30'], ['Dimanche', 'Fermé']],
        open: { days: [1, 2, 3, 4, 5, 6], from: '11:30', to: { 6: '13:30', default: '14:30' } },
        location: 'Restaurant du campus',
        prices: [['Plat du jour', '1 000 FCFA'], ['Plat + boisson', '1 300 FCFA'], ['Sandwich', '600 FCFA'], ['Jus local', '300 FCFA']],
        menu: {
          1: ['Poulet nyembwe', 'Riz blanc', 'Salade de saison'],
          2: ['Poisson braisé', 'Banane plantain', 'Sauce piment'],
          3: ['Feuilles de manioc (nkoumou)', 'Bâton de manioc', 'Fruit'],
          4: ['Bœuf sauce arachide', 'Riz blanc', 'Ananas'],
          5: ['Brochettes', 'Frites de plantain', 'Salade'],
          6: ['Riz sauté au poulet', 'Jus de fruit'],
        },
      },
      infirmerie: {
        hours: [['Lundi – Vendredi', '7h30 – 17h00'], ['Samedi', '8h00 – 12h00']],
        location: 'Campus IST (emplacement à préciser)',
        phone: '+241 00 00 00 00',
        description: "Premiers soins, consultations de base, conseils de prévention et orientation vers les centres de santé partenaires.",
      },
      bibliotheque: {
        hours: [['Lundi – Vendredi', '7h30 – 18h00'], ['Samedi', '8h00 – 13h00']],
        location: 'Bibliothèque centrale',
        description: 'Ouvrages techniques, mémoires, salles de travail en groupe et accès Wi-Fi. Carte étudiante obligatoire pour emprunter.',
      },
      sport: {
        hours: [['Lundi – Vendredi', '16h00 – 19h00'], ['Samedi', '8h00 – 18h00']],
        location: 'Terrain de sport, au sud du campus',
        description: 'Terrain de football, basket et espace de détente. Matériel disponible auprès de l\'association sportive.',
      },
      soutien: {
        hours: [['Mardi et jeudi', '9h00 – 16h00']],
        location: 'Campus IST (emplacement à préciser)',
        phone: '+241 00 00 00 00',
        description: "Un espace d'écoute confidentiel pour parler du stress, des difficultés personnelles ou de l'organisation des études.",
      },
      // Numéros à vérifier auprès des autorités locales avant la mise en production.
      urgences: [
        ['Infirmerie du campus', '+241 00 00 00 00', 'medical'],
        ['SAMU', '1300', 'heart'],
        ['Pompiers', '18', 'alert'],
        ['Police', '1730', 'shield'],
      ],
    },

    /* ---------- Plan du campus (schéma, coordonnées sur une carte 1000 × 700) ----------
       Les salles de cours sont générées à partir de la répartition des salles (js/config.js). */
    places: [
      { id: 'batA', name: 'Bâtiment A', category: 'batiment', icon: 'building', tone: 'blue', x: 225, y: 118, desc: 'Génie Électrique (EIM, IIRC) au 2e étage : portes A201, A203, A206.' },
      { id: 'batB', name: 'Bâtiment B', category: 'batiment', icon: 'building', tone: 'blue', x: 655, y: 118, desc: 'Pôle Management et Pôle Technologique (numérique) : portes P001 à P217.' },
      { id: 'amphi', name: 'Amphithéâtre', category: 'salle', icon: 'door', tone: 'purple', x: 245, y: 338, desc: 'Cours des L1 du Pôle Management et de la filière IIRC.' },
      { id: 'biblio', name: 'Bibliothèque', category: 'service', icon: 'library', tone: 'red', x: 540, y: 338, desc: 'Bibliothèque et salles de travail.' },
      { id: 'resto', name: 'Restaurant', category: 'service', icon: 'utensils', tone: 'orange', x: 815, y: 338, desc: 'Restauration du midi.' },
      { id: 'infirmerie', name: 'Infirmerie', category: 'service', icon: 'medical', tone: 'pink', x: 180, y: 548, desc: 'Premiers soins et consultations.' },
      { id: 'parking', name: 'Parking', category: 'service', icon: 'car', tone: 'teal', x: 365, y: 575, desc: 'Parking étudiants et personnel.' },
      { id: 'sport', name: 'Terrain de sport', category: 'service', icon: 'ball', tone: 'green', x: 740, y: 580, desc: 'Activités sportives.' },
      { id: 'entree', name: 'Entrée principale', category: 'batiment', icon: 'flag', tone: 'yellow', x: 500, y: 668, desc: "Complexe universitaire et technologique d'Oloumi." },
      ...IST.school.rooms().map((r) => ({
        id: 'room-' + (r.bat || 'X') + r.porte,
        name: 'Porte ' + r.porte,
        category: 'salle',
        parent: r.bat === 'A' ? 'batA' : r.bat === 'B' ? 'batB' : null,
        icon: 'door',
        tone: 'purple',
        desc: [r.bat ? `Bâtiment ${r.bat}, ${IST.school.floor(r.porte)}` : 'Bâtiment à confirmer', r.places ? `${r.places} places` : '', r.classes.join(', ')].filter(Boolean).join(' · '),
      })),
    ],

    /* ---------- Identité de l'IST ---------- */
    identity: {
      lyrics: [
        ['IST, notre fierté,', 'Ton savoir éclaire nos pas,', 'Ensemble pour un avenir meilleur,', 'Nous bâtissons demain…'],
        ['(Couplets à compléter avec', 'les paroles officielles de l\'hymne.)'],
      ],
      history: "L'Institut Supérieur de Technologie forme des techniciens supérieurs et des ingénieurs dans les métiers de l'industrie, du numérique et de la gestion. Situé au complexe universitaire et technologique d'Oloumi à Libreville, l'IST s'organise en deux pôles : le Pôle Management et le Pôle Technologique, du DUT et de la Licence professionnelle jusqu'au Master et au Doctorat. Depuis sa création, l'IST associe enseignements théoriques, travaux pratiques et stages en entreprise pour préparer ses étudiants à une insertion professionnelle réussie. (Texte à remplacer par l'historique officiel.)",
      values: [
        ['Excellence', 'award', 'blue'],
        ['Rigueur', 'target', 'purple'],
        ['Innovation', 'lightbulb', 'orange'],
        ['Solidarité', 'handshake', 'green'],
        ['Intégrité', 'shield', 'teal'],
      ],
      // [service, rôle] : joignables via le standard de l'IST (js/config.js)
      directory: [
        ['Direction générale', 'Secrétariat de direction'],
        ['Direction des études', 'Emplois du temps, répartition des salles, examens'],
        ['Scolarité', 'Inscriptions, certificats, relevés'],
        ['Service des stages', 'Conventions et offres de stage'],
      ],
      socials: [
        ['Site web', 'globe', 'https://ist.univ-lbv.com/'],
        ['Facebook', 'users', 'https://www.facebook.com/ist.univ.lbv'],
        ['LinkedIn', 'briefcase', 'https://www.linkedin.com/school/institut-superieur-de-technologie/'],
      ],
    },
  };
})();
