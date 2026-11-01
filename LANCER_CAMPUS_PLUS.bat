@echo off
chcp 65001 > nul
title CAMPUS+ IST -- Demarrage du Serveur Unifie
cls

echo =====================================================================
echo           CAMPUS+ IST -- APPLICATION UNIFIEE (FRONT + BACK)
echo =====================================================================
echo.

cd /d "%~dp0"

IF EXIST ".venv\Scripts\python.exe" (
    SET "PYTHON_EXE=.venv\Scripts\python.exe"
) ELSE (
    SET "PYTHON_EXE=python"
)

echo [*] Lancement du serveur Campus+ avec %PYTHON_EXE%...
echo [*] Votre navigateur web va s'ouvrir automatiquement sur http://localhost:5000
echo.

%PYTHON_EXE% start.py

if errorlevel 1 (
    echo.
    echo [!] Une erreur s'est produite lors du demarrage.
    pause
)

