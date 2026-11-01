"""
Validation helper utilities.
"""

import re
from datetime import datetime, time
from typing import Tuple


# ── Email ─────────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def validate_email(email: str) -> bool:
    """Return True if *email* looks like a valid e-mail address."""
    if not email or not isinstance(email, str):
        return False
    return bool(_EMAIL_RE.match(email.strip()))


# ── Password ──────────────────────────────────────────────────────────────────

def validate_password(password: str) -> Tuple[bool, str]:
    """Check password length and complexity.

    Rules:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Returns:
        (is_valid: bool, error_message: str)  –  error_message is empty when valid.
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", password):
        return False, "Password must contain at least one special character."
    return True, ""


# ── Phone ─────────────────────────────────────────────────────────────────────

_PHONE_RE = re.compile(r"^\+?[0-9\s\-().]{7,20}$")


def validate_phone(phone: str) -> bool:
    """Return True if *phone* is a plausible phone number."""
    if not phone or not isinstance(phone, str):
        return False
    return bool(_PHONE_RE.match(phone.strip()))


# ── Date range ────────────────────────────────────────────────────────────────

def validate_date_range(start, end) -> bool:
    """Return True if *start* is strictly before *end*.

    Accepts ``datetime``, ``date``, or ISO-format strings.
    """
    if isinstance(start, str):
        start = datetime.fromisoformat(start)
    if isinstance(end, str):
        end = datetime.fromisoformat(end)
    if start is None or end is None:
        return False
    return start < end


# ── File extension ────────────────────────────────────────────────────────────

def validate_file_extension(filename: str, allowed: set) -> bool:
    """Return True if the file's extension is in *allowed*.

    Args:
        filename: Original filename (e.g. ``"report.pdf"``).
        allowed: Set of allowed extensions without leading dot
                 (e.g. ``{"pdf", "png"}``).
    """
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in {a.lower().lstrip(".") for a in allowed}


# ── Time-slot overlap ─────────────────────────────────────────────────────────

def validate_time_overlap(
    start1,
    end1,
    start2,
    end2,
) -> bool:
    """Return True if two time intervals overlap.

    Accepts ``datetime``, ``time``, or ISO-format strings.
    Two intervals that merely touch (end1 == start2) do NOT overlap.

    Use this to detect reservation conflicts before saving to the DB.
    """
    def _to_dt(val):
        if isinstance(val, str):
            return datetime.fromisoformat(val)
        if isinstance(val, time):
            # Convert bare time to a comparable numeric value
            return val.hour * 60 + val.minute
        return val

    s1, e1 = _to_dt(start1), _to_dt(end1)
    s2, e2 = _to_dt(start2), _to_dt(end2)

    # Classic overlap: s1 < e2 AND s2 < e1
    return s1 < e2 and s2 < e1
