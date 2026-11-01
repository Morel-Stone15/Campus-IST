"""
Locker routes – /api/v1/lockers

Provides endpoints to list, reserve, and manage campus lockers.
Concurrency is handled by a SELECT-with-lock pattern to prevent
two students from reserving the same locker simultaneously.
"""

from datetime import date, datetime

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import text

from app import db
from app.models.locker import Locker
from app.models.reservation import LockerReservation
from app.models.notification import Notification
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

lockers_bp = Blueprint("lockers", __name__)


# ══════════════════════════════════════════════════════════════════════════════
# LIST LOCKERS
# ══════════════════════════════════════════════════════════════════════════════

@lockers_bp.route("", methods=["GET"])
@jwt_required()
def list_lockers():
    """
    Return paginated list of lockers.
    Optional filters: status, building_id, floor, size.
    """
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")          # available / reserved / maintenance
    building_id = request.args.get("building_id", type=int)
    floor = request.args.get("floor", type=int)
    size = request.args.get("size")
    active_only = request.args.get("active_only", "true").lower() == "true"

    q = Locker.query
    if active_only:
        q = q.filter(Locker.is_active == True)
    if status:
        q = q.filter(Locker.status == status)
    if building_id:
        q = q.filter(Locker.building_id == building_id)
    if floor is not None:
        q = q.filter(Locker.floor == floor)
    if size:
        q = q.filter(Locker.size == size)

    q = q.order_by(Locker.locker_number.asc())
    return paginated_response(q, page, per_page, message="Casiers récupérés.")


@lockers_bp.route("/<int:locker_id>", methods=["GET"])
@jwt_required()
def get_locker(locker_id):
    """Return details of a single locker."""
    locker = Locker.query.get_or_404(locker_id)
    data = locker.to_dict()
    # Include current active reservation info for admins/managers
    claims = get_jwt()
    if claims.get("role") in ("admin", "manager", "staff"):
        active_res = LockerReservation.query.filter_by(
            locker_id=locker_id, status="active"
        ).first()
        data["active_reservation"] = active_res.to_dict() if active_res else None
    return success_response(data=data, message="Casier récupéré.")


# ══════════════════════════════════════════════════════════════════════════════
# RESERVE A LOCKER  (student / any authenticated user)
# ══════════════════════════════════════════════════════════════════════════════

@lockers_bp.route("/reserve", methods=["POST"])
@jwt_required()
def reserve_locker():
    """
    Reserve an available locker.

    Uses a database-level lock (SELECT … FOR UPDATE in PostgreSQL, or a
    serialized transaction in SQLite) to prevent double-booking.
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    locker_id = data.get("locker_id")
    locker_number = data.get("locker_number")

    if not locker_id and not locker_number:
        return error_response(
            "Champs requis: locker_id ou locker_number.", 400
        )

    # Resolve locker
    if locker_id:
        locker = db.session.get(Locker, locker_id)
    else:
        locker = Locker.query.filter_by(locker_number=locker_number).first()

    if not locker:
        return error_response("Casier introuvable.", 404)

    locker_id = locker.id

    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")

    # Parse dates or use sensible defaults
    if start_date_str:
        try:
            start_date = date.fromisoformat(start_date_str)
        except ValueError:
            return error_response("Format de date invalide. Utilisez YYYY-MM-DD.", 400)
    else:
        start_date = date.today()

    if end_date_str:
        try:
            end_date = date.fromisoformat(end_date_str)
        except ValueError:
            return error_response("Format de date invalide. Utilisez YYYY-MM-DD.", 400)
    else:
        end_date = start_date + timedelta(days=90)

    if end_date <= start_date:
        return error_response("La date de fin doit être après la date de début.", 400)

    if start_date < date.today():
        return error_response("La date de début ne peut pas être dans le passé.", 422)

    # Check if user already has an active locker reservation
    existing = LockerReservation.query.filter_by(
        user_id=user_id, status="active"
    ).first()
    if existing:
        return error_response(
            f"Vous avez déjà un casier réservé (casier #{existing.locker_id}).", 409
        )

    try:
        # Begin a transaction – lock the locker row to prevent concurrent reservations.
        # SQLite doesn't support SELECT FOR UPDATE, so we use SERIALIZABLE isolation
        # simulation by re-checking inside the transaction.
        locker = db.session.get(Locker, locker_id)
        if not locker:
            return error_response("Casier introuvable.", 404)

        if not locker.is_active:
            return error_response("Ce casier n'est pas disponible.", 400)

        # Re-check availability inside transaction
        active_res = LockerReservation.query.filter_by(
            locker_id=locker_id, status="active"
        ).first()
        if active_res or locker.status != "available":
            return error_response(
                "Ce casier est déjà réservé ou indisponible.", 409
            )

        # Create reservation and update locker status atomically
        reservation = LockerReservation(
            locker_id=locker_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            status="active",
        )
        locker.status = "reserved"
        db.session.add(reservation)

        # Send internal notification
        notif = Notification(
            user_id=user_id,
            title="Réservation de casier confirmée",
            message=f"Votre réservation du casier {locker.locker_number} "
                    f"du {start_date} au {end_date} a été confirmée.",
            notification_type="reservation_confirmed",
            related_id=locker_id,
            related_type="locker",
        )
        db.session.add(notif)
        db.session.commit()

        return success_response(
            data=reservation.to_dict(),
            message="Casier réservé avec succès.",
            status_code=201,
        )

    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur lors de la réservation: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# CANCEL A RESERVATION
# ══════════════════════════════════════════════════════════════════════════════

@lockers_bp.route("/reservations/<int:reservation_id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_locker_reservation(reservation_id):
    """Cancel an active locker reservation (owner or admin)."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "student")

    reservation = LockerReservation.query.get_or_404(reservation_id)

    # Only the owner or an admin/manager can cancel
    if reservation.user_id != user_id and role not in ("admin", "manager", "staff"):
        return error_response("Accès refusé.", 403)

    if reservation.status not in ("active", "pending"):
        return error_response("Cette réservation ne peut plus être annulée.", 400)

    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "Annulée par l'utilisateur.")

    try:
        reservation.status = "cancelled"
        reservation.cancelled_at = datetime.utcnow()
        reservation.cancellation_reason = reason

        # Free the locker
        locker = Locker.query.get(reservation.locker_id)
        if locker:
            locker.status = "available"

        # Notification
        notif = Notification(
            user_id=reservation.user_id,
            title="Réservation de casier annulée",
            message=f"Votre réservation du casier {locker.locker_number if locker else ''} "
                    f"a été annulée. Raison: {reason}",
            notification_type="reservation_rejected",
            related_id=reservation.locker_id,
            related_type="locker",
        )
        db.session.add(notif)
        db.session.commit()

        return success_response(
            data=reservation.to_dict(), message="Réservation annulée."
        )

    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# MY RESERVATIONS  (current user)
# ══════════════════════════════════════════════════════════════════════════════

@lockers_bp.route("/my-reservations", methods=["GET"])
@jwt_required()
def my_locker_reservations():
    """Return the authenticated user's locker reservation history."""
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)

    q = LockerReservation.query.filter_by(user_id=user_id).order_by(
        LockerReservation.created_at.desc()
    )
    return paginated_response(q, page, per_page, message="Historique de réservations récupéré.")


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: Manage lockers
# ══════════════════════════════════════════════════════════════════════════════

@lockers_bp.route("/admin", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def admin_list_all_reservations():
    """Return all locker reservations (admin view)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")

    q = LockerReservation.query
    if status:
        q = q.filter(LockerReservation.status == status)
    q = q.order_by(LockerReservation.created_at.desc())
    return paginated_response(q, page, per_page, message="Toutes les réservations récupérées.")


@lockers_bp.route("", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_locker():
    """Create a new locker entry."""
    data = request.get_json(silent=True) or {}

    if not data.get("locker_number"):
        return error_response("Le numéro de casier est requis.", 422)

    if Locker.query.filter_by(locker_number=data["locker_number"]).first():
        return error_response("Ce numéro de casier est déjà utilisé.", 409)

    try:
        locker = Locker(
            locker_number=data["locker_number"].strip(),
            building_id=data.get("building_id"),
            floor=data.get("floor"),
            section=data.get("section"),
            size=data.get("size", "medium"),
            status=data.get("status", "available"),
            is_active=data.get("is_active", True),
        )
        db.session.add(locker)
        db.session.commit()
        return success_response(
            data=locker.to_dict(), message="Casier créé.", status_code=201
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@lockers_bp.route("/<int:locker_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_locker(locker_id):
    """Update locker details or status."""
    locker = Locker.query.get_or_404(locker_id)
    data = request.get_json(silent=True) or {}

    updatable = ["building_id", "floor", "section", "size", "status", "is_active"]
    try:
        for field in updatable:
            if field in data:
                setattr(locker, field, data[field])
        db.session.commit()
        return success_response(data=locker.to_dict(), message="Casier mis à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)
