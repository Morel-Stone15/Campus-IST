"""
Course-related models: Department, AcademicYear, Course.
"""

from datetime import datetime

from app import db


class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    head_teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    head_teacher = db.relationship("Teacher", foreign_keys=[head_teacher_id])
    students = db.relationship("Student", back_populates="department")
    teachers = db.relationship(
        "Teacher", back_populates="department", foreign_keys="Teacher.department_id"
    )
    courses = db.relationship("Course", back_populates="department")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "head_teacher_id": self.head_teacher_id,
        }

    def __repr__(self) -> str:
        return f"<Department {self.code}>"


class AcademicYear(db.Model):
    __tablename__ = "academic_years"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False, unique=True)  # e.g. "2025-2026"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_current = db.Column(db.Boolean, nullable=False, default=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    students = db.relationship("Student", back_populates="academic_year")
    schedules = db.relationship("Schedule", back_populates="academic_year")
    documents = db.relationship("Document", back_populates="academic_year")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "is_current": self.is_current,
        }

    def __repr__(self) -> str:
        return f"<AcademicYear {self.name}>"


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    department_id = db.Column(
        db.Integer, db.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    credits = db.Column(db.Integer, nullable=False, default=3)
    level = db.Column(
        db.Enum("L1", "L2", "L3", "M1", "M2", name="course_level_enum"),
        nullable=False,
    )
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    max_students = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    department = db.relationship("Department", back_populates="courses")
    teacher = db.relationship("Teacher", back_populates="courses", foreign_keys=[teacher_id])
    schedules = db.relationship("Schedule", back_populates="course")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "department_id": self.department_id,
            "credits": self.credits,
            "level": self.level,
            "teacher_id": self.teacher_id,
            "max_students": self.max_students,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Course {self.code} – {self.name}>"
