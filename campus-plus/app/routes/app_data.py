"""Shared application data routes – /api/v1/app-data."""

from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.app_data import AppData
from app.utils.responses import error_response, success_response

app_data_bp = Blueprint("app_data", __name__)

SHARED_KEYS = {
    "announcements",
    "events",
    "courses",
    "exams",
    "documents",
    "programmes",
    "posts",
    "identity",
    "hymn",
}
EDITORS = {"admin", "manager", "staff"}


@app_data_bp.route("/", methods=["GET"])
@jwt_required()
def get_shared_data():
    """Return shared collections without exposing credentials or user records."""
    records = AppData.query.filter(AppData.key.in_(SHARED_KEYS)).all()
    return success_response(
        data={
            "initialized": bool(records),
            "collections": {
                row.key: row.payload for row in records if row.key in SHARED_KEYS
            },
            "updated_at": max(
                (row.updated_at.isoformat() for row in records), default=None
            ),
        },
        message="Données partagées récupérées.",
    )


@app_data_bp.route("/bootstrap", methods=["POST"])
@jwt_required()
def bootstrap_shared_data():
    """Initialize empty shared collections once, using the first administrator's data."""
    if get_jwt().get("role") != "admin":
        return error_response("Seul un administrateur peut initialiser les données.", 403)

    data = request.get_json(silent=True) or {}
    collections = data.get("collections")
    if not isinstance(collections, dict):
        return error_response("Les collections à initialiser sont requises.", 422)

    if AppData.query.filter(AppData.key.in_(SHARED_KEYS)).first():
        return error_response("Les données partagées sont déjà initialisées.", 409)

    invalid = [
        key for key, value in collections.items()
        if key not in SHARED_KEYS
        or not isinstance(value, (dict, list))
    ]
    if invalid:
        return error_response("Une ou plusieurs collections sont invalides.", 422)

    try:
        owner_id = get_jwt_identity()
        for key, value in collections.items():
            db.session.add(AppData(key=key, payload=value, updated_by=owner_id))
        db.session.commit()
        return success_response(
            data={"initialized": True, "collections": collections},
            message="Données initiales enregistrées.",
            status_code=201,
        )
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Shared data initialization error: %s", exc)
        return error_response("Erreur interne lors de l'initialisation.", 500)


@app_data_bp.route("/<string:key>", methods=["PUT"])
@jwt_required()
def update_shared_data(key):
    """Persist one shared collection after an authorized form submission."""
    role = get_jwt().get("role")
    if key not in SHARED_KEYS:
        return error_response("Collection inconnue.", 404)
    if role not in EDITORS and not (key == "posts" and role == "teacher"):
        return error_response("Vous n'êtes pas autorisé à modifier cette collection.", 403)

    payload = request.get_json(silent=True)
    if not isinstance(payload, (dict, list)) and not (key == "hymn" and payload is None):
        return error_response("Les données doivent être une liste ou un objet JSON.", 422)

    try:
        record = db.session.get(AppData, key)
        if record:
            record.payload = payload
            record.updated_by = get_jwt_identity()
        else:
            record = AppData(
                key=key,
                payload=payload,
                updated_by=get_jwt_identity(),
            )
            db.session.add(record)
        db.session.commit()
        return success_response(
            data=record.to_dict(),
            message="Données enregistrées.",
        )
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Shared data update error: %s", exc)
        return error_response("Erreur interne lors de l'enregistrement.", 500)
