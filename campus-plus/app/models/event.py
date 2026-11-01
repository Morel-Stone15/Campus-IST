"""
Event and EventRegistration models.
"""

from datetime import datetime

from app import db


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    event_type = db.Column(
        db.Enum(
            "internal", "external", "sport", "conference", "competition", "training",
            name="event_type_enum",
        ),
        nullable=False,
        default="internal",
    )

    # ── Timing ────────────────────────────────────────────────────────────────
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)

    # ── Location ──────────────────────────────────────────────────────────────
    location = db.Column(db.String(300), nullable=True)
    location_detail = db.Column(db.String(300), nullable=True)

    # ── Organiser ─────────────────────────────────────────────────────────────
    organizer_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # ── Registration ──────────────────────────────────────────────────────────
    max_participants = db.Column(db.Integer, nullable=True)
    is_public = db.Column(db.Boolean, nullable=False, default=True)
    registration_required = db.Column(db.Boolean, nullable=False, default=False)
    registration_deadline = db.Column(db.DateTime, nullable=True)

    # ── Media ─────────────────────────────────────────────────────────────────
    image_url = db.Column(db.String(500), nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    status = db.Column(
        db.Enum("draft", "published", "cancelled", "completed", name="event_status_enum"),
        nullable=False,
        default="draft",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    organizer = db.relationship("User", back_populates="organized_events", foreign_keys=[organizer_id])
    registrations = db.relationship(
        "EventRegistration", back_populates="event", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "event_type": self.event_type,
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "location": self.location,
            "location_detail": self.location_detail,
            "organizer_id": self.organizer_id,
            "max_participants": self.max_participants,
            "is_public": self.is_public,
            "registration_required": self.registration_required,
            "registration_deadline": (
                self.registration_deadline.isoformat() if self.registration_deadline else None
            ),
            "image_url": self.image_url,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Event {self.id}: {self.title}>"


class EventRegistration(db.Model):
    __tablename__ = "event_registrations"
    __table_args__ = (
        db.UniqueConstraint("event_id", "user_id", name="uq_event_registration"),
    )

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(
        db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    registered_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(
        db.Enum("registered", "cancelled", "attended", name="event_reg_status_enum"),
        nullable=False,
        default="registered",
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    event = db.relationship("Event", back_populates="registrations")
    user = db.relationship("User", back_populates="event_registrations")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "user_id": self.user_id,
            "registered_at": self.registered_at.isoformat(),
            "status": self.status,
        }

    def __repr__(self) -> str:
        return f"<EventRegistration event={self.event_id} user={self.user_id}>"
