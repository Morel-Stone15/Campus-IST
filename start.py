"""
=============================================================================
 CAMPUS+ IST — LANCEUR UNIQUE (FRONTEND + BACKEND UNIFIÉS)
=============================================================================
Ce fichier démarre l'ensemble de l'écosystème Campus+ :
 1. Initialise la base de données SQLite (si besoin avec données de démo)
 2. Démarre le serveur API REST Python (Flask / Waitress)
 3. Sert l'application mobile / web (index.html, CSS, JS, Assets)
 4. Ouvre automatiquement votre navigateur web sur http://localhost:5000

Usage:
    python start.py
    ou double-cliquez sur LANCER_CAMPUS_PLUS.bat
=============================================================================
"""

import os
import sys
import time
import webbrowser
import threading

# Configuration de l'encodage console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "campus-plus")
sys.path.insert(0, BACKEND_DIR)

from app import create_app, db

def init_database_if_needed():
    """Initialise et peuple la base de données si elle est vide."""
    from app.models.user import User
    try:
        db.create_all()
        # Vérifie si au moins un compte existe
        if not User.query.first():
            print("🌱  Initialisation des données de test IST (seeds) ...")
            try:
                from seeds import run_seeds
                run_seeds()
            except Exception as e:
                print(f"⚠️  Note sur le peuplement des seeds : {e}")
    except Exception as exc:
        print(f"⚠️  Vérification de la base de données : {exc}")

def open_browser():
    """Ouvre le navigateur après un court délai pour laisser le serveur démarrer."""
    time.sleep(1.2)
    url = "http://localhost:5000"
    print(f"\n🌐  Ouverture de l'application dans votre navigateur : {url}")
    try:
        webbrowser.open(url)
    except Exception:
        pass

def main():
    print("=" * 65)
    print(" 🎓 CAMPUS+ IST — Démarrage du serveur unifié (Front + Back)")
    print("=" * 65)

    app = create_app("development")

    with app.app_context():
        init_database_if_needed()

    print("\n🚀  Serveur prêt !")
    print("    • URL Frontend : http://localhost:5000")
    print("    • API REST    : http://localhost:5000/api/v1")
    print("    • Santé API   : http://localhost:5000/health")
    print("\n📋  Lorsqu'il peuple une base vide, le script seeds.py affiche un mot de passe de démonstration généré aléatoirement.")
    print("\n(Appuyez sur Ctrl+C dans cette fenêtre pour arrêter le serveur)")
    print("-" * 65)

    # Lancer le navigateur en arrière-plan
    threading.Thread(target=open_browser, daemon=True).start()

    # Démarrage du serveur web
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=5000, threads=6)
    except ImportError:
        app.run(host="0.0.0.0", port=5000, debug=False)

if __name__ == "__main__":
    main()
