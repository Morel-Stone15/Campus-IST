"""
Admin routes – /api/v1/admin

Centralised administration dashboard:
  - User management (list, activate, deactivate, role change, delete)
  - Academic management shortcuts
  - Reservation oversight
  - Audit log access
  - Statistics dashboard
  - Admin-created accounts (staff / manager / admin)
"""

from datetime import datetime, timedelta

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.reservation import LockerReservation, RoomReservation
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.event import Event
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required
from app.utils.security import log_admin_action

admin_bp = Blueprint("admin", __name__)


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD STATISTICS
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@role_required("admin", "manager")
def dashboard_stats():
    """Return high-level platform statistics for the admin dashboard."""
    total_users = User.query.count()
    total_students = Student.query.count()
    total_teachers = Teacher.query.count()
    active_users = User.query.filter_by(is_active=True).count()

    # Reservations
    pending_room_res = RoomReservation.query.filter_by(status="pending").count()
    active_locker_res = LockerReservation.query.filter_by(status="active").count()

    # Content
    total_documents = Document.query.count()
    total_events = Event.query.filter(
        Event.start_date >= datetime.utcnow()
    ).count()

    # Recent registrations (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()

    # Unread notifications (system-wide total)
    unread_notifications = Notification.query.filter_by(is_read=False).count()

    return success_response(
        data={
            "users": {
                "total": total_users,
                "active": active_users,
                "students": total_students,
                "teachers": total_teachers,
                "new_last_30_days": new_users_30d,
            },
            "reservations": {
                "pending_room_reservations": pending_room_res,
                "active_locker_reservations": active_locker_res,
            },
            "content": {
                "documents": total_documents,
                "upcoming_events": total_events,
            },
            "notifications": {
                "unread_total": unread_notifications,
            },
        },
        message="Statistiques récupérées.",
    )


# ══════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def list_users():
    """Return a paginated list of all users with optional filters."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    role = request.args.get("role")
    is_active = request.args.get("is_active")
    search = request.args.get("search", "").strip()

    q = User.query
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == (is_active.lower() == "true"))
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            db.or_(
                User.email.ilike(pattern),
                User.username.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
            )
        )
    q = q.order_by(User.created_at.desc())
    return paginated_response(q, page, per_page, message="Utilisateurs récupérés.")


@admin_bp.route("/users/<string:user_id>", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def get_user(user_id):
    """Return detailed user information."""
    user = User.query.get_or_404(user_id)
    data = user.to_dict()

    if user.student_profile:
        data["student_profile"] = user.student_profile.to_dict()
    if user.teacher_profile:
        data["teacher_profile"] = user.teacher_profile.to_dict()

    return success_response(data=data, message="Utilisateur récupéré.")


@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_user():
    """
    Create any user account (including staff, manager, admin).
    This endpoint is admin-only; regular registration is via /auth/register.
    """
    admin_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    required = ["email", "username", "password", "first_name", "last_name", "role"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    valid_roles = {"student", "teacher", "staff", "manager", "admin"}
    if data["role"] not in valid_roles:
        return error_response(f"Rôle invalide. Valeurs: {', '.join(sorted(valid_roles))}", 422)

    if User.query.filter_by(email=data["email"].lower()).first():
        return error_response("Cet email est déjà utilisé.", 409)
    if User.query.filter_by(username=data["username"]).first():
        return error_response("Ce nom d'utilisateur est déjà pris.", 409)

    try:
        user = User(
            email=data["email"].lower().strip(),
            username=data["username"].strip(),
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            phone=data.get("phone"),
            role=data["role"],
            is_active=data.get("is_active", True),
            is_verified=True,   # admin-created accounts are pre-verified
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()

        if data["role"] == "student" and data.get("student_number"):
            student = Student(
                user_id=user.id,
                student_number=data["student_number"],
                department_id=data.get("department_id"),
                level=data.get("level"),
                academic_year_id=data.get("academic_year_id"),
            )
            db.session.add(student)

        elif data["role"] == "teacher" and data.get("employee_number"):
            teacher = Teacher(
                user_id=user.id,
                teacher_number=data.get("employee_number") or data.get("teacher_number"),
                department_id=data.get("department_id"),
                specialization=data.get("specialty") or data.get("specialization"),
            )
            db.session.add(teacher)

        db.session.commit()

        log_admin_action(
            user_id=admin_id,
            action="create_user",
            entity_type="user",
            entity_id=user.id,
            new_vals={"email": user.email, "role": user.role},
        )

        return success_response(
            data=user.to_dict(), message="Compte créé avec succès.", status_code=201
        )

    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@admin_bp.route("/users/<string:user_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_user(user_id):
    """Update user profile or role."""
    admin_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    old_vals = {"role": user.role, "is_active": user.is_active}
    updatable = ["first_name", "last_name", "phone", "is_active", "is_verified"]

    # Only full admins can change roles
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    if claims.get("role") == "admin" and "role" in data:
        valid_roles = {"student", "teacher", "staff", "manager", "admin"}
        if data["role"] in valid_roles:
            user.role = data["role"]

    try:
        for field in updatable:
            if field in data:
                setattr(user, field, data[field])
        db.session.commit()

        log_admin_action(
            user_id=admin_id,
            action="update_user",
            entity_type="user",
            entity_id=user_id,
            old_vals=old_vals,
            new_vals={"role": user.role, "is_active": user.is_active},
        )

        return success_response(data=user.to_dict(), message="Utilisateur mis à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@admin_bp.route("/users/<string:user_id>/toggle-active", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def toggle_user_active(user_id):
    """Activate or deactivate a user account."""
    admin_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)

    # Prevent self-deactivation
    if user_id == admin_id:
        return error_response("Vous ne pouvez pas désactiver votre propre compte.", 400)

    try:
        old_status = user.is_active
        user.is_active = not user.is_active
        db.session.commit()

        action = "activated" if user.is_active else "deactivated"
        log_admin_action(
            user_id=admin_id,
            action=f"user_{action}",
            entity_type="user",
            entity_id=user_id,
            old_vals={"is_active": old_status},
            new_vals={"is_active": user.is_active},
        )

        status_label = "activé" if user.is_active else "désactivé"
        return success_response(
            data={"is_active": user.is_active},
            message=f"Compte {status_label}.",
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@admin_bp.route("/users/<string:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    """Permanently delete a user account (admin only)."""
    admin_id = get_jwt_identity()
    if user_id == admin_id:
        return error_response("Vous ne pouvez pas supprimer votre propre compte.", 400)

    user = User.query.get_or_404(user_id)
    try:
        log_admin_action(
            user_id=admin_id,
            action="delete_user",
            entity_type="user",
            entity_id=user_id,
            old_vals={"email": user.email, "role": user.role},
        )
        db.session.delete(user)
        db.session.commit()
        return success_response(message="Utilisateur supprimé.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN PASSWORD RESET
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/users/<string:user_id>/reset-password", methods=["PUT"])
@jwt_required()
@role_required("admin")
def admin_reset_password(user_id):
    """Force-set a new password for any user (admin only)."""
    admin_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}
    new_password = data.get("new_password")

    if not new_password or len(new_password) < 8:
        return error_response("Le nouveau mot de passe doit faire au moins 8 caractères.", 422)

    try:
        user.set_password(new_password)
        db.session.commit()
        log_admin_action(
            user_id=admin_id,
            action="admin_reset_password",
            entity_type="user",
            entity_id=user_id,
        )
        return success_response(message="Mot de passe réinitialisé.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_audit_logs():
    """Return admin audit logs with optional filters."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 30, type=int), 100)
    action = request.args.get("action")
    entity_type = request.args.get("entity_type")
    user_id_filter = request.args.get("user_id")

    q = AuditLog.query
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id_filter:
        q = q.filter(AuditLog.user_id == user_id_filter)

    q = q.order_by(AuditLog.created_at.desc())
    return paginated_response(q, page, per_page, message="Journal d'audit récupéré.")


# ══════════════════════════════════════════════════════════════════════════════
# ROOM RESERVATIONS OVERSIGHT
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/reservations/rooms", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def admin_room_reservations():
    """List all room reservations with optional status filter."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")

    q = RoomReservation.query
    if status:
        q = q.filter(RoomReservation.status == status)
    q = q.order_by(RoomReservation.created_at.desc())
    return paginated_response(q, page, per_page, message="Réservations de salles récupérées.")


@admin_bp.route("/reservations/lockers", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def admin_locker_reservations():
    """List all locker reservations."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")

    q = LockerReservation.query
    if status:
        q = q.filter(LockerReservation.status == status)
    q = q.order_by(LockerReservation.created_at.desc())
    return paginated_response(q, page, per_page, message="Réservations de casiers récupérées.")


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS OVERSIGHT
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/documents", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def admin_list_documents():
    """List all documents (admin view)."""
    from app.models.document import Document

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    category_id = request.args.get("category_id", type=int)
    search = request.args.get("search", "").strip()

    q = Document.query
    if category_id:
        q = q.filter(Document.category_id == category_id)
    if search:
        q = q.filter(Document.title.ilike(f"%{search}%"))
    q = q.order_by(Document.created_at.desc())

    return paginated_response(q, page, per_page, message="Documents récupérés.")


# ══════════════════════════════════════════════════════════════════════════════
# EVENTS OVERSIGHT
# ══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/events", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "staff")
def admin_list_events():
    """List all events (admin view)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status = request.args.get("status")

    q = Event.query
    if status:
        q = q.filter(Event.status == status)
    q = q.order_by(Event.start_date.desc())

    return paginated_response(q, page, per_page, message="Événements récupérés.")


@admin_bp.route("/events/<int:event_id>/publish", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def publish_event(event_id):
    """Publish or unpublish an event."""
    event = Event.query.get_or_404(event_id)
    data = request.get_json(silent=True) or {}
    publish = data.get("publish", True)

    try:
        event.status = "published" if publish else "draft"
        db.session.commit()
        action_label = "publié" if publish else "dépublié"
        return success_response(
            data=event.to_dict(), message=f"Événement {action_label}."
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)
