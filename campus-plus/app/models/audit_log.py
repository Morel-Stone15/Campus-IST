"""
AuditLog model – immutable record of admin/user actions.
"""

from datetime import datetime

from app import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action = db.Column(db.String(100), nullable=False)  # e.g. "CREATE", "UPDATE", "DELETE"
    entity_type = db.Column(db.String(100), nullable=False)  # e.g. "User", "Course"
    entity_id = db.Column(db.String(100), nullable=True)

    # ── Change snapshots (nullable for non-data-change events) ───────────────
    old_values = db.Column(db.JSON, nullable=True)
    new_values = db.Column(db.JSON, nullable=True)

    # ── Request context ───────────────────────────────────────────────────────
    ip_address = db.Column(db.String(45), nullable=True)   # supports IPv6
    user_agent = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="audit_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<AuditLog {self.action} on {self.entity_type}#{self.entity_id} "
            f"by user={self.user_id}>"
        )
