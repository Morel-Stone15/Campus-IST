"""
Document and DocumentCategory models.
"""

from datetime import datetime

from app import db


class DocumentCategory(db.Model):
    __tablename__ = "document_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(100), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    documents = db.relationship("Document", back_populates="category")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
        }

    def __repr__(self) -> str:
        return f"<DocumentCategory {self.name}>"


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # ── File metadata ─────────────────────────────────────────────────────────
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=True)  # bytes
    file_type = db.Column(db.String(50), nullable=True)  # MIME type

    # ── Classification ────────────────────────────────────────────────────────
    category_id = db.Column(
        db.Integer, db.ForeignKey("document_categories.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_by = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    is_public = db.Column(db.Boolean, nullable=False, default=True)
    download_count = db.Column(db.Integer, nullable=False, default=0)
    version = db.Column(db.Integer, nullable=False, default=1)
    academic_year_id = db.Column(
        db.Integer, db.ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True
    )
    tags = db.Column(db.JSON, nullable=True)  # list of strings

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    category = db.relationship("DocumentCategory", back_populates="documents")
    uploader = db.relationship("User", back_populates="uploaded_documents", foreign_keys=[uploaded_by])
    academic_year = db.relationship("AcademicYear", back_populates="documents")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "category_id": self.category_id,
            "uploaded_by": self.uploaded_by,
            "is_public": self.is_public,
            "download_count": self.download_count,
            "version": self.version,
            "academic_year_id": self.academic_year_id,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Document {self.id}: {self.title}>"
