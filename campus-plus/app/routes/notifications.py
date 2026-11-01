"""
Notifications routes – /api/v1/notifications
Hymn routes         – /api/v1/notifications/hymn

Manages internal notifications and the IST campus hymn.
"""

import os

from flask import Blueprint, request, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app import db
from app.models.notification import Notification, HymnContent
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required
from app.utils.security import generate_secure_filename, allowed_file

notifications_bp = Blueprint("notifications", __name__)


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@notifications_bp.route("", methods=["GET"])
@jwt_required()
def list_notifications():
    """Return the current user's notifications (newest first)."""
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    unread_only = request.args.get("unread_only", "false").lower() == "true"

    q = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    q = q.order_by(Notification.created_at.desc())

    return paginated_response(q, page, per_page, message="Notifications récupérées.")


@notifications_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    """Return the count of unread notifications for the current user."""
    user_id = get_jwt_identity()
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return success_response(data={"count": count, "unread_count": count}, message="Comptage récupéré.")


@notifications_bp.route("/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(notification_id):
    """Mark a single notification as read."""
    user_id = get_jwt_identity()
    notif = Notification.query.get_or_404(notification_id)

    if notif.user_id != user_id:
        return error_response("Accès refusé.", 403)

    try:
        notif.is_read = True
        db.session.commit()
        return success_response(data=notif.to_dict(), message="Notification marquée comme lue.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@notifications_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_read():
    """Mark all of the current user's notifications as read."""
    user_id = get_jwt_identity()
    try:
        Notification.query.filter_by(user_id=user_id, is_read=False).update(
            {"is_read": True}
        )
        db.session.commit()
        return success_response(message="Toutes les notifications marquées comme lues.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


@notifications_bp.route("/<int:notification_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notification_id):
    """Delete a single notification (owner only)."""
    user_id = get_jwt_identity()
    notif = Notification.query.get_or_404(notification_id)

    if notif.user_id != user_id:
        return error_response("Accès refusé.", 403)

    try:
        db.session.delete(notif)
        db.session.commit()
        return success_response(message="Notification supprimée.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ── Admin: broadcast a notification to all users or a specific user ──────────

@notifications_bp.route("/broadcast", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def broadcast_notification():
    """
    Send an announcement notification to one or more users.
    Body: { "user_ids": [...] | "all": true, "title": "...", "message": "..." }
    """
    from app.models.user import User

    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    message = data.get("message", "").strip()
    send_to_all = data.get("all", False)
    user_ids = data.get("user_ids", [])

    if not title or not message:
        return error_response("Titre et message requis.", 422)

    if not send_to_all and not user_ids:
        return error_response("Précisez user_ids ou définissez all=true.", 422)

    try:
        if send_to_all:
            users = User.query.filter_by(is_active=True).all()
            targets = [u.id for u in users]
        else:
            targets = user_ids

        notifications = [
            Notification(
                user_id=uid,
                title=title,
                message=message,
                notification_type="admin_announcement",
            )
            for uid in targets
        ]
        db.session.bulk_save_objects(notifications)
        db.session.commit()

        return success_response(
            data={"sent_to": len(targets)},
            message=f"Annonce envoyée à {len(targets)} utilisateur(s).",
            status_code=201,
        )
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# HYMN – /api/v1/notifications/hymn
# ══════════════════════════════════════════════════════════════════════════════

@notifications_bp.route("/hymn", methods=["GET"])
@jwt_required()
def get_hymn():
    """Return hymn metadata and lyrics."""
    hymn = HymnContent.query.first()
    if not hymn:
        return error_response("L'hymne de l'IST n'a pas encore été configuré.", 404)
    return success_response(data=hymn.to_dict(), message="Hymne récupéré.")


@notifications_bp.route("/hymn/audio", methods=["GET"])
@jwt_required()
def stream_hymn_audio():
    """Stream or download the hymn audio file."""
    hymn = HymnContent.query.first()
    if not hymn or not hymn.audio_file_path:
        return error_response("Fichier audio introuvable.", 404)

    upload_folder = current_app.config.get("UPLOAD_FOLDER", "app/uploads")
    audio_dir = os.path.join(upload_folder, "audio")
    filename = os.path.basename(hymn.audio_file_path)

    download = request.args.get("download", "false").lower() == "true"
    if download and not hymn.is_downloadable:
        return error_response("Ce fichier audio n'est pas téléchargeable.", 403)

    as_attachment = download
    try:
        return send_from_directory(
            os.path.abspath(audio_dir),
            filename,
            as_attachment=as_attachment,
        )
    except FileNotFoundError:
        return error_response("Fichier audio introuvable sur le serveur.", 404)


@notifications_bp.route("/hymn", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_hymn():
    """
    Update hymn metadata (title, lyrics, is_downloadable).
    Accepts multipart/form-data to optionally upload a new audio file,
    OR application/json for metadata-only updates.
    """
    hymn = HymnContent.query.first()
    if not hymn:
        # Create the singleton row on first call
        hymn = HymnContent(title="Hymne de l'IST", id=1)
        db.session.add(hymn)

    admin_id = get_jwt_identity()
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "app/uploads")
    allowed_extensions = {"mp3", "wav", "ogg", "m4a"}

    # ── Handle multipart upload ──────────────────────────────────────────────
    if request.content_type and "multipart" in request.content_type:
        title = request.form.get("title")
        lyrics = request.form.get("lyrics")
        is_downloadable = request.form.get("is_downloadable")

        if title:
            hymn.title = title.strip()
        if lyrics is not None:
            hymn.lyrics = lyrics
        if is_downloadable is not None:
            hymn.is_downloadable = is_downloadable.lower() in ("true", "1", "yes")

        audio_file = request.files.get("audio_file")
        if audio_file and audio_file.filename:
            if not allowed_file(audio_file.filename, allowed_extensions):
                return error_response(
                    f"Format audio non supporté. Formats acceptés: {', '.join(allowed_extensions)}",
                    422,
                )
            audio_dir = os.path.join(upload_folder, "audio")
            os.makedirs(audio_dir, exist_ok=True)
            filename = generate_secure_filename(audio_file.filename)
            save_path = os.path.join(audio_dir, filename)
            audio_file.save(save_path)
            hymn.audio_file_path = os.path.join("audio", filename)
    else:
        # ── JSON-only metadata update ────────────────────────────────────────
        data = request.get_json(silent=True) or {}
        if "title" in data:
            hymn.title = data["title"].strip()
        if "lyrics" in data:
            hymn.lyrics = data["lyrics"]
        if "is_downloadable" in data:
            hymn.is_downloadable = bool(data["is_downloadable"])

    hymn.uploaded_by = admin_id

    try:
        db.session.commit()
        return success_response(data=hymn.to_dict(), message="Hymne mis à jour.")
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Erreur interne: {exc}", 500)
