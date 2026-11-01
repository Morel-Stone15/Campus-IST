"""
models/__init__.py – re-exports all models so they are registered with
SQLAlchemy when `from app.models import …` is used in the app factory.

Import ORDER matters to avoid FK resolution issues:
  1. User (no model deps)
  2. Building / Location / Classroom (no user deps)
  3. Department / AcademicYear (no user deps)
  4. Teacher (needs User, Department)
  5. Student (needs User, Department, AcademicYear)
  6. Course (needs Department, Teacher)
  7. Schedule (needs Course, Classroom, Teacher, AcademicYear)
  8. Everything else
"""

from app.models.user import User  # noqa: F401
from app.models.building import Building, Location, Classroom  # noqa: F401
from app.models.course import Department, AcademicYear, Course  # noqa: F401
from app.models.teacher import Teacher  # noqa: F401
from app.models.student import Student  # noqa: F401
from app.models.schedule import Schedule  # noqa: F401
from app.models.document import DocumentCategory, Document  # noqa: F401
from app.models.event import Event, EventRegistration  # noqa: F401
from app.models.service import Service  # noqa: F401
from app.models.locker import Locker  # noqa: F401
from app.models.reservation import LockerReservation, RoomReservation  # noqa: F401
from app.models.notification import Notification, HymnContent  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.app_data import AppData  # noqa: F401

__all__ = [
    "User",
    "Building",
    "Location",
    "Classroom",
    "Department",
    "AcademicYear",
    "Course",
    "Teacher",
    "Student",
    "Schedule",
    "DocumentCategory",
    "Document",
    "Event",
    "EventRegistration",
    "Service",
    "Locker",
    "LockerReservation",
    "RoomReservation",
    "Notification",
    "HymnContent",
    "AuditLog",
    "AppData",
]
