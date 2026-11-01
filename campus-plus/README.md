# CAMPUS+ — Backend API

> Backend léger, sécurisé et modulaire pour l'application mobile universitaire **CAMPUS+** de l'Institut Supérieur de Technologie (IST).

---

## 📋 Table des matières

1. [Technologies utilisées](#technologies)
2. [Architecture du projet](#architecture)
3. [Installation rapide](#installation)
4. [Lancement du serveur](#lancement)
5. [Données de démonstration](#seeds)
6. [API – Endpoints principaux](#api)
7. [Rôles et permissions](#roles)
8. [Tests](#tests)
9. [Déploiement en production](#deploiement)
10. [Variables d'environnement](#env)
11. [Base de données](#bdd)

---

## Technologies

| Composant | Technologie |
|---|---|
| Langage | Python 3.11+ |
| Framework Web | Flask 3.0 |
| ORM | SQLAlchemy 2.0 + Flask-Migrate |
| Base de données | SQLite (dev) / PostgreSQL (prod) |
| Authentification | Flask-JWT-Extended |
| CORS | Flask-CORS |
| Serveur prod | Waitress (Windows) / Gunicorn (Linux) |
| Tests | pytest + pytest-flask |

---

## Architecture

```
campus-plus/
├── app/
│   ├── __init__.py          # Factory applicatif (create_app)
│   ├── config.py            # Config spécifique à l'app
│   │
│   ├── models/              # Modèles SQLAlchemy
│   │   ├── user.py          # Utilisateurs + auth helpers
│   │   ├── student.py       # Profil étudiant
│   │   ├── teacher.py       # Profil enseignant
│   │   ├── course.py        # Matières, départements, années académiques
│   │   ├── schedule.py      # Emplois du temps
│   │   ├── document.py      # Documents officiels
│   │   ├── event.py         # Événements + inscriptions
│   │   ├── service.py       # Services du campus
│   │   ├── building.py      # Bâtiments, lieux, salles
│   │   ├── locker.py        # Casiers
│   │   ├── reservation.py   # Réservations casiers & salles
│   │   ├── notification.py  # Notifications + hymne IST
│   │   └── audit_log.py     # Journal d'audit
│   │
│   ├── routes/              # Blueprints Flask (API REST)
│   │   ├── auth.py          # /api/v1/auth
│   │   ├── users.py         # /api/v1/users
│   │   ├── academics.py     # /api/v1/academics (emplois du temps, matières)
│   │   ├── documents.py     # /api/v1/documents
│   │   ├── events.py        # /api/v1/events
│   │   ├── services.py      # /api/v1/services
│   │   ├── buildings.py     # /api/v1/buildings (carte campus)
│   │   ├── lockers.py       # /api/v1/lockers
│   │   ├── reservations.py  # /api/v1/reservations (salles)
│   │   ├── notifications.py # /api/v1/notifications + hymne
│   │   └── admin.py         # /api/v1/admin
│   │
│   ├── utils/
│   │   ├── responses.py     # Helpers JSON standardisés
│   │   ├── decorators.py    # @role_required
│   │   ├── security.py      # Rate limiter, audit log, fichiers
│   │   ├── validators.py    # Validation des données
│   │   └── helpers.py       # Utilitaires divers
│   │
│   └── uploads/             # Fichiers téléversés (gitignored)
│       ├── documents/
│       ├── images/
│       └── audio/
│
├── migrations/              # Alembic migrations (flask db migrate)
├── tests/                   # Suite de tests pytest
├── instance/                # campus.db (SQLite, gitignored)
├── seeds.py                 # Données de démonstration
├── requirements.txt
├── config.py                # Configuration globale Flask
├── run.py                   # Point d'entrée
├── .env.example             # Template des variables d'environnement
└── README.md
```

---

## Installation

### Prérequis

- Python 3.11 ou supérieur
- pip
- (Optionnel) virtualenv ou venv

### Étapes

```bash
# 1. Cloner le projet
cd "c:\Users\user\Desktop\IST Campus\campus-plus"

# 2. Créer et activer un environnement virtuel
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux / macOS

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Configurer les variables d'environnement
copy .env.example .env
# Éditer .env avec vos valeurs

# 5. Initialiser la base de données
flask db init        # (première fois uniquement)
flask db migrate -m "Initial migration"
flask db upgrade

# 6. Charger les données de démonstration
python seeds.py
```

---

## Lancement

### Développement (Flask dev server)

```bash
python run.py
# Serveur disponible sur : http://127.0.0.1:5000
```

### Production (Waitress)

```bash
python run.py --production --host 0.0.0.0 --port 8080
```

### Avec variables d'environnement

```bash
$env:FLASK_ENV = "production"   # PowerShell Windows
python run.py --production
```

### Dans VS Code

1. Ouvrir le dossier `campus-plus/` dans VS Code
2. Sélectionner l'interpréteur Python (`Ctrl+Shift+P` → *Python: Select Interpreter*)
3. Créer un fichier de lancement `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "CAMPUS+ Backend",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/run.py",
      "env": {"FLASK_ENV": "development"},
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Données de démonstration

```bash
python seeds.py
```

Comptes créés :

Les comptes de démonstration partagent un mot de passe temporaire généré aléatoirement et affiché dans le terminal lors du peuplement. Pour utiliser un mot de passe défini localement, renseignez `CAMPUS_SEED_PASSWORD` dans votre fichier `.env` avant de lancer `python seeds.py`. Ne réutilisez pas ce mot de passe en production.

---

## API – Endpoints principaux

Base URL : `http://127.0.0.1:5000/api/v1`

### Authentification

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion → JWT tokens |
| POST | `/auth/logout` | Déconnexion |
| POST | `/auth/refresh` | Rafraîchir le token |
| POST | `/auth/forgot-password` | Demande de reset |
| POST | `/auth/reset-password` | Réinitialiser le mot de passe |
| GET | `/auth/me` | Mon profil |
| PUT | `/auth/me` | Modifier mon profil |
| PUT | `/auth/change-password` | Changer mon mot de passe |

### Vie académique

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/academics/schedules` | Emplois du temps (filtrables) |
| GET | `/academics/courses` | Matières |
| GET | `/academics/departments` | Départements |
| GET | `/academics/years` | Années académiques |

### Documents

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/documents` | Lister les documents |
| POST | `/documents` | Uploader un document (admin) |
| GET | `/documents/<id>` | Détail d'un document |
| GET | `/documents/<id>/download` | Télécharger |

### Événements

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/events` | Lister les événements |
| POST | `/events` | Créer un événement (admin) |
| POST | `/events/<id>/register` | S'inscrire à un événement |
| DELETE | `/events/<id>/unregister` | Se désinscrire |

### Services du campus

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/services` | Lister les services |
| GET | `/services/<id>` | Détail d'un service |

### Carte du campus

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/buildings` | Liste des bâtiments |
| GET | `/buildings/map` | GeoJSON (OpenStreetMap) |
| GET | `/buildings/locations` | Liste des lieux |
| GET | `/buildings/classrooms` | Liste des salles |

### Casiers

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/lockers` | Casiers disponibles |
| POST | `/lockers/reserve` | Réserver un casier |
| PUT | `/lockers/reservations/<id>/cancel` | Annuler une réservation |
| GET | `/lockers/my-reservations` | Mes réservations |

### Réservations de salles

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/reservations` | Mes réservations |
| POST | `/reservations` | Soumettre une demande |
| PUT | `/reservations/<id>/cancel` | Annuler |
| PUT | `/reservations/<id>/review` | Approuver/Refuser (admin) |
| GET | `/reservations/availability` | Vérifier la disponibilité |

### Notifications

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Mes notifications |
| GET | `/notifications/unread-count` | Compteur |
| PUT | `/notifications/<id>/read` | Marquer comme lu |
| PUT | `/notifications/read-all` | Tout marquer comme lu |
| GET | `/notifications/hymn` | Hymne de l'IST |
| PUT | `/notifications/hymn` | Modifier l'hymne (admin) |

### Administration

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Statistiques dashboard |
| GET | `/admin/users` | Tous les utilisateurs |
| POST | `/admin/users` | Créer un compte |
| PUT | `/admin/users/<id>/toggle-active` | Activer/désactiver |
| GET | `/admin/audit-logs` | Journal d'audit |
| GET | `/admin/reservations/rooms` | Toutes les réservations salles |
| POST | `/notifications/broadcast` | Annonce globale |

---

## Rôles et permissions

| Rôle | Description | Accès |
|---|---|---|
| `student` | Étudiant | Lecture, réservations, inscriptions événements |
| `teacher` | Enseignant | Lecture + gestion emplois du temps |
| `staff` | Personnel administratif | Consultation admin, gestion réservations |
| `manager` | Directeur / Responsable | Gestion complète sauf suppression |
| `admin` | Super-administrateur | Accès total |

---

## Tests

```bash
# Lancer tous les tests
pytest

# Avec sortie détaillée
pytest -v

# Un fichier de test spécifique
pytest tests/test_auth.py -v

# Avec couverture de code
pip install pytest-cov
pytest --cov=app --cov-report=term-missing
```

---

## Base de données

### SQLite (développement)
Fichier : `instance/campus.db`

### Migrations

```bash
# Créer une migration après modification d'un modèle
flask db migrate -m "Description du changement"

# Appliquer les migrations
flask db upgrade

# Revenir en arrière
flask db downgrade
```

### PostgreSQL (production)

Dans `.env` :
```
DATABASE_URL=postgresql://user:password@localhost/campusdb
FLASK_ENV=production
```

---

## Déploiement en production

### Linux / Ubuntu avec Gunicorn

```bash
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:8080 "app:create_app('production')"
```

### Windows avec Waitress

```bash
python run.py --production --host 0.0.0.0 --port 8080
```

### Nginx (reverse proxy recommandé)

```nginx
server {
    listen 80;
    server_name api.campusplus.ist.edu;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    client_max_body_size 16M;
}
```

### Checklist de sécurité pour la production

- [ ] Définir `SECRET_KEY` et `JWT_SECRET_KEY` avec des valeurs aléatoires longues
- [ ] Passer à PostgreSQL
- [ ] Configurer HTTPS / SSL
- [ ] Restreindre `CORS_ORIGINS`
- [ ] Vérifier les permissions du dossier `uploads/`
- [ ] Activer les logs applicatifs

---

## Variables d'environnement

Copier `.env.example` en `.env` et adapter :

```env
FLASK_ENV=development
SECRET_KEY=une-clé-secrète-très-longue-et-aléatoire
JWT_SECRET_KEY=une-autre-clé-jwt-très-sécurisée
DATABASE_URL=sqlite:///campus.db          # ou postgresql://...
MAX_CONTENT_LENGTH=16777216               # 16 MB max upload
UPLOAD_FOLDER=app/uploads
ALLOWED_EXTENSIONS=pdf,png,jpg,jpeg,gif,mp3,wav
JWT_ACCESS_TOKEN_EXPIRES=3600             # 1 heure
JWT_REFRESH_TOKEN_EXPIRES=2592000         # 30 jours
FIREBASE_CREDENTIALS=                     # Optionnel (push notifications)
```

---

## Health Check

```
GET /health
→ {"status": "ok", "service": "campus-plus-api"}
```

---

## Notes de développement

- **Réservation concurrente** : Les réservations de casiers utilisent une re-vérification atomique en transaction pour éviter les doubles réservations simultanées.
- **Notifications** : Système interne. Firebase Cloud Messaging optionnel (configurer `FIREBASE_CREDENTIALS`).
- **Fichiers** : Les fichiers uploadés sont stockés dans `app/uploads/`. Prévoir un stockage objet (S3, MinIO) en production.
- **Rate limiting** : Limiter en mémoire (non persistant multi-processus). Pour la production, remplacer par `flask-limiter` + Redis.

---

*CAMPUS+ Backend — Institut Supérieur de Technologie*
