"""
User model – core identity and authentication.
"""

import uuid
from datetime import datetime

from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from werkzeug.security import generate_password_hash, check_password_hash

from app import db


class User(db.Model):
    __tablename__ = "users"

    # ── Primary key ───────────────────────────────────────────────────────────
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # ── Identity ──────────────────────────────────────────────────────────────
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # ── Profile ───────────────────────────────────────────────────────────────
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)

    # ── Role ──────────────────────────────────────────────────────────────────
    role = db.Column(
        db.Enum("student", "teacher", "staff", "manager", "admin", name="user_role_enum"),
        nullable=False,
        default="student",
    )

    # ── Status flags ──────────────────────────────────────────────────────────
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    student_profile = db.relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teacher_profile = db.relationship(
        "Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    notifications = db.relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs = db.relationship("AuditLog", back_populates="user")
    uploaded_documents = db.relationship(
        "Document", back_populates="uploader", foreign_keys="Document.uploaded_by"
    )
    organized_events = db.relationship(
        "Event", back_populates="organizer", foreign_keys="Event.organizer_id"
    )
    event_registrations = db.relationship(
        "EventRegistration", back_populates="user", cascade="all, delete-orphan"
    )
    locker_reservations = db.relationship(
        "LockerReservation", back_populates="user", cascade="all, delete-orphan"
    )
    room_reservations = db.relationship(
        "RoomReservation",
        back_populates="user",
        foreign_keys="RoomReservation.user_id",
        cascade="all, delete-orphan",
    )

    # ── Password helpers ──────────────────────────────────────────────────────
    def set_password(self, password: str) -> None:
        """Hash and store the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Return True if *password* matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    # ── Token helpers ─────────────────────────────────────────────────────────
    def generate_reset_token(self, secret_key: str, expires_in: int = 3600) -> str:
        """Generate a timed, signed password-reset token."""
        s = URLSafeTimedSerializer(secret_key)
        return s.dumps({"user_id": self.id}, salt="password-reset")

    @staticmethod
    def verify_reset_token(token: str, secret_key: str, max_age: int = 3600):
        """Verify a password-reset token and return the User or None."""
        s = URLSafeTimedSerializer(secret_key)
        try:
            data = s.loads(token, salt="password-reset", max_age=max_age)
        except (SignatureExpired, BadSignature):
            return None
        return User.query.get(data.get("user_id"))

    # ── Serialisation ─────────────────────────────────────────────────────────
    def to_dict(self, include_sensitive: bool = False) -> dict:
        result = {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": f"{self.first_name} {self.last_name}",
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "role": self.role,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_sensitive:
            result["password_hash"] = self.password_hash
        return result

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"
