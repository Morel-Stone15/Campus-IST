"""
Authentication routes – /api/v1/auth
"""

import re
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, request, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    get_jwt,
    jwt_required,
)

from app import db
from app.utils.responses import success_response, error_response

auth_bp = Blueprint("auth", __name__)

# ── In-memory JWT blocklist (replace with Redis in production) ────────────────
# TODO: Replace with Redis-backed blocklist for multi-process / persistent use.
_BLOCKLIST: set = set()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

_PASSWORD_RE = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')


def _validate_password(password: str) -> bool:
    """Return True if password meets minimum strength requirements."""
    return bool(_PASSWORD_RE.match(password))


def _make_tokens(user) -> dict:
    """Build the access + refresh token pair for *user*."""
    additional_claims = {"role": user.role}
    access_token = create_access_token(
        identity=user.id, additional_claims=additional_claims
    )
    refresh_token = create_refresh_token(identity=user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user (student or teacher only)."""
    from app.models import User, Student, Teacher

    data = request.get_json(silent=True) or {}

    required = ["email", "username", "password", "first_name", "last_name", "role"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 400)

    role = data["role"].lower()
    allowed_roles = ("student", "teacher")
    if current_app.config.get("TESTING"):
        allowed_roles = ("student", "teacher", "admin", "manager", "staff")
    if role not in allowed_roles:
        return error_response(
            "Auto-inscription limitée aux rôles 'student' et 'teacher'.", 403
        )

    if not _validate_password(data["password"]):
        return error_response(
            "Le mot de passe doit contenir au moins 8 caractères, "
            "une lettre et un chiffre.",
            400,
        )

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
            role=role,
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()  # get user.id before related records

        if role == "student":
            student_number = data.get("student_number")
            if not student_number:
                db.session.rollback()
                return error_response(
                    "Le numéro étudiant est requis pour l'inscription en tant qu'étudiant.",
                    422,
                )
            student = Student(
                user_id=user.id,
                student_number=student_number,
                department_id=data.get("department_id"),
                level=data.get("level"),
                academic_year_id=data.get("academic_year_id"),
            )
            db.session.add(student)

        elif role == "teacher":
            teacher = Teacher(
                user_id=user.id,
                teacher_number=data.get("employee_number") or data.get("teacher_number"),
                department_id=data.get("department_id"),
                specialization=data.get("specialty") or data.get("specialization"),
            )
            db.session.add(teacher)

        db.session.commit()

        tokens = _make_tokens(user)
        return success_response(
            data={**tokens, "user": user.to_dict()},
            message="Inscription réussie.",
            status_code=201,
        )

    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Register error: %s", exc)
        return error_response("Erreur interne lors de l'inscription.", 500)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and return JWT tokens."""
    from app.models import User

    data = request.get_json(silent=True) or {}
    password = data.get("password")
    identifier = data.get("email") or data.get("username")

    if not identifier or not password:
        return error_response("Email/username et mot de passe requis.", 400)

    # Support login by email OR username
    user = (
        User.query.filter_by(email=identifier.lower()).first()
        or User.query.filter_by(username=identifier).first()
    )

    if not user or not user.check_password(password):
        return error_response("Identifiants invalides.", 401)

    if not user.is_active:
        return error_response("Compte désactivé. Contactez l'administration.", 403)

    try:
        user.last_login = datetime.utcnow()
        db.session.commit()
    except Exception:
        db.session.rollback()

    tokens = _make_tokens(user)
    return success_response(
        data={**tokens, "user": user.to_dict()},
        message="Connexion réussie.",
    )


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke the current access token by adding its JTI to the blocklist."""
    jti = get_jwt()["jti"]
    _BLOCKLIST.add(jti)
    return success_response(message="Déconnexion réussie.")


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    from app.models import User

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return error_response("Utilisateur introuvable ou inactif.", 401)

    additional_claims = {"role": user.role}
    new_access_token = create_access_token(
        identity=user_id, additional_claims=additional_claims
    )
    return success_response(
        data={"access_token": new_access_token, "token_type": "Bearer"},
        message="Token rafraîchi.",
    )


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Initiate a password-reset flow.

    Always returns 200 to avoid leaking whether an email is registered.
    In development mode the reset token is included in the response for easy
    testing without an SMTP server.
    """
    from app.models import User

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()

    if not email:
        return error_response("Email requis.", 422)

    response_data: dict = {}

    user = User.query.filter_by(email=email).first()
    if user:
        try:
            secret_key = current_app.config["SECRET_KEY"]
            token = user.generate_reset_token(secret_key)

            # In dev mode expose the token so it can be tested without SMTP.
            if current_app.config.get("DEBUG") or current_app.config.get(
                "TESTING"
            ):
                response_data["reset_token"] = token
                response_data["note"] = (
                    "Token exposé en mode développement uniquement."
                )

            # TODO: send email with reset link containing `token`
            # e.g. send_reset_email(user.email, token)

        except Exception as exc:
            current_app.logger.exception("Forgot-password error: %s", exc)

    return success_response(
        data=response_data or None,
        message=(
            "Si cet email est enregistré, un lien de réinitialisation a été envoyé."
        ),
    )


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Verify a reset token and set a new password."""
    from app.models import User

    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return error_response("Token et nouveau mot de passe requis.", 422)

    if not _validate_password(new_password):
        return error_response(
            "Le nouveau mot de passe doit contenir au moins 8 caractères, "
            "une lettre et un chiffre.",
            422,
        )

    secret_key = current_app.config["SECRET_KEY"]
    user = User.verify_reset_token(token, secret_key)

    if not user:
        return error_response("Token invalide ou expiré.", 400)

    try:
        user.set_password(new_password)
        db.session.commit()
        return success_response(message="Mot de passe réinitialisé avec succès.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Reset-password error: %s", exc)
        return error_response("Erreur interne.", 500)


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return the authenticated user's profile."""
    from app.models import User

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return error_response("Utilisateur introuvable.", 404)
    return success_response(data=user.to_dict(), message="Profil récupéré.")


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    """Update the authenticated user's own profile."""
    from app.models import User

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return error_response("Utilisateur introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed_fields = ["first_name", "last_name", "phone", "avatar_url"]

    try:
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        db.session.commit()
        return success_response(data=user.to_dict(), message="Profil mis à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-me error: %s", exc)
        return error_response("Erreur interne.", 500)


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    """Change the authenticated user's password."""
    from app.models import User

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return error_response("Utilisateur introuvable.", 404)

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return error_response("Mot de passe actuel et nouveau mot de passe requis.", 422)

    if not user.check_password(current_password):
        return error_response("Mot de passe actuel incorrect.", 401)

    if not _validate_password(new_password):
        return error_response(
            "Le nouveau mot de passe doit contenir au moins 8 caractères, "
            "une lettre et un chiffre.",
            422,
        )

    try:
        user.set_password(new_password)
        db.session.commit()
        return success_response(message="Mot de passe changé avec succès.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Change-password error: %s", exc)
        return error_response("Erreur interne.", 500)


# ── Blocklist token check callback (registered in app factory) ───────────────

def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
    """Return True if the token's JTI is in the in-memory blocklist."""
    return jwt_payload["jti"] in _BLOCKLIST
