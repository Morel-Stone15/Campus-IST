"""
Document management routes – /api/v1/documents
"""

import os

from flask import Blueprint, request, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app import db
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required

documents_bp = Blueprint("documents", __name__)

ALLOWED_EXTENSIONS = {
    "pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "txt", "zip", "png", "jpg", "jpeg"
}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _documents_upload_path() -> str:
    base = current_app.config.get("UPLOAD_FOLDER", "app/uploads")
    path = os.path.join(base, "documents")
    os.makedirs(path, exist_ok=True)
    return path


# ─────────────────────────────────────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────────────────────────────────────

@documents_bp.route("/categories", methods=["GET"])
@jwt_required()
def list_categories():
    """List all document categories."""
    from app.models import DocumentCategory

    categories = DocumentCategory.query.order_by(DocumentCategory.name).all()
    return success_response(
        data=[c.to_dict() if hasattr(c, "to_dict") else {"id": c.id, "name": c.name}
              for c in categories],
        message="Catégories récupérées.",
    )


@documents_bp.route("/categories", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_category():
    """Create a document category."""
    from app.models import DocumentCategory

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error_response("Le nom de la catégorie est requis.", 422)

    try:
        cat = DocumentCategory(
            name=name,
            description=data.get("description"),
        )
        db.session.add(cat)
        db.session.commit()
        d = cat.to_dict() if hasattr(cat, "to_dict") else {"id": cat.id, "name": cat.name}
        return success_response(data=d, message="Catégorie créée.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-category error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Documents
# ─────────────────────────────────────────────────────────────────────────────

@documents_bp.route("/", methods=["GET"])
@jwt_required()
def list_documents():
    """List documents (paginated).

    - Admin/manager see all documents (public + private).
    - Other authenticated users see only public documents.
    """
    from app.models import Document

    claims = get_jwt()
    role = claims.get("role")

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    category_id = request.args.get("category_id")
    academic_year_id = request.args.get("academic_year_id")
    search = request.args.get("search", "").strip()

    query = Document.query

    if role not in ("admin", "manager"):
        query = query.filter_by(is_public=True)

    if category_id:
        query = query.filter_by(category_id=category_id)
    if academic_year_id:
        query = query.filter_by(academic_year_id=academic_year_id)
    if search:
        query = query.filter(Document.title.ilike(f"%{search}%"))

    query = query.order_by(Document.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return paginated_response(
        items=[d.to_dict() if hasattr(d, "to_dict") else {"id": d.id} for d in paginated.items],
        total=paginated.total,
        page=page,
        per_page=per_page,
        message="Documents récupérés.",
    )


@documents_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin", "manager", "staff", "teacher", "student")
def upload_document():
    """Upload a PDF document (multipart/form-data, max 16 MB)."""
    from app.models import Document
    from werkzeug.utils import secure_filename

    if "file" not in request.files:
        return error_response("Aucun fichier fourni.", 400)

    file = request.files["file"]
    if not file or file.filename == "":
        return error_response("Nom de fichier vide.", 422)

    if not _allowed_file(file.filename):
        return error_response("Seuls les fichiers PDF sont acceptés.", 415)

    # Size check (read into memory guard)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return error_response("Le fichier dépasse la taille maximale de 16 Mo.", 413)

    try:
        filename = secure_filename(file.filename)
        upload_dir = _documents_upload_path()
        # Avoid name collisions
        import uuid as _uuid
        unique_name = f"{_uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(upload_dir, unique_name)
        file.save(file_path)

        current_user_id = get_jwt_identity()
        cat_id = request.form.get("category_id")
        if cat_id:
            try:
                cat_id = int(cat_id)
                from app.models import DocumentCategory
                if not db.session.get(DocumentCategory, cat_id):
                    cat_id = None
            except (ValueError, TypeError):
                cat_id = None

        doc = Document(
            title=request.form.get("title", filename),
            description=request.form.get("description"),
            file_path=os.path.join("documents", unique_name),
            file_name=filename,
            file_type="application/pdf",
            file_size=size,
            category_id=cat_id,
            academic_year_id=request.form.get("academic_year_id"),
            is_public=request.form.get("is_public", "true").lower() == "true",
            uploaded_by=current_user_id,
        )
        db.session.add(doc)
        db.session.commit()
        d = doc.to_dict() if hasattr(doc, "to_dict") else {"id": doc.id}
        return success_response(data=d, message="Document téléversé.", status_code=201)

    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Upload-document error: %s", exc)
        return error_response("Erreur interne.", 500)


@documents_bp.route("/<doc_id>", methods=["GET"])
@jwt_required()
def get_document(doc_id):
    """Document detail (increments download_count)."""
    from app.models import Document

    claims = get_jwt()
    role = claims.get("role")

    doc = Document.query.get(doc_id)
    if not doc:
        return error_response("Document introuvable.", 404)

    if not doc.is_public and role not in ("admin", "manager"):
        return error_response("Accès refusé.", 403)

    try:
        doc.download_count = (doc.download_count or 0) + 1
        db.session.commit()
    except Exception:
        db.session.rollback()

    return success_response(
        data=doc.to_dict() if hasattr(doc, "to_dict") else {"id": doc.id},
        message="Document récupéré.",
    )


@documents_bp.route("/<doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):
    """Serve the document file."""
    from app.models import Document

    claims = get_jwt()
    role = claims.get("role")

    doc = Document.query.get(doc_id)
    if not doc:
        return error_response("Document introuvable.", 404)

    if not doc.is_public and role not in ("admin", "manager"):
        return error_response("Accès refusé.", 403)

    base = current_app.config.get("UPLOAD_FOLDER", "app/uploads")
    directory = os.path.join(base, "documents")
    filename = os.path.basename(doc.file_path)

    try:
        return send_from_directory(
            directory,
            filename,
            as_attachment=True,
            download_name=doc.file_name or (doc.title + ".pdf"),
        )
    except FileNotFoundError:
        return error_response("Fichier introuvable sur le serveur.", 404)


@documents_bp.route("/<doc_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_document(doc_id):
    """Update document metadata."""
    from app.models import Document

    doc = Document.query.get(doc_id)
    if not doc:
        return error_response("Document introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed = ["title", "description", "category_id", "is_public", "academic_year_id"]
    try:
        for field in allowed:
            if field in data:
                setattr(doc, field, data[field])
        db.session.commit()
        return success_response(
            data=doc.to_dict() if hasattr(doc, "to_dict") else {"id": doc.id},
            message="Document mis à jour.",
        )
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-document error: %s", exc)
        return error_response("Erreur interne.", 500)


@documents_bp.route("/<doc_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_document(doc_id):
    """Delete a document record and its file."""
    from app.models import Document

    doc = Document.query.get(doc_id)
    if not doc:
        return error_response("Document introuvable.", 404)

    try:
        # Remove file from disk
        base = current_app.config.get("UPLOAD_FOLDER", "app/uploads")
        file_path = os.path.join(base, doc.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)

        db.session.delete(doc)
        db.session.commit()
        return success_response(message="Document supprimé.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Delete-document error: %s", exc)
        return error_response("Erreur interne.", 500)
