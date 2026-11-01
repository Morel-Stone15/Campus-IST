"""
Campus+ — Centralized logging configuration.

Usage:
    from app.utils.logging import setup_logging, get_logger

    # In app factory (called once):
    setup_logging(app)

    # In any module:
    logger = get_logger(__name__)
    logger.info("Something happened", extra={"user_id": "abc"})
"""

import logging
import logging.handlers
import os
import sys
import time
from typing import Optional

import flask
from flask import Flask, g, has_request_context, request


# ── Log levels mapping ──────────────────────────────────────────────────────
LOG_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}

# ── Default log directory ────────────────────────────────────────────────────
DEFAULT_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
DEFAULT_LOG_DIR = os.path.abspath(DEFAULT_LOG_DIR)


# ─────────────────────────────────────────────────────────────────────────────
# Custom Formatter – injects request context when available
# ─────────────────────────────────────────────────────────────────────────────

class RequestContextFormatter(logging.Formatter):
    """Formatter that appends request method/path and user info when inside a Flask request."""

    def format(self, record: logging.LogRecord) -> str:
        # Inject request context fields if available
        if has_request_context():
            record.req_method = request.method
            record.req_path = request.path
            record.req_ip = request.remote_addr or "-"
            record.req_id = getattr(g, "request_id", "-")
        else:
            record.req_method = "-"
            record.req_path = "-"
            record.req_ip = "-"
            record.req_id = "-"
        return super().format(record)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def setup_logging(app: Flask, log_dir: Optional[str] = None) -> None:
    """Configure logging for the Flask application.

    * Always logs to stderr (console).
    * In production or when LOG_TO_FILE=1, also writes rotating log files.

    Args:
        app: The Flask application instance.
        log_dir: Override directory for log files. Defaults to ``campus-plus/logs/``.
    """
    log_dir = log_dir or os.environ.get("LOG_DIR", DEFAULT_LOG_DIR)
    log_level_name = os.environ.get("LOG_LEVEL", "DEBUG" if app.debug else "INFO").upper()
    log_level = LOG_LEVEL_MAP.get(log_level_name, logging.INFO)

    # ── Formats ──────────────────────────────────────────────────────────────
    detailed_fmt = (
        "[%(asctime)s] %(levelname)-8s [%(name)s] "
        "[%(req_method)s %(req_path)s ip=%(req_ip)s rid=%(req_id)s] "
        "%(message)s"
    )
    simple_fmt = "[%(asctime)s] %(levelname)-8s %(name)s: %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    console_formatter = RequestContextFormatter(fmt=simple_fmt, datefmt=date_fmt)
    file_formatter = RequestContextFormatter(fmt=detailed_fmt, datefmt=date_fmt)

    # ── Root logger ───────────────────────────────────────────────────────────
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicate output
    root_logger.handlers.clear()

    # ── Console handler (always present) ─────────────────────────────────────
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # ── File handlers (enabled in production or when LOG_TO_FILE=1) ──────────
    should_log_to_file = (
        not app.debug
        or os.environ.get("LOG_TO_FILE", "0") == "1"
    )
    if should_log_to_file:
        try:
            os.makedirs(log_dir, exist_ok=True)

            # General application log (rotates daily, keeps 14 days)
            app_log_path = os.path.join(log_dir, "campus_plus.log")
            file_handler = logging.handlers.TimedRotatingFileHandler(
                app_log_path,
                when="midnight",
                interval=1,
                backupCount=14,
                encoding="utf-8",
            )
            file_handler.setLevel(log_level)
            file_handler.setFormatter(file_formatter)
            root_logger.addHandler(file_handler)

            # Error-only log (easier to monitor in production)
            error_log_path = os.path.join(log_dir, "campus_plus_errors.log")
            error_handler = logging.handlers.TimedRotatingFileHandler(
                error_log_path,
                when="midnight",
                interval=1,
                backupCount=30,
                encoding="utf-8",
            )
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(file_formatter)
            root_logger.addHandler(error_handler)

            app.logger.info("📁 Fichiers de log : %s", log_dir)
        except OSError as exc:
            app.logger.warning("⚠️  Impossible de créer le dossier de logs '%s': %s", log_dir, exc)

    # ── Silence noisy third-party loggers ─────────────────────────────────────
    for noisy in ("werkzeug", "sqlalchemy.engine", "urllib3", "requests"):
        logging.getLogger(noisy).setLevel(
            logging.WARNING if not app.debug else logging.INFO
        )

    app.logger.info(
        "✅ Logging initialisé — niveau=%s to_file=%s",
        log_level_name,
        should_log_to_file,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Use ``__name__`` as the name.

    Example::

        logger = get_logger(__name__)
        logger.info("User %s logged in", user_id)
    """
    return logging.getLogger(name)


# ─────────────────────────────────────────────────────────────────────────────
# Request lifecycle hooks – attach to app via before/after request
# ─────────────────────────────────────────────────────────────────────────────

def _before_request() -> None:
    """Record request start time and assign a lightweight request ID."""
    import uuid
    g.request_id = str(uuid.uuid4())[:8]
    g.request_start = time.monotonic()


def _after_request(response: flask.Response) -> flask.Response:
    """Log every HTTP request with method, path, status, and duration."""
    if has_request_context():
        duration_ms = (time.monotonic() - getattr(g, "request_start", time.monotonic())) * 1000
        logger = get_logger("campus.http")
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            "%s %s → %d (%.1fms)",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
        )
    return response


def register_request_hooks(app: Flask) -> None:
    """Register before/after request hooks on *app* for HTTP logging."""
    app.before_request(_before_request)
    app.after_request(_after_request)
