"""
Student model – extends User with academic information.
"""

from datetime import datetime

from app import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    student_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    department_id = db.Column(
        db.Integer, db.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    level = db.Column(
        db.Enum("L1", "L2", "L3", "M1", "M2", name="student_level_enum"),
        nullable=False,
        default="L1",
    )
    academic_year_id = db.Column(
        db.Integer, db.ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True
    )
    enrollment_date = db.Column(db.Date, nullable=True)
    status = db.Column(
        db.Enum("active", "suspended", "graduated", name="student_status_enum"),
        nullable=False,
        default="active",
    )
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="student_profile")
    department = db.relationship("Department", back_populates="students")
    academic_year = db.relationship("AcademicYear", back_populates="students")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "student_number": self.student_number,
            "department_id": self.department_id,
            "level": self.level,
            "academic_year_id": self.academic_year_id,
            "enrollment_date": self.enrollment_date.isoformat() if self.enrollment_date else None,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Student {self.student_number}>"
