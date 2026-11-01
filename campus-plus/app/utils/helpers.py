"""
Notification helper shared across route modules.
"""

from datetime import datetime
from app import db


def create_notification(user_id: str, title: str, message: str,
                        notif_type: str = 'info',
                        related_id: str = None,
                        related_type: str = None) -> None:
    """Create and persist a Notification record.

    This helper is intentionally lightweight: it imports the model lazily to
    avoid circular-import issues and silently swallows errors so that a
    notification failure never rolls back a parent transaction.

    Args:
        user_id:      Recipient user UUID string.
        title:        Short notification title.
        message:      Full notification body.
        notif_type:   Logical category (e.g. 'info', 'warning', 'reservation').
        related_id:   Optional FK to the related entity.
        related_type: Optional string describing the related entity type.
    """
    try:
        from app.models import Notification  # lazy import – avoids circular deps
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notif_type,
            related_id=related_id,
            related_type=related_type,
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.session.add(notif)
        # Do NOT commit here – the caller owns the transaction.
    except Exception:
        # Never let notification creation break the parent flow.
        pass
