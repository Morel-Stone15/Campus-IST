"""
Reservation models: LockerReservation and RoomReservation.
"""

from datetime import datetime

from app import db


class LockerReservation(db.Model):
    __tablename__ = "locker_reservations"

    id = db.Column(db.Integer, primary_key=True)
    locker_id = db.Column(
        db.Integer, db.ForeignKey("lockers.id", ondelete="CASCADE"), nullable=False
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(
        db.Enum("pending", "active", "cancelled", "expired", name="locker_res_status_enum"),
        nullable=False,
        default="pending",
    )
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    cancellation_reason = db.Column(db.Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    locker = db.relationship("Locker", back_populates="reservations")
    user = db.relationship("User", back_populates="locker_reservations")

    # NOTE: To enforce one active reservation per locker at a time, use a
    # SELECT … FOR UPDATE (or equivalent serializable-transaction) check in the
    # service layer before inserting a new reservation, rather than a simple
    # DB-level unique constraint (which can't filter by status).

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "locker_id": self.locker_id,
            "user_id": self.user_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "cancellation_reason": self.cancellation_reason,
        }

    def __repr__(self) -> str:
        return f"<LockerReservation locker={self.locker_id} user={self.user_id} {self.status}>"


class RoomReservation(db.Model):
    __tablename__ = "room_reservations"

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(
        db.Integer, db.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = db.Column(db.String(300), nullable=False)
    purpose = db.Column(db.Text, nullable=True)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    attendees_count = db.Column(db.Integer, nullable=True)
    status = db.Column(
        db.Enum("pending", "approved", "rejected", "cancelled", name="room_res_status_enum"),
        nullable=False,
        default="pending",
    )
    admin_note = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    classroom = db.relationship("Classroom", back_populates="room_reservations")
    user = db.relationship(
        "User", back_populates="room_reservations", foreign_keys=[user_id]
    )
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "classroom_id": self.classroom_id,
            "user_id": self.user_id,
            "title": self.title,
            "purpose": self.purpose,
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "attendees_count": self.attendees_count,
            "status": self.status,
            "admin_note": self.admin_note,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<RoomReservation room={self.classroom_id} user={self.user_id} {self.status}>"
