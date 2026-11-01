"""
Services routes – /api/v1/services

Manages campus services: restaurants, playgrounds, library, infirmary, etc.
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app import db
from app.models.service import Service
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

services_bp = Blueprint("services", __name__)

# Valid service types (must match the SQLAlchemy Enum in the model)
VALID_SERVICE_TYPES = {
    "restaurant", "playground", "classroom",
    "library", "infirmary", "administrative", "locker_area",
}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/services
# ─────────────────────────────────────────────────────────────────────────────

@services_bp.route("", methods=["GET"])
@jwt_required()
def list_services():
    """Return a paginated list of campus services, filterable by type."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    service_type = request.args.get("type")
    active_only = request.args.get("active_only", "true").lower() == "true"
    search = request.args.get("search", "").strip()

    q = Service.query
    if active_only:
        q = q.filter(Service.is_active == True)
    if service_type:
        q = q.filter(Service.service_type == service_type)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            db.or_(Service.name.ilike(pattern), Service.description.ilike(pattern))
        )

    q = q.order_by(Service.name.asc())
    return paginated_response(q, page, per_page, message="Services récupérés.")


@services_bp.route("/<int:service_id>", methods=["GET"])
@jwt_required()
def get_service(service_id):
    """Return a single service by ID."""
    service = Service.query.get_or_404(service_id)
    return success_response(data=service.to_dict(), message="Service récupéré.")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/services  – admin/manager only
# ─────────────────────────────────────────────────────────────────────────────

@services_bp.route("", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_service():
    """Create a new campus service."""
    data = request.get_json(silent=True) or {}

    required = ["name", "service_type"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    if data["service_type"] not in VALID_SERVICE_TYPES:
        return error_response(
            f"Type invalide. Valeurs possibles: {', '.join(sorted(VALID_SERVICE_TYPES))}",
            422,
        )

    try:
        service = Service(
            name=data["name"].strip(),
            service_type=data["service_type"],
            description=data.get("description"),
            location_id=data.get("location_id"),
            opening_hours=data.get("opening_hours"),   # JSON dict
            capacity=data.get("capacity"),
            contact_phone=data.get("contact_phone"),
            contact_email=data.get("contact_email"),
            image_url=data.get("image_url"),
            is_active=data.get("is_active", True),
        )
        db.session.add(service)
        db.session.commit()
        return success_response(
            data=service.to_dict(), message="Service créé.", status_code=201
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/v1/services/<id>  – admin/manager only
# ─────────────────────────────────────────────────────────────────────────────

@services_bp.route("/<int:service_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_service(service_id):
    """Update an existing service."""
    service = Service.query.get_or_404(service_id)
    data = request.get_json(silent=True) or {}

    updatable = [
        "name", "description", "location_id", "opening_hours",
        "capacity", "contact_phone", "contact_email",
        "image_url", "is_active", "service_type",
    ]
    try:
        for field in updatable:
            if field in data:
                setattr(service, field, data[field])
        db.session.commit()
        return success_response(data=service.to_dict(), message="Service mis à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/v1/services/<id>  – admin only
# ─────────────────────────────────────────────────────────────────────────────

@services_bp.route("/<int:service_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_service(service_id):
    """Soft-delete a service by setting is_active = False."""
    service = Service.query.get_or_404(service_id)
    try:
        service.is_active = False
        db.session.commit()
        return success_response(message="Service désactivé.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)
