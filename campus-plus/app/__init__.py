"""
Flask application factory.
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# ── Extension instances (imported by models and other modules) ───────────────
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_name: str = "default") -> Flask:
    """Application factory.

    Args:
        config_name: One of 'development', 'production', 'testing', 'default'.

    Returns:
        Configured Flask application instance.
    """
    from config import config as config_map  # root-level config.py

    app = Flask(__name__)
    app.config.from_object(config_map[config_name])
    app.url_map.strict_slashes = False

    # ── Initialise extensions ────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    # ── Register models (ensures they're known to SQLAlchemy) ────────────────
    with app.app_context():
        from app.models import (  # noqa: F401
            User, Student, Teacher,
            Department, AcademicYear, Course,
            Schedule, Document, DocumentCategory,
            Event, EventRegistration,
            Service, Building, Location, Classroom,
            Locker, LockerReservation, RoomReservation,
            Notification, HymnContent, AuditLog, AppData,
        )

    # ── Register blueprints ───────────────────────────────────────────────────
    _register_blueprints(app)

    # ── JWT error handlers ────────────────────────────────────────────────────
    _register_jwt_handlers(jwt)

    # ── Global HTTP error handlers ────────────────────────────────────────────
    _register_error_handlers(app)

    # ── Health-check route ────────────────────────────────────────────────────
    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "campus-plus-api"}), 200

    # ── Frontend static files serving ─────────────────────────────────────────
    # Allows opening the complete frontend and backend on a single server URL
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/") or path == "health":
            return jsonify({"success": False, "message": "Resource not found"}), 404
        target_file = os.path.join(frontend_dir, path)
        if path and os.path.exists(target_file) and not os.path.isdir(target_file):
            return send_from_directory(frontend_dir, path)
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return send_from_directory(frontend_dir, "index.html")
        return jsonify({"status": "ok", "service": "campus-plus-api"}), 200

    return app


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _register_blueprints(app: Flask) -> None:
    """Import and register all route blueprints."""
    # Blueprints are registered lazily so that individual blueprint files
    # can be created incrementally without breaking the factory.
    try:
        from app.routes.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    except ImportError:
        pass

    try:
        from app.routes.users import users_bp
        app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    except ImportError:
        pass

    try:
        from app.routes.academics import academics_bp
        app.register_blueprint(academics_bp, url_prefix="/api/v1/academics")
    except ImportError:
        pass

    try:
        from app.routes.documents import documents_bp
        app.register_blueprint(documents_bp, url_prefix="/api/v1/documents")
    except ImportError:
        pass

    try:
        from app.routes.events import events_bp
        app.register_blueprint(events_bp, url_prefix="/api/v1/events")
    except ImportError:
        pass

    try:
        from app.routes.services import services_bp
        app.register_blueprint(services_bp, url_prefix="/api/v1/services")
    except ImportError:
        pass

    try:
        from app.routes.buildings import buildings_bp
        app.register_blueprint(buildings_bp, url_prefix="/api/v1/buildings")
        from flask import Blueprint
        # Register alias for maps
        maps_bp = Blueprint("maps_alias", __name__)
        @maps_bp.route("/locations", methods=["GET"])
        def maps_locations():
            from app.routes.buildings import list_locations
            return list_locations()
        app.register_blueprint(maps_bp, url_prefix="/api/v1/maps")
    except ImportError:
        pass

    try:
        from app.routes.lockers import lockers_bp
        app.register_blueprint(lockers_bp, url_prefix="/api/v1/lockers")
    except ImportError:
        pass

    try:
        from app.routes.reservations import reservations_bp
        app.register_blueprint(reservations_bp, url_prefix="/api/v1/reservations")
    except ImportError:
        pass

    try:
        from app.routes.notifications import notifications_bp
        app.register_blueprint(notifications_bp, url_prefix="/api/v1/notifications")
    except ImportError:
        pass

    try:
        from app.routes.admin import admin_bp
        app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    except ImportError:
        pass

    try:
        from app.routes.app_data import app_data_bp
        app.register_blueprint(app_data_bp, url_prefix="/api/v1/app-data")
    except ImportError:
        pass


def _register_jwt_handlers(jwt_manager: JWTManager) -> None:
    """Attach JWT error callbacks."""

    @jwt_manager.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({"success": False, "message": f"Invalid token: {reason}"}), 422

    @jwt_manager.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"success": False, "message": "Token has expired"}), 401

    @jwt_manager.unauthorized_loader
    def missing_token_callback(reason):
        return jsonify({"success": False, "message": f"Authorization required: {reason}"}), 401

    @jwt_manager.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"success": False, "message": "Token has been revoked"}), 401


def _register_error_handlers(app: Flask) -> None:
    """Attach global HTTP error handlers."""

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "message": "Bad request", "error": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "message": "Method not allowed"}), 405

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({"success": False, "message": "File too large"}), 413

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({"success": False, "message": "Internal server error"}), 500
