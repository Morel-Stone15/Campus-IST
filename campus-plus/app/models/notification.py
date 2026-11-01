"""
Notification and HymnContent models.
"""

from datetime import datetime

from app import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = db.Column(db.String(300), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(
        db.Enum(
            "schedule_change",
            "new_document",
            "new_event",
            "reservation_confirmed",
            "reservation_rejected",
            "admin_announcement",
            name="notification_type_enum",
        ),
        nullable=False,
    )
    is_read = db.Column(db.Boolean, nullable=False, default=False)

    # ── Polymorphic reference to related entity ───────────────────────────────
    related_id = db.Column(db.Integer, nullable=True)
    related_type = db.Column(db.String(50), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # ── Relationships ─────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="notifications")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_read": self.is_read,
            "related_id": self.related_id,
            "related_type": self.related_type,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Notification {self.id} user={self.user_id} type={self.notification_type}>"


class HymnContent(db.Model):
    """Singleton table storing the campus hymn metadata (at most one row)."""

    __tablename__ = "hymn_content"

    id = db.Column(db.Integer, primary_key=True)  # always 1
    title = db.Column(db.String(300), nullable=False)
    audio_file_path = db.Column(db.String(500), nullable=True)
    lyrics = db.Column(db.Text, nullable=True)
    is_downloadable = db.Column(db.Boolean, nullable=False, default=True)
    uploaded_by = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    uploader = db.relationship("User", foreign_keys=[uploaded_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "audio_file_path": self.audio_file_path,
            "lyrics": self.lyrics,
            "is_downloadable": self.is_downloadable,
            "uploaded_by": self.uploaded_by,
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<HymnContent {self.title}>"
