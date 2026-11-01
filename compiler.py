"""
compiler.py – Compile l'application Campus+ en un exécutable autonome Windows (.exe)
Usage:
    python compiler.py
"""

import os
import sys
import subprocess

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

print("🔨 Compilation de CAMPUS+ en un fichier exécutable autonome...")

cmd = [
    sys.executable,
    "-m", "PyInstaller",
    "--noconfirm",
    "--onefile",
    "--name", "CampusPlus",
    "--add-data", f"{os.path.join(ROOT_DIR, 'index.html')};.",
    "--add-data", f"{os.path.join(ROOT_DIR, 'css')};css",
    "--add-data", f"{os.path.join(ROOT_DIR, 'js')};js",
    "--add-data", f"{os.path.join(ROOT_DIR, 'assets')};assets",
    "--add-data", f"{os.path.join(ROOT_DIR, 'campus-plus')};campus-plus",
    "--hidden-import", "waitress",
    "--hidden-import", "sqlite3",
    "--hidden-import", "sqlalchemy",
    "--hidden-import", "flask_sqlalchemy",
    "--hidden-import", "flask_jwt_extended",
    "--hidden-import", "flask_cors",
    "start.py"
]

print("Exécution :", " ".join(cmd))
res = subprocess.run(cmd, cwd=ROOT_DIR)

if res.returncode == 0:
    print("\n✅ Compilation réussie ! Le fichier 'CampusPlus.exe' est dans le dossier 'dist/'.")
    # Copier CampusPlus.exe à la racine pour un accès direct en 1 clic
    dist_exe = os.path.join(ROOT_DIR, "dist", "CampusPlus.exe")
    root_exe = os.path.join(ROOT_DIR, "CampusPlus.exe")
    if os.path.exists(dist_exe):
        import shutil
        shutil.copy2(dist_exe, root_exe)
        print(f"📦 'CampusPlus.exe' est également copié directement à la racine : {root_exe}")
else:
    print("\n❌ Erreur lors de la compilation.")

