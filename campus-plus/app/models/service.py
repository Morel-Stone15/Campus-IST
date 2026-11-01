"""
Service model – campus services (restaurant, library, etc.).
"""

from datetime import datetime

from app import db


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    service_type = db.Column(
        db.Enum(
            "restaurant",
            "playground",
            "classroom",
            "library",
            "infirmary",
            "administrative",
            "locker_area",
            name="service_type_enum",
        ),
        nullable=False,
    )
    location_id = db.Column(
        db.Integer, db.ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )

    # ── Opening hours stored as JSON ──────────────────────────────────────────
    # Example: {"monday": {"open": "08:00", "close": "18:00"}, ...}
    opening_hours = db.Column(db.JSON, nullable=True)

    is_active = db.Column(db.Boolean, nullable=False, default=True)
    capacity = db.Column(db.Integer, nullable=True)
    contact_phone = db.Column(db.String(30), nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    location = db.relationship("Location", back_populates="services")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "service_type": self.service_type,
            "location_id": self.location_id,
            "opening_hours": self.opening_hours or {},
            "is_active": self.is_active,
            "capacity": self.capacity,
            "contact_phone": self.contact_phone,
            "contact_email": self.contact_email,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Service {self.name} ({self.service_type})>"
