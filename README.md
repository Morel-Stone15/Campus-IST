# Campus+ · IST (Application Unifiée Front + Back)

Application web et mobile des étudiants, enseignants et administrateurs de l'IST : emploi du temps, annuaire des enseignants et du personnel administratif, actualités, agenda, documents officiels, casiers, réservations de salles, cartographie du campus et hymne officiel.

---

## 🚀 Comment lancer l'application en 1 seul clic / 1 seul fichier

Vous avez désormais **3 façons ultra-simples** d'ouvrir l'application complète (Backend Python REST + Frontend Web/Mobile réunis sur un seul serveur) :

### Option 1 (Le plus simple sous Windows — Sans rien installer)
👉 Double-cliquez directement sur **`CampusPlus.exe`** à la racine du dossier.
- Il démarre le serveur backend Flask/Waitress.
- Il sert automatiquement le frontend (HTML/CSS/JS/Assets).
- Il ouvre automatiquement votre navigateur sur **http://localhost:5000**.

### Option 2 (Via le fichier batch Windows)
👉 Double-cliquez sur **`LANCER_CAMPUS_PLUS.bat`**.

### Option 3 (En ligne de commande Python)
```bash
python start.py
```

### Utiliser Campus+ sur plusieurs appareils du même réseau

1. Démarrez Campus+ sur le PC qui hébergera les données.
2. Connectez-vous une première fois avec le compte administrateur pour initialiser les contenus partagés.
3. Sur ce PC, lancez `ipconfig` et relevez son adresse IPv4.
4. Depuis les autres appareils connectés au même Wi-Fi, ouvrez `http://ADRESSE-IP-DU-PC:5000`.
5. Si Windows demande une autorisation de pare-feu, autorisez l'accès sur le réseau privé.

Les contenus partagés sont enregistrés dans la base SQLite du PC hôte. Ce PC doit rester allumé et le serveur Campus+ doit rester lancé pour que les autres appareils puissent accéder aux données. Cette configuration fonctionne sur le réseau local ; un accès depuis Internet nécessite un hébergement sécurisé.

**Important :** ce mode local utilise HTTP et des identifiants de démonstration. Ne l'utilisez pas pour transmettre des mots de passe ou des données personnelles réelles sur un réseau non maîtrisé. Pour un usage réel, déployez le serveur derrière HTTPS et configurez des clés secrètes aléatoires.

---

## 🌐 Endpoints de l'application

- **Application Web / Mobile** : `http://localhost:5000/`
- **API REST v1** : `http://localhost:5000/api/v1/`
- **Vérification de santé** : `http://localhost:5000/health`

---

## 📋 Comptes de test disponibles

Les identifiants de démonstration ne sont pas publiés dans ce fichier. Configurez des comptes et des mots de passe locaux pour les essais. Les nouveaux étudiants peuvent également s'inscrire depuis l'écran « Créer un compte ».

---

## 🧪 Tests du Backend

Tous les tests unitaires et d'intégration (63 passés, 0 échec) peuvent être relancés avec :
```bash
pytest campus-plus/tests
```

---

## 🔨 Recompiler l'exécutable

Si vous apportez des modifications au code Python ou au frontend et souhaitez régénérer l'exécutable autonome `CampusPlus.exe` :
```bash
python compiler.py
```
