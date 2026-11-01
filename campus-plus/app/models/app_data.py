"""Persistent shared frontend collections."""

from datetime import datetime

from app import db


class AppData(db.Model):
    __tablename__ = "app_data"

    key = db.Column(db.String(120), primary_key=True)
    payload = db.Column(db.JSON, nullable=False)
    updated_by = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "payload": self.payload,
            "updated_at": self.updated_at.isoformat(),
        }
