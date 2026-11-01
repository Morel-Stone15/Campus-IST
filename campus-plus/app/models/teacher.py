"""
Teacher model – extends User with faculty information.
"""

from datetime import datetime

from app import db


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    teacher_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    department_id = db.Column(
        db.Integer, db.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    specialization = db.Column(db.String(200), nullable=True)
    grade = db.Column(
        db.Enum(
            "assistant",
            "lecturer",
            "senior_lecturer",
            "associate_professor",
            "professor",
            name="teacher_grade_enum",
        ),
        nullable=False,
        default="lecturer",
    )
    office_location = db.Column(db.String(200), nullable=True)
    office_hours = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="teacher_profile")
    department = db.relationship(
        "Department", back_populates="teachers", foreign_keys=[department_id]
    )
    courses = db.relationship(
        "Course", back_populates="teacher", foreign_keys="Course.teacher_id"
    )
    schedules = db.relationship("Schedule", back_populates="teacher")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "teacher_number": self.teacher_number,
            "department_id": self.department_id,
            "specialization": self.specialization,
            "grade": self.grade,
            "office_location": self.office_location,
            "office_hours": self.office_hours,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Teacher {self.teacher_number}>"
