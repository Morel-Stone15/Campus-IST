"""
Event management routes – /api/v1/events
"""

from datetime import datetime

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app import db
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

events_bp = Blueprint("events", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Events
# ─────────────────────────────────────────────────────────────────────────────

@events_bp.route("/", methods=["GET"])
@jwt_required()
def list_events():
    """List events (paginated) with optional filters."""
    from app.models import Event

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    event_type = request.args.get("event_type")
    status = request.args.get("status")
    upcoming = request.args.get("upcoming", "false").lower() == "true"

    query = Event.query

    if event_type:
        query = query.filter_by(event_type=event_type)
    if status:
        query = query.filter_by(status=status)
    if upcoming:
        query = query.filter(Event.start_datetime >= datetime.utcnow())

    query = query.order_by(Event.start_datetime.asc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return paginated_response(
        items=[e.to_dict() if hasattr(e, "to_dict") else {"id": e.id} for e in paginated.items],
        total=paginated.total,
        page=page,
        per_page=per_page,
        message="Événements récupérés.",
    )


@events_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin", "manager", "staff")
def create_event():
    """Create a new event."""
    from app.models import Event

    data = request.get_json(silent=True) or {}
    required = ["title", "start_datetime", "end_datetime"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 400)

    current_user_id = get_jwt_identity()

    try:
        start_dt = data["start_datetime"]
        if isinstance(start_dt, str):
            start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))

        end_dt = data["end_datetime"]
        if isinstance(end_dt, str):
            end_dt = datetime.fromisoformat(end_dt.replace("Z", "+00:00"))

        reg_dl = data.get("registration_deadline")
        if isinstance(reg_dl, str) and reg_dl:
            reg_dl = datetime.fromisoformat(reg_dl.replace("Z", "+00:00"))
        else:
            reg_dl = None

        event = Event(
            title=data["title"],
            description=data.get("description"),
            event_type=data.get("event_type", "internal"),
            start_datetime=start_dt,
            end_datetime=end_dt,
            location=data.get("location"),
            max_participants=data.get("max_participants"),
            registration_deadline=reg_dl,
            is_public=data.get("is_public", True),
            status=data.get("status", "published"),
            organizer_id=current_user_id,
        )
        db.session.add(event)
        db.session.commit()
        d = event.to_dict() if hasattr(event, "to_dict") else {"id": event.id}
        return success_response(data=d, message="Événement créé.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-event error: %s", exc)
        return error_response("Erreur interne.", 500)


@events_bp.route("/<event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id):
    """Event detail with registration count."""
    from app.models import Event, EventRegistration

    event = Event.query.get(event_id)
    if not event:
        return error_response("Événement introuvable.", 404)

    data = event.to_dict() if hasattr(event, "to_dict") else {"id": event.id}
    data["registration_count"] = EventRegistration.query.filter_by(
        event_id=event_id, status="registered"
    ).count()
    return success_response(data=data, message="Événement récupéré.")


@events_bp.route("/<event_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_event(event_id):
    """Update an event."""
    from app.models import Event

    event = Event.query.get(event_id)
    if not event:
        return error_response("Événement introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed = ["title", "description", "event_type", "start_datetime", "end_datetime",
               "location", "max_participants", "registration_deadline", "is_public", "status"]
    try:
        for field in allowed:
            if field in data:
                val = data[field]
                if field in ("start_datetime", "end_datetime", "registration_deadline") and isinstance(val, str):
                    val = datetime.fromisoformat(val.replace("Z", "+00:00")) if val else None
                setattr(event, field, val)
        db.session.commit()
        d = event.to_dict() if hasattr(event, "to_dict") else {"id": event.id}
        return success_response(data=d, message="Événement mis à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-event error: %s", exc)
        return error_response("Erreur interne.", 500)


@events_bp.route("/<event_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_event(event_id):
    """Cancel or delete an event."""
    from app.models import Event

    event = Event.query.get(event_id)
    if not event:
        return error_response("Événement introuvable.", 404)

    try:
        event.status = "cancelled"
        db.session.commit()
        return success_response(message="Événement annulé.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Delete-event error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Event Registrations
# ─────────────────────────────────────────────────────────────────────────────

@events_bp.route("/<event_id>/register", methods=["POST"])
@jwt_required()
def register_for_event(event_id):
    """Register the current user for an event."""
    from app.models import Event, EventRegistration

    current_user_id = get_jwt_identity()

    event = Event.query.get(event_id)
    if not event:
        return error_response("Événement introuvable.", 404)

    if event.status in ("cancelled", "completed"):
        return error_response("Les inscriptions pour cet événement sont fermées.", 400)

    # Deadline check
    if event.registration_deadline:
        deadline = (
            event.registration_deadline
            if isinstance(event.registration_deadline, datetime)
            else datetime.fromisoformat(str(event.registration_deadline))
        )
        if datetime.utcnow() > deadline:
            return error_response("La date limite d'inscription est dépassée.", 400)

    # Duplicate registration check
    existing = EventRegistration.query.filter_by(
        event_id=event_id, user_id=current_user_id
    ).first()
    if existing and existing.status == "registered":
        return error_response("Vous êtes déjà inscrit à cet événement.", 409)

    # Capacity check
    if event.max_participants:
        count = EventRegistration.query.filter_by(
            event_id=event_id, status="registered"
        ).count()
        if count >= event.max_participants:
            return error_response("L'événement est complet.", 409)

    try:
        if existing:
            existing.status = "registered"
            reg = existing
        else:
            reg = EventRegistration(
                event_id=event_id,
                user_id=current_user_id,
                status="registered",
            )
            db.session.add(reg)

        db.session.commit()
        d = reg.to_dict() if hasattr(reg, "to_dict") else {"id": reg.id}
        return success_response(data=d, message="Inscription confirmée.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Register-event error: %s", exc)
        return error_response("Erreur interne.", 500)


@events_bp.route("/<event_id>/register", methods=["DELETE"])
@jwt_required()
def cancel_event_registration(event_id):
    """Cancel the current user's registration for an event."""
    from app.models import EventRegistration

    current_user_id = get_jwt_identity()

    reg = EventRegistration.query.filter_by(
        event_id=event_id, user_id=current_user_id
    ).first()
    if not reg:
        return error_response("Inscription introuvable.", 404)

    try:
        reg.status = "cancelled"
        db.session.commit()
        return success_response(message="Inscription annulée.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Cancel-registration error: %s", exc)
        return error_response("Erreur interne.", 500)


@events_bp.route("/<event_id>/registrations", methods=["GET"])
@jwt_required()
@role_required("admin", "manager")
def list_event_registrations(event_id):
    """List all registrations for an event (admin / manager)."""
    from app.models import Event, EventRegistration

    event = Event.query.get(event_id)
    if not event:
        return error_response("Événement introuvable.", 404)

    registrations = EventRegistration.query.filter_by(event_id=event_id).all()
    data = []
    for r in registrations:
        d = r.to_dict() if hasattr(r, "to_dict") else {"id": r.id}
        d["user"] = r.user.to_dict() if r.user else None
        data.append(d)

    return success_response(data=data, message="Inscriptions récupérées.")


@events_bp.route("/my-events", methods=["GET"])
@jwt_required()
def my_events():
    """List events the current user is registered for."""
    from app.models import EventRegistration, Event

    current_user_id = get_jwt_identity()

    registrations = EventRegistration.query.filter_by(
        user_id=current_user_id, status="registered"
    ).all()

    events = []
    for reg in registrations:
        if reg.event:
            d = reg.event.to_dict() if hasattr(reg.event, "to_dict") else {"id": reg.event.id}
            d["registration_id"] = reg.id
            events.append(d)

    return success_response(data=events, message="Mes événements récupérés.")
