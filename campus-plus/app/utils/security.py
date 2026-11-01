"""
Security helper utilities.
"""

import re
import uuid
import time as _time
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Optional

from werkzeug.utils import secure_filename as _werkzeug_secure_filename


# ── File helpers ──────────────────────────────────────────────────────────────

def generate_secure_filename(filename: str) -> str:
    """Return a collision-resistant, filesystem-safe filename.

    Combines werkzeug's secure_filename with a UUID4 prefix so uploads
    from different users with the same filename never collide.

    Example:
        ``"My Report (Final).pdf"`` → ``"a3f9…_my_report_final.pdf"``
    """
    safe = _werkzeug_secure_filename(filename)
    if not safe:
        safe = "upload"
    ext = safe.rsplit(".", 1)[-1] if "." in safe else ""
    base = safe.rsplit(".", 1)[0] if "." in safe else safe
    unique = str(uuid.uuid4()).replace("-", "")[:8]
    if ext:
        return f"{unique}_{base}.{ext}"
    return f"{unique}_{base}"


def allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Return True if *filename* has an extension in *allowed_extensions*."""
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in {a.lower().lstrip(".") for a in allowed_extensions}


def get_file_size(file) -> int:
    """Return the size in bytes of a Werkzeug ``FileStorage`` object.

    The stream is rewound to position 0 after measuring.
    """
    file.stream.seek(0, 2)  # seek to end
    size = file.stream.tell()
    file.stream.seek(0)  # rewind
    return size


# ── Sanitisation ──────────────────────────────────────────────────────────────

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_SCRIPT_EVENT_RE = re.compile(r"(on\w+\s*=|javascript:)", re.IGNORECASE)


def sanitize_string(text: str) -> str:
    """Basic XSS prevention: strip HTML tags and remove inline event handlers.

    This is a lightweight guard; for rich-text fields consider a dedicated
    library such as *bleach*.
    """
    if not text or not isinstance(text, str):
        return text or ""
    text = _HTML_TAG_RE.sub("", text)
    text = _SCRIPT_EVENT_RE.sub("", text)
    return text.strip()


# ── Audit logging ─────────────────────────────────────────────────────────────

def log_admin_action(
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: Any,
    old_vals: Optional[Dict] = None,
    new_vals: Optional[Dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Persist an audit-log entry for an admin/user action.

    Imports are done inside the function to avoid circular references at
    module import time.
    """
    try:
        from app import db
        from app.models.audit_log import AuditLog

        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_values=old_vals,
            new_values=new_vals,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow(),
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        # Never let audit-log failures crash the main request.
        pass


# ── In-memory rate limiter ────────────────────────────────────────────────────

# Structure: { key: [(timestamp, count), ...] }
_rate_limit_store: Dict[str, list] = defaultdict(list)


def rate_limit_check(key: str, limit: int, window: int) -> bool:
    """Simple in-memory sliding-window rate limiter.

    Args:
        key:    Identifier for the caller (e.g. IP address or user id).
        limit:  Maximum number of requests allowed in *window* seconds.
        window: Time window in seconds.

    Returns:
        ``True`` if the request is within the allowed rate, ``False`` if it
        should be blocked.

    .. note::
        This implementation is **not** suitable for multi-process deployments.
        Use Redis + a proper rate-limiter library (e.g. *flask-limiter*) in
        production.
    """
    now = _time.monotonic()
    cutoff = now - window

    # Remove expired entries
    _rate_limit_store[key] = [ts for ts in _rate_limit_store[key] if ts > cutoff]

    if len(_rate_limit_store[key]) >= limit:
        return False  # rate limit exceeded

    _rate_limit_store[key].append(now)
    return True
