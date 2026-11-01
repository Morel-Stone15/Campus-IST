"""
Schedule model – maps courses to classrooms and time slots.
"""

from datetime import datetime

from app import db


class Schedule(db.Model):
    __tablename__ = "schedules"
    __table_args__ = (
        # Prevent double-booking: same classroom at the same day/time/week_type
        db.UniqueConstraint(
            "classroom_id",
            "day_of_week",
            "start_time",
            "end_time",
            "week_type",
            "academic_year_id",
            name="uq_schedule_classroom_slot",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(
        db.Integer, db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    classroom_id = db.Column(
        db.Integer, db.ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True
    )
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    academic_year_id = db.Column(
        db.Integer, db.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False
    )

    # ── Time slot ─────────────────────────────────────────────────────────────
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday … 6=Sunday
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    week_type = db.Column(
        db.Enum("all", "odd", "even", name="week_type_enum"),
        nullable=False,
        default="all",
    )

    # ── Status ────────────────────────────────────────────────────────────────
    is_cancelled = db.Column(db.Boolean, nullable=False, default=False)
    cancellation_reason = db.Column(db.Text, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    course = db.relationship("Course", back_populates="schedules")
    classroom = db.relationship("Classroom", back_populates="schedules")
    teacher = db.relationship("Teacher", back_populates="schedules")
    academic_year = db.relationship("AcademicYear", back_populates="schedules")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "classroom_id": self.classroom_id,
            "teacher_id": self.teacher_id,
            "academic_year_id": self.academic_year_id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "week_type": self.week_type,
            "is_cancelled": self.is_cancelled,
            "cancellation_reason": self.cancellation_reason,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        day = days[self.day_of_week] if self.day_of_week is not None else "?"
        return f"<Schedule course={self.course_id} {day} {self.start_time}-{self.end_time}>"
