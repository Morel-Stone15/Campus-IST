"""
Locker model.
"""

from app import db


class Locker(db.Model):
    __tablename__ = "lockers"

    id = db.Column(db.Integer, primary_key=True)
    locker_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    building_id = db.Column(
        db.Integer, db.ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True
    )
    floor = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(50), nullable=True)
    status = db.Column(
        db.Enum(
            "available", "reserved", "maintenance", "out_of_service",
            name="locker_status_enum",
        ),
        nullable=False,
        default="available",
    )
    size = db.Column(
        db.Enum("small", "medium", "large", name="locker_size_enum"),
        nullable=False,
        default="medium",
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    building = db.relationship("Building", back_populates="lockers")
    reservations = db.relationship(
        "LockerReservation", back_populates="locker", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "locker_number": self.locker_number,
            "building_id": self.building_id,
            "floor": self.floor,
            "section": self.section,
            "status": self.status,
            "size": self.size,
            "is_active": self.is_active,
        }

    def __repr__(self) -> str:
        return f"<Locker {self.locker_number} ({self.status})>"
