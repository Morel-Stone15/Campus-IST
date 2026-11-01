"""
Room Reservation routes – /api/v1/reservations

Handles classroom reservation requests with overlap detection,
admin approval/rejection workflow, and notification dispatch.
"""

from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import and_, or_

from app import db
from app.models.building import Classroom
from app.models.reservation import RoomReservation
from app.models.notification import Notification
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

reservations_bp = Blueprint("reservations", __name__)


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _check_overlap(classroom_id: int, start: datetime, end: datetime,
                   exclude_id: int = None) -> bool:
    """
    Return True if any *approved* or *pending* reservation overlaps
    with the given [start, end] window for the given classroom.
    """
    q = RoomReservation.query.filter(
        RoomReservation.classroom_id == classroom_id,
        RoomReservation.status.in_(["pending", "approved"]),
        RoomReservation.start_datetime < end,
        RoomReservation.end_datetime > start,
    )
    if exclude_id:
        q = q.filter(RoomReservation.id != exclude_id)
    return q.first() is not None


# ══════════════════════════════════════════════════════════════════════════════
# LIST / SEARCH
# ══════════════════════════════════════════════════════════════════════════════

@reservations_bp.route("", methods=["GET"])
@jwt_required()
def list_reservations():
    """
    Return reservations.
    - Students/teachers see only their own.
    - Admins/managers/staff see all.
    """
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "student")

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")
    classroom_id = request.args.get("classroom_id", type=int)

    q = RoomReservation.query

    if role not in ("admin", "manager", "staff"):
        q = q.filter(RoomReservation.user_id == user_id)

    if status:
        q = q.filter(RoomReservation.status == status)
    if classroom_id:
        q = q.filter(RoomReservation.classroom_id == classroom_id)

    q = q.order_by(RoomReservation.start_datetime.desc())
    return paginated_response(q, page, per_page, message="Réservations récupérées.")


@reservations_bp.route("/<int:reservation_id>", methods=["GET"])
@jwt_required()
def get_reservation(reservation_id):
    """Return a single reservation (owner or admin)."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "student")

    res = RoomReservation.query.get_or_404(reservation_id)

    if res.user_id != user_id and role not in ("admin", "manager", "staff"):
        return error_response("Accès refusé.", 403)

    return success_response(data=res.to_dict(), message="Réservation récupérée.")


# ══════════════════════════════════════════════════════════════════════════════
# CREATE RESERVATION REQUEST
# ══════════════════════════════════════════════════════════════════════════════

@reservations_bp.route("", methods=["POST"])
@jwt_required()
def create_reservation():
    """Submit a room reservation request."""
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    required = ["classroom_id", "title", "start_datetime", "end_datetime"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    # Parse datetimes
    try:
        start_dt = datetime.fromisoformat(data["start_datetime"])
        end_dt = datetime.fromisoformat(data["end_datetime"])
    except ValueError:
        return error_response(
            "Format de date invalide. Utilisez ISO 8601 (YYYY-MM-DDTHH:MM:SS).", 422
        )

    if end_dt <= start_dt:
        return error_response("La date de fin doit être après la date de début.", 422)

    if start_dt < datetime.utcnow():
        return error_response("La date de début ne peut pas être dans le passé.", 422)

    # Verify classroom exists and is active
    classroom = Classroom.query.get(data["classroom_id"])
    if not classroom or not classroom.is_active:
        return error_response("Salle introuvable ou inactive.", 404)

    # Check capacity
    attendees = data.get("attendees_count")
    if attendees and classroom.capacity and attendees > classroom.capacity:
        return error_response(
            f"La capacité de la salle est {classroom.capacity} personnes.", 400
        )

    # Overlap check
    if _check_overlap(classroom.id, start_dt, end_dt):
        return error_response(
            "Ce créneau est déjà réservé ou en attente pour cette salle.", 409
        )

    try:
        res = RoomReservation(
            classroom_id=classroom.id,
            user_id=user_id,
            title=data["title"].strip(),
            purpose=data.get("purpose"),
            start_datetime=start_dt,
            end_datetime=end_dt,
            attendees_count=attendees,
            status="pending",
        )
        db.session.add(res)
        db.session.commit()

        return success_response(
            data=res.to_dict(),
            message="Demande de réservation soumise. En attente de validation.",
            status_code=201,
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# CANCEL (by owner)
# ══════════════════════════════════════════════════════════════════════════════

@reservations_bp.route("/<int:reservation_id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_reservation(reservation_id):
    """Cancel a pending or approved reservation."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "student")

    res = RoomReservation.query.get_or_404(reservation_id)

    if res.user_id != user_id and role not in ("admin", "manager", "staff"):
        return error_response("Accès refusé.", 403)

    if res.status not in ("pending", "approved"):
        return error_response("Cette réservation ne peut plus être annulée.", 400)

    try:
        res.status = "cancelled"
        res.updated_at = datetime.utcnow()
        db.session.commit()
        return success_response(data=res.to_dict(), message="Réservation annulée.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: APPROVE / REJECT
# ══════════════════════════════════════════════════════════════════════════════

@reservations_bp.route("/<int:reservation_id>/review", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager", "staff")
def review_reservation(reservation_id):
    """
    Approve or reject a reservation request.
    Body: { "action": "approve" | "reject", "admin_note": "..." }
    """
    reviewer_id = get_jwt_identity()
    res = RoomReservation.query.get_or_404(reservation_id)

    if res.status != "pending":
        return error_response("Seules les réservations 'pending' peuvent être examinées.", 400)

    data = request.get_json(silent=True) or {}
    action = data.get("action")

    if action not in ("approve", "reject"):
        return error_response("Action invalide. Choisissez 'approve' ou 'reject'.", 422)

    # On approve, re-check overlap (another request might have been approved meanwhile)
    if action == "approve":
        if _check_overlap(res.classroom_id, res.start_datetime, res.end_datetime, exclude_id=res.id):
            return error_response(
                "Un conflit de réservation a été détecté. Impossible d'approuver.", 409
            )

    try:
        res.status = "approved" if action == "approve" else "rejected"
        res.admin_note = data.get("admin_note", "")
        res.reviewed_by = reviewer_id
        res.reviewed_at = datetime.utcnow()
        res.updated_at = datetime.utcnow()

        # Notification to the requester
        notif_type = "reservation_confirmed" if action == "approve" else "reservation_rejected"
        classroom = Classroom.query.get(res.classroom_id)
        action_label = "approuvée" if action == "approve" else "refusée"
        notif = Notification(
            user_id=res.user_id,
            title=f"Réservation de salle {action_label}",
            message=(
                f"Votre demande de réservation de la salle "
                f"{classroom.name if classroom else res.classroom_id} "
                f"({res.start_datetime.strftime('%d/%m/%Y %H:%M')} – "
                f"{res.end_datetime.strftime('%H:%M')}) a été {action_label}."
                + (f" Note: {res.admin_note}" if res.admin_note else "")
            ),
            notification_type=notif_type,
            related_id=res.id,
            related_type="room_reservation",
        )
        db.session.add(notif)
        db.session.commit()

        return success_response(
            data=res.to_dict(),
            message=f"Réservation {action_label}.",
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY CHECK
# ══════════════════════════════════════════════════════════════════════════════

@reservations_bp.route("/availability", methods=["GET"])
@jwt_required()
def check_availability():
    """
    Check room availability for a time window.
    Query params: classroom_id, start_datetime, end_datetime
    """
    classroom_id = request.args.get("classroom_id", type=int)
    start_str = request.args.get("start_datetime")
    end_str = request.args.get("end_datetime")

    if not all([classroom_id, start_str, end_str]):
        return error_response(
            "Paramètres requis: classroom_id, start_datetime, end_datetime.", 422
        )

    try:
        start_dt = datetime.fromisoformat(start_str)
        end_dt = datetime.fromisoformat(end_str)
    except ValueError:
        return error_response("Format de date invalide.", 422)

    classroom = Classroom.query.get_or_404(classroom_id)
    overlap = _check_overlap(classroom_id, start_dt, end_dt)

    return success_response(
        data={
            "classroom_id": classroom_id,
            "classroom_name": classroom.name,
            "start_datetime": start_str,
            "end_datetime": end_str,
            "is_available": not overlap,
        },
        message="Disponibilité vérifiée.",
    )


# ══════════════════════════════════════════════════════════════════════════════
# CLASSROOM SCHEDULE VIEW (all reservations for a given room)
# ══════════════════════════════════════════════════════════════════════════════

@reservations_bp.route("/classroom/<int:classroom_id>/schedule", methods=["GET"])
@jwt_required()
def classroom_schedule(classroom_id):
    """
    Return approved reservations for a classroom on a given date range.
    Query params: from_date, to_date (YYYY-MM-DD)
    """
    from_str = request.args.get("from_date")
    to_str = request.args.get("to_date")

    q = RoomReservation.query.filter(
        RoomReservation.classroom_id == classroom_id,
        RoomReservation.status == "approved",
    )

    if from_str:
        try:
            from_dt = datetime.fromisoformat(from_str)
            q = q.filter(RoomReservation.end_datetime >= from_dt)
        except ValueError:
            pass

    if to_str:
        try:
            to_dt = datetime.fromisoformat(to_str)
            q = q.filter(RoomReservation.start_datetime <= to_dt)
        except ValueError:
            pass

    reservations = q.order_by(RoomReservation.start_datetime.asc()).all()
    return success_response(
        data=[r.to_dict() for r in reservations],
        message="Planning de la salle récupéré.",
    )
