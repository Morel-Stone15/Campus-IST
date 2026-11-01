"""
App-level constants and role definitions.
"""

# ── User roles ────────────────────────────────────────────────────────────────
ROLES = ["student", "teacher", "staff", "manager", "admin"]

ADMIN_ROLES = ["manager", "admin"]

# ── Student levels ────────────────────────────────────────────────────────────
STUDENT_LEVELS = ["L1", "L2", "L3", "M1", "M2"]

# ── Teacher grades ────────────────────────────────────────────────────────────
TEACHER_GRADES = ["assistant", "lecturer", "senior_lecturer", "associate_professor", "professor"]

# ── Pagination ────────────────────────────────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100

# ── File uploads ──────────────────────────────────────────────────────────────
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"}
ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "ogg", "m4a"}

# ── Reservation statuses ──────────────────────────────────────────────────────
LOCKER_STATUSES = ["available", "reserved", "maintenance", "out_of_service"]
RESERVATION_STATUSES = ["pending", "active", "cancelled", "expired"]
ROOM_RESERVATION_STATUSES = ["pending", "approved", "rejected", "cancelled"]

# ── Event types ───────────────────────────────────────────────────────────────
EVENT_TYPES = ["internal", "external", "sport", "conference", "competition", "training"]
EVENT_STATUSES = ["draft", "published", "cancelled", "completed"]

# ── Notification types ────────────────────────────────────────────────────────
NOTIFICATION_TYPES = [
    "schedule_change",
    "new_document",
    "new_event",
    "reservation_confirmed",
    "reservation_rejected",
    "admin_announcement",
]
