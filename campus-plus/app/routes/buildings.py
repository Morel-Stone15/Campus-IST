"""
Buildings / Maps routes – /api/v1/buildings and /api/v1/maps

Handles campus map data: buildings, locations, classrooms.
Compatible with OpenStreetMap.
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app import db
from app.models.building import Building, Location, Classroom
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

buildings_bp = Blueprint("buildings", __name__)


# ══════════════════════════════════════════════════════════════════════════════
# BUILDINGS
# ══════════════════════════════════════════════════════════════════════════════

@buildings_bp.route("", methods=["GET"])
@jwt_required()
def list_buildings():
    """Return all active buildings on campus."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    active_only = request.args.get("active_only", "true").lower() == "true"

    q = Building.query
    if active_only:
        q = q.filter(Building.is_active == True)
    q = q.order_by(Building.name.asc())
    return paginated_response(q, page, per_page, message="Bâtiments récupérés.")


@buildings_bp.route("/<int:building_id>", methods=["GET"])
@jwt_required()
def get_building(building_id):
    """Return a single building with its locations."""
    building = Building.query.get_or_404(building_id)
    data = building.to_dict()
    data["locations"] = [loc.to_dict() for loc in building.locations]
    return success_response(data=data, message="Bâtiment récupéré.")


@buildings_bp.route("", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_building():
    """Create a new building."""
    data = request.get_json(silent=True) or {}

    required = ["name", "code"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    if Building.query.filter_by(code=data["code"].upper()).first():
        return error_response("Ce code de bâtiment est déjà utilisé.", 409)

    try:
        building = Building(
            name=data["name"].strip(),
            code=data["code"].upper().strip(),
            description=data.get("description"),
            floors=data.get("floors"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            address=data.get("address"),
            image_url=data.get("image_url"),
            is_active=data.get("is_active", True),
        )
        db.session.add(building)
        db.session.commit()
        return success_response(
            data=building.to_dict(), message="Bâtiment créé.", status_code=201
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@buildings_bp.route("/<int:building_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_building(building_id):
    """Update an existing building."""
    building = Building.query.get_or_404(building_id)
    data = request.get_json(silent=True) or {}

    updatable = [
        "name", "description", "floors", "latitude", "longitude",
        "address", "image_url", "is_active",
    ]
    try:
        for field in updatable:
            if field in data:
                setattr(building, field, data[field])
        db.session.commit()
        return success_response(data=building.to_dict(), message="Bâtiment mis à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# LOCATIONS (sub-resource)
# ══════════════════════════════════════════════════════════════════════════════

@buildings_bp.route("/locations", methods=["GET"])
@jwt_required()
def list_locations():
    """Return all campus locations (filterable by type or building)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    location_type = request.args.get("type")
    building_id = request.args.get("building_id", type=int)
    search = request.args.get("search", "").strip()

    q = Location.query
    if location_type:
        q = q.filter(Location.location_type == location_type)
    if building_id:
        q = q.filter(Location.building_id == building_id)
    if search:
        q = q.filter(Location.name.ilike(f"%{search}%"))
    q = q.order_by(Location.name.asc())
    return paginated_response(q, page, per_page, message="Lieux récupérés.")


@buildings_bp.route("/locations/<int:location_id>", methods=["GET"])
@jwt_required()
def get_location(location_id):
    """Return a single location."""
    loc = Location.query.get_or_404(location_id)
    return success_response(data=loc.to_dict(), message="Lieu récupéré.")


@buildings_bp.route("/locations", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_location():
    """Create a new location entry."""
    data = request.get_json(silent=True) or {}

    required = ["name", "location_type"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    try:
        loc = Location(
            name=data["name"].strip(),
            description=data.get("description"),
            location_type=data["location_type"],
            building_id=data.get("building_id"),
            floor=data.get("floor"),
            room_number=data.get("room_number"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            is_accessible=data.get("is_accessible", False),
            image_url=data.get("image_url"),
            osm_node_id=data.get("osm_node_id"),
        )
        db.session.add(loc)
        db.session.commit()
        return success_response(
            data=loc.to_dict(), message="Lieu créé.", status_code=201
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@buildings_bp.route("/locations/<int:location_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_location(location_id):
    """Update an existing location."""
    loc = Location.query.get_or_404(location_id)
    data = request.get_json(silent=True) or {}

    updatable = [
        "name", "description", "location_type", "building_id", "floor",
        "room_number", "latitude", "longitude", "is_accessible",
        "image_url", "osm_node_id",
    ]
    try:
        for field in updatable:
            if field in data:
                setattr(loc, field, data[field])
        db.session.commit()
        return success_response(data=loc.to_dict(), message="Lieu mis à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# CLASSROOMS (sub-resource)
# ══════════════════════════════════════════════════════════════════════════════

@buildings_bp.route("/classrooms", methods=["GET"])
@jwt_required()
def list_classrooms():
    """Return all classrooms (filterable by type, availability, capacity)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    room_type = request.args.get("type")
    min_capacity = request.args.get("min_capacity", type=int)
    active_only = request.args.get("active_only", "true").lower() == "true"

    q = Classroom.query
    if room_type:
        q = q.filter(Classroom.room_type == room_type)
    if min_capacity:
        q = q.filter(Classroom.capacity >= min_capacity)
    if active_only:
        q = q.filter(Classroom.is_active == True)
    q = q.order_by(Classroom.code.asc())
    return paginated_response(q, page, per_page, message="Salles récupérées.")


@buildings_bp.route("/classrooms/<int:classroom_id>", methods=["GET"])
@jwt_required()
def get_classroom(classroom_id):
    """Return a single classroom."""
    classroom = Classroom.query.get_or_404(classroom_id)
    return success_response(data=classroom.to_dict(), message="Salle récupérée.")


@buildings_bp.route("/classrooms", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_classroom():
    """Create a new classroom."""
    data = request.get_json(silent=True) or {}

    required = ["name", "code"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    if Classroom.query.filter_by(code=data["code"].upper()).first():
        return error_response("Ce code de salle est déjà utilisé.", 409)

    try:
        classroom = Classroom(
            name=data["name"].strip(),
            code=data["code"].upper().strip(),
            location_id=data.get("location_id"),
            capacity=data.get("capacity"),
            room_type=data.get("room_type", "lecture_hall"),
            has_projector=data.get("has_projector", False),
            has_whiteboard=data.get("has_whiteboard", False),
            has_ac=data.get("has_ac", False),
            is_active=data.get("is_active", True),
        )
        db.session.add(classroom)
        db.session.commit()
        return success_response(
            data=classroom.to_dict(), message="Salle créée.", status_code=201
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@buildings_bp.route("/classrooms/<int:classroom_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_classroom(classroom_id):
    """Update an existing classroom."""
    classroom = Classroom.query.get_or_404(classroom_id)
    data = request.get_json(silent=True) or {}

    updatable = [
        "name", "location_id", "capacity", "room_type",
        "has_projector", "has_whiteboard", "has_ac", "is_active",
    ]
    try:
        for field in updatable:
            if field in data:
                setattr(classroom, field, data[field])
        db.session.commit()
        return success_response(data=classroom.to_dict(), message="Salle mise à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# MAP OVERVIEW – /api/v1/buildings/map
# ══════════════════════════════════════════════════════════════════════════════

@buildings_bp.route("/map", methods=["GET"])
@jwt_required()
def campus_map():
    """
    Return a GeoJSON-compatible overview of all campus locations for map display.
    Compatible with OpenStreetMap / Leaflet.
    """
    buildings = Building.query.filter_by(is_active=True).all()
    locations = Location.query.filter(
        Location.latitude.isnot(None), Location.longitude.isnot(None)
    ).all()

    features = []

    for b in buildings:
        if b.latitude and b.longitude:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [b.longitude, b.latitude],
                },
                "properties": {
                    "id": b.id,
                    "kind": "building",
                    "name": b.name,
                    "code": b.code,
                    "address": b.address,
                    "floors": b.floors,
                    "image_url": b.image_url,
                },
            })

    for loc in locations:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [loc.longitude, loc.latitude],
            },
            "properties": {
                "id": loc.id,
                "kind": loc.location_type,
                "name": loc.name,
                "description": loc.description,
                "building_id": loc.building_id,
                "floor": loc.floor,
                "room_number": loc.room_number,
                "is_accessible": loc.is_accessible,
                "osm_node_id": loc.osm_node_id,
                "image_url": loc.image_url,
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }
    return success_response(data=geojson, message="Carte du campus récupérée.")
