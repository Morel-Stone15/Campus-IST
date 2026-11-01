"""
Campus+ — Database fallback manager.

Implements a two-tier database strategy:
  1. PRIMARY  → PostgreSQL (Render or any remote DB provided via DATABASE_URL)
  2. FALLBACK → Local SQLite  (activated automatically when PostgreSQL is unreachable)

The active backend is stored in the ``DB_BACKEND`` module-level variable and
can be queried at runtime via :func:`get_active_backend`.

How it works
------------
* :func:`resolve_database_url` is called by the app factory (and by
  ``render_start.py``) **before** ``db.init_app(app)`` is called.
* It tries to connect to the configured PostgreSQL URL.
* If the connection fails (timeout, auth error, host unreachable …) it logs a
  clear warning and returns a SQLite URL instead.
* A ``campus_fallback.db`` file is written next to the normal ``campus.db``.

Usage in app factory
--------------------
    from app.db_fallback import resolve_database_url
    ...
    resolved_url = resolve_database_url(app.config["SQLALCHEMY_DATABASE_URI"])
    app.config["SQLALCHEMY_DATABASE_URI"] = resolved_url
"""

import logging
import os
import time

logger = logging.getLogger("campus.db_fallback")

# ── Backend tracking ──────────────────────────────────────────────────────────
DB_BACKEND: str = "unknown"   # "postgresql", "sqlite_primary", "sqlite_fallback"

# ── SQLite fallback path ──────────────────────────────────────────────────────
_FALLBACK_DB_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "instance")
)
FALLBACK_SQLITE_URL = f"sqlite:///{os.path.join(_FALLBACK_DB_DIR, 'campus_fallback.db')}"
PRIMARY_SQLITE_URL = f"sqlite:///{os.path.join(_FALLBACK_DB_DIR, 'campus.db')}"


def _ensure_instance_dir() -> None:
    """Create the instance/ directory if it does not exist."""
    try:
        os.makedirs(_FALLBACK_DB_DIR, exist_ok=True)
    except OSError as exc:
        logger.warning("Could not create instance dir '%s': %s", _FALLBACK_DB_DIR, exc)


def _test_postgres_connection(url: str, timeout: int = 5) -> bool:
    """Attempt a minimal TCP connect to the PostgreSQL server.

    Returns True if reachable, False otherwise.
    Does NOT execute any SQL — purely a socket-level probe.
    """
    try:
        import psycopg2  # type: ignore
    except ImportError:
        logger.warning(
            "psycopg2 not installed — cannot probe PostgreSQL. "
            "Attempting to connect anyway; SQLAlchemy will raise if the DB is down."
        )
        return True  # Optimistically assume it's up; SQLAlchemy will handle it

    try:
        # Parse DSN from URL (handles both postgres:// and postgresql://)
        conn = psycopg2.connect(url, connect_timeout=timeout)
        conn.close()
        logger.debug("PostgreSQL probe: connection successful.")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("PostgreSQL probe failed: %s", exc)
        return False


def resolve_database_url(
    configured_url: str,
    probe_timeout: int = 5,
    max_retries: int = 2,
) -> str:
    """Return the best available database URL.

    Algorithm
    ---------
    1. If the URL is a SQLite URL, use it as-is (no probe needed).
    2. If the URL is a PostgreSQL URL:
       a. Probe the server up to *max_retries* times.
       b. On success  → return the original URL (PostgreSQL).
       c. On failure  → log a warning and return the fallback SQLite URL.

    Side-effects
    ------------
    * Sets the module-level :data:`DB_BACKEND` variable.
    * Creates the ``instance/`` directory if it doesn't exist.
    * Writes a ``instance/db_status.txt`` file recording the last resolution
      result (useful for health-checks and debugging).

    Args:
        configured_url: The DATABASE_URL from config / environment.
        probe_timeout: Seconds to wait per TCP probe attempt.
        max_retries: Number of probe attempts before giving up.

    Returns:
        The URL that the application should use.
    """
    global DB_BACKEND

    _ensure_instance_dir()

    # Normalise legacy postgres:// scheme
    if configured_url.startswith("postgres://"):
        configured_url = configured_url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = configured_url

    # ── SQLite URL — use directly ─────────────────────────────────────────────
    if configured_url.startswith("sqlite://"):
        DB_BACKEND = "sqlite_primary"
        _write_status("sqlite_primary", configured_url)
        logger.info("🗄️  Base de données : SQLite (mode développement) → %s", configured_url)
        return configured_url

    # ── PostgreSQL URL — probe before committing ──────────────────────────────
    if configured_url.startswith("postgresql://"):
        for attempt in range(1, max_retries + 1):
            logger.info(
                "🔍 Tentative de connexion PostgreSQL (%d/%d) …", attempt, max_retries
            )
            if _test_postgres_connection(configured_url, timeout=probe_timeout):
                DB_BACKEND = "postgresql"
                _write_status("postgresql", configured_url)
                logger.info("✅ PostgreSQL disponible → connexion établie.")
                return configured_url
            if attempt < max_retries:
                wait = attempt * 2
                logger.warning("⏳ Nouvelle tentative dans %ds …", wait)
                time.sleep(wait)

        # All retries exhausted → fall back to SQLite
        logger.warning(
            "⚠️  PostgreSQL INDISPONIBLE après %d tentative(s). "
            "BASCULEMENT sur SQLite de secours : %s",
            max_retries,
            FALLBACK_SQLITE_URL,
        )
        DB_BACKEND = "sqlite_fallback"
        _ensure_instance_dir()
        _write_status("sqlite_fallback", FALLBACK_SQLITE_URL)
        return FALLBACK_SQLITE_URL

    # ── Unknown URL scheme — return as-is and let SQLAlchemy handle it ────────
    logger.warning("URL de base de données non reconnue : '%s'. Utilisation telle quelle.", configured_url)
    DB_BACKEND = "unknown"
    _write_status("unknown", configured_url)
    return configured_url


def get_active_backend() -> str:
    """Return a string describing the currently active database backend.

    Possible values: ``'postgresql'``, ``'sqlite_primary'``,
    ``'sqlite_fallback'``, ``'unknown'``.
    """
    return DB_BACKEND


def get_status_info() -> dict:
    """Return a dict with database status info suitable for health endpoints."""
    status_file = os.path.join(_FALLBACK_DB_DIR, "db_status.txt")
    last_check = "N/A"
    try:
        with open(status_file, "r", encoding="utf-8") as fh:
            last_check = fh.read().strip()
    except OSError:
        pass

    return {
        "db_backend": DB_BACKEND,
        "is_fallback": DB_BACKEND == "sqlite_fallback",
        "fallback_url": FALLBACK_SQLITE_URL,
        "last_resolution": last_check,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _write_status(backend: str, url: str) -> None:
    """Persist current DB backend choice to a human-readable status file."""
    from datetime import datetime
    status_file = os.path.join(_FALLBACK_DB_DIR, "db_status.txt")
    try:
        safe_url = _redact_url(url)
        content = (
            f"Backend  : {backend}\n"
            f"URL      : {safe_url}\n"
            f"Resolved : {datetime.utcnow().isoformat()}Z\n"
        )
        with open(status_file, "w", encoding="utf-8") as fh:
            fh.write(content)
    except OSError as exc:
        logger.debug("Could not write db_status.txt: %s", exc)


def _redact_url(url: str) -> str:
    """Replace password in a database URL with ***."""
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(url)
        if parsed.password:
            netloc = parsed.netloc.replace(parsed.password, "***")
            return urlunparse(parsed._replace(netloc=netloc))
    except Exception:  # noqa: BLE001
        pass
    return url
