"""
User management routes – /api/v1/users
"""

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app import db
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

users_bp = Blueprint("users", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# User CRUD
# ─────────────────────────────────────────────────────────────────────────────

@users_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_users():
    """List all users with pagination (admin only)."""
    from app.models import User

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    role_filter = request.args.get("role")
    is_active = request.args.get("is_active")

    query = User.query

    if role_filter:
        query = query.filter_by(role=role_filter)
    if is_active is not None:
        active_val = is_active.lower() == "true"
        query = query.filter_by(is_active=active_val)

    query = query.order_by(User.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return paginated_response(
        items=[u.to_dict() for u in paginated.items],
        total=paginated.total,
        page=page,
        per_page=per_page,
        message="Utilisateurs récupérés.",
    )


@users_bp.route("/<user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    """Get a user by ID (admin or the user themselves)."""
    from app.models import User

    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")

    if role != "admin" and current_user_id != user_id:
        return error_response("Accès refusé.", 403)

    user = User.query.get(user_id)
    if not user:
        return error_response("Utilisateur introuvable.", 404)

    return success_response(data=user.to_dict(), message="Utilisateur récupéré.")


@users_bp.route("/<user_id>", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_user(user_id):
    """Update a user record (admin only)."""
    from app.models import User

    user = User.query.get(user_id)
    if not user:
        return error_response("Utilisateur introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed = ["first_name", "last_name", "phone", "avatar_url", "is_active",
               "is_verified", "role"]

    try:
        for field in allowed:
            if field in data:
                setattr(user, field, data[field])
        db.session.commit()
        return success_response(data=user.to_dict(), message="Utilisateur mis à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-user error: %s", exc)
        return error_response("Erreur interne.", 500)


@users_bp.route("/<user_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    """Soft-delete a user (set is_active=False)."""
    from app.models import User

    user = User.query.get(user_id)
    if not user:
        return error_response("Utilisateur introuvable.", 404)

    try:
        user.is_active = False
        db.session.commit()
        return success_response(message="Compte utilisateur désactivé.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Delete-user error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Students
# ─────────────────────────────────────────────────────────────────────────────

@users_bp.route("/students", methods=["GET"])
@jwt_required()
@role_required("admin", "manager", "teacher")
def list_students():
    """List students with academic info (admin / manager / teacher)."""
    from app.models import Student

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    department_id = request.args.get("department_id")
    level = request.args.get("level")
    academic_year_id = request.args.get("academic_year_id")

    query = Student.query

    if department_id:
        query = query.filter_by(department_id=department_id)
    if level:
        query = query.filter_by(level=level)
    if academic_year_id:
        query = query.filter_by(academic_year_id=academic_year_id)

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for s in paginated.items:
        d = s.to_dict() if hasattr(s, "to_dict") else {"id": s.id}
        d["user"] = s.user.to_dict() if s.user else None
        items.append(d)

    return paginated_response(
        items=items,
        total=paginated.total,
        page=page,
        per_page=per_page,
        message="Étudiants récupérés.",
    )


@users_bp.route("/students/<student_id>", methods=["GET"])
@jwt_required()
def get_student(student_id):
    """Get a student's detail (admin / manager / teacher or the student themselves)."""
    from app.models import Student

    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")

    student = Student.query.get(student_id)
    if not student:
        return error_response("Étudiant introuvable.", 404)

    # Students can only view their own record
    if role == "student" and student.user_id != current_user_id:
        return error_response("Accès refusé.", 403)

    data = student.to_dict() if hasattr(student, "to_dict") else {"id": student.id}
    data["user"] = student.user.to_dict() if student.user else None
    return success_response(data=data, message="Étudiant récupéré.")


# ─────────────────────────────────────────────────────────────────────────────
# Teachers
# ─────────────────────────────────────────────────────────────────────────────

@users_bp.route("/teachers", methods=["GET"])
@jwt_required()
def list_teachers():
    """List all teachers (any authenticated user)."""
    from app.models import Teacher

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    department_id = request.args.get("department_id")

    query = Teacher.query
    if department_id:
        query = query.filter_by(department_id=department_id)

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for t in paginated.items:
        d = t.to_dict() if hasattr(t, "to_dict") else {"id": t.id}
        d["user"] = t.user.to_dict() if t.user else None
        items.append(d)

    return paginated_response(
        items=items,
        total=paginated.total,
        page=page,
        per_page=per_page,
        message="Enseignants récupérés.",
    )
