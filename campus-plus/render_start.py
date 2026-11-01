"""
Initialize the production database and start the Render web service.

Strategy
--------
1.  Try to connect to the PostgreSQL DATABASE_URL provided by Render.
2.  If that connection fails (or DATABASE_URL is absent), fall back to a
    local SQLite database (``instance/campus_fallback.db``).  This means the
    service can still start and serve the frontend even when the managed
    database is temporarily unavailable.
3.  Log every decision with enough context for easy debugging.
"""

import logging
import os
import sys
import time

# ---------------------------------------------------------------------------
# Basic logging bootstrap (before Flask / app factory are loaded)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-8s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stderr,
)
logger = logging.getLogger("campus.render_start")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fix_postgres_url() -> str:
    """Normalize the DATABASE_URL and return it (or '' if absent)."""
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = url
        logger.info("DATABASE_URL scheme normalised: postgres:// → postgresql://")
    return url


def _validate_secrets() -> list[str]:
    """Return a list of missing/weak secret key names."""
    problems = []
    for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
        val = os.environ.get(key, "")
        if len(val) < 32:
            problems.append(key)
    return problems


def initialize_production_database(flask_app=None) -> dict:
    """Create the schema and initial admin account.

    Returns a dict with keys:
        ``db_backend``   – 'postgresql' | 'sqlite_fallback'
        ``db_url``       – the URL actually used (password redacted)
        ``admin_created``– True if the admin was created during this run
    """
    from app import create_app, db
    from app.models.user import User
    from app.db_fallback import get_active_backend, get_status_info, _redact_url

    result = {"db_backend": "unknown", "db_url": "", "admin_created": False}

    database_url = _fix_postgres_url()

    # ── Secret key validation (warn only; don't block if using fallback) ──────
    missing_secrets = _validate_secrets()
    if missing_secrets:
        logger.warning(
            "⚠️  Clés secrètes manquantes ou trop courtes (<32 chars) : %s. "
            "Définissez-les dans Render → Environment.",
            ", ".join(missing_secrets),
        )

    # ── Build Flask app (resolve_database_url is called inside create_app) ────
    app = flask_app or create_app("production")

    with app.app_context():
        actual_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        backend = get_active_backend()
        result["db_backend"] = backend
        result["db_url"] = _redact_url(actual_url)

        if backend == "sqlite_fallback":
            logger.warning(
                "🟡 MODE SECOURS : PostgreSQL indisponible. "
                "Utilisation de SQLite de secours → %s",
                _redact_url(actual_url),
            )
        elif backend == "postgresql":
            logger.info("🟢 Connecté à PostgreSQL → %s", _redact_url(actual_url))
        else:
            logger.info("🔵 Backend base de données : %s → %s", backend, _redact_url(actual_url))

        # ── Create schema ──────────────────────────────────────────────────────
        try:
            db.create_all()
            logger.info("✅ Schéma de base de données créé / vérifié.")
        except Exception as exc:
            logger.error("❌ Erreur lors de db.create_all(): %s", exc, exc_info=True)
            raise

        # ── Create initial admin (skip gracefully if secrets missing) ─────────
        email = os.environ.get("INITIAL_ADMIN_EMAIL", "").strip().lower()
        password = os.environ.get("INITIAL_ADMIN_PASSWORD", "")

        if not email or "@" not in email or len(email) > 254:
            logger.warning(
                "INITIAL_ADMIN_EMAIL non défini ou invalide — "
                "compte admin non créé automatiquement."
            )
            return result

        if len(password) < 12:
            logger.warning(
                "INITIAL_ADMIN_PASSWORD trop court (<12 chars) — "
                "compte admin non créé automatiquement."
            )
            return result

        try:
            existing = User.query.filter_by(email=email).first()
            if existing:
                if existing.role != "admin":
                    logger.error(
                        "INITIAL_ADMIN_EMAIL '%s' est déjà utilisé par un compte non-admin (%s).",
                        email, existing.role,
                    )
                else:
                    logger.info("Admin '%s' existe déjà — pas de création.", email)
                return result

            import secrets as _secrets
            admin = User(
                email=email,
                username=f"campus-admin-{_secrets.token_hex(4)}",
                first_name="Administrateur",
                last_name="IST",
                role="admin",
                is_active=True,
                is_verified=True,
            )
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            result["admin_created"] = True
            logger.info("✅ Compte admin créé pour '%s'.", email)

        except Exception as exc:
            db.session.rollback()
            logger.error("❌ Erreur lors de la création du compte admin : %s", exc, exc_info=True)

    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  🎓 CAMPUS+ IST — Démarrage Render (production)")
    logger.info("=" * 60)

    start_ts = time.monotonic()

    try:
        info = initialize_production_database()
    except Exception as exc:
        logger.critical("💥 Échec de l'initialisation : %s", exc, exc_info=True)
        sys.exit(1)

    elapsed = time.monotonic() - start_ts
    logger.info(
        "✅ Initialisation terminée en %.1fs — backend=%s admin_created=%s",
        elapsed,
        info["db_backend"],
        info["admin_created"],
    )

    # ── Launch Gunicorn ───────────────────────────────────────────────────────
    port = os.environ.get("PORT", "10000")
    workers = os.environ.get("GUNICORN_WORKERS", "2")
    timeout = os.environ.get("GUNICORN_TIMEOUT", "120")

    gunicorn_cmd = [
        "gunicorn",
        "run:app",
        "--bind", f"0.0.0.0:{port}",
        "--workers", workers,
        "--timeout", timeout,
        "--log-level", "info",
        "--access-logfile", "-",
        "--error-logfile", "-",
    ]
    logger.info("🚀 Lancement de Gunicorn : %s", " ".join(gunicorn_cmd))
    os.execvp("gunicorn", gunicorn_cmd)
