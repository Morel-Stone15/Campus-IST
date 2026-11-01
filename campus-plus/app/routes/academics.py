"""
Academic management routes – /api/v1/academics

Covers: departments, academic years, courses, schedules, classrooms.
"""

from datetime import datetime

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app import db
from app.utils.responses import success_response, error_response, paginated_response
from app.utils.decorators import role_required
from app.utils.helpers import create_notification

academics_bp = Blueprint("academics", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Departments
# ─────────────────────────────────────────────────────────────────────────────

@academics_bp.route("/departments", methods=["GET"])
@jwt_required()
def list_departments():
    """List all departments."""
    from app.models import Department

    departments = Department.query.order_by(Department.name).all()
    return success_response(
        data=[d.to_dict() if hasattr(d, "to_dict") else {"id": d.id, "name": d.name}
              for d in departments],
        message="Départements récupérés.",
    )


@academics_bp.route("/departments", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_department():
    """Create a new department."""
    from app.models import Department

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip()
    if not name or not code:
        return error_response("Le nom et le code du département sont requis.", 400)

    try:
        dept = Department(
            name=name,
            code=data.get("code", "").upper().strip(),
            description=data.get("description"),
            head_teacher_id=data.get("head_teacher_id"),
        )
        db.session.add(dept)
        db.session.commit()
        d = dept.to_dict() if hasattr(dept, "to_dict") else {"id": dept.id, "name": dept.name}
        return success_response(data=d, message="Département créé.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-department error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/departments/<dept_id>", methods=["GET"])
@jwt_required()
def get_department(dept_id):
    """Department detail including its courses."""
    from app.models import Department

    dept = Department.query.get(dept_id)
    if not dept:
        return error_response("Département introuvable.", 404)

    data = dept.to_dict() if hasattr(dept, "to_dict") else {"id": dept.id, "name": dept.name}
    if hasattr(dept, "courses"):
        data["courses"] = [
            c.to_dict() if hasattr(c, "to_dict") else {"id": c.id}
            for c in dept.courses
        ]
    return success_response(data=data, message="Département récupéré.")


@academics_bp.route("/departments/<dept_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_department(dept_id):
    """Update a department."""
    from app.models import Department

    dept = Department.query.get(dept_id)
    if not dept:
        return error_response("Département introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed = ["name", "code", "description", "head_teacher_id"]
    try:
        for field in allowed:
            if field in data:
                setattr(dept, field, data[field])
        db.session.commit()
        d = dept.to_dict() if hasattr(dept, "to_dict") else {"id": dept.id, "name": dept.name}
        return success_response(data=d, message="Département mis à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-department error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Academic Years
# ─────────────────────────────────────────────────────────────────────────────

@academics_bp.route("/academic-years", methods=["GET"])
@jwt_required()
def list_academic_years():
    """List all academic years."""
    from app.models import AcademicYear

    years = AcademicYear.query.order_by(AcademicYear.start_date.desc()).all()
    return success_response(
        data=[y.to_dict() if hasattr(y, "to_dict") else {"id": y.id} for y in years],
        message="Années académiques récupérées.",
    )


@academics_bp.route("/academic-years", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_academic_year():
    """Create a new academic year."""
    from app.models import AcademicYear

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error_response("Le nom de l'année académique est requis.", 422)

    try:
        year = AcademicYear(
            name=name,
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
            is_current=data.get("is_current", False),
        )
        db.session.add(year)
        db.session.commit()
        d = year.to_dict() if hasattr(year, "to_dict") else {"id": year.id, "name": year.name}
        return success_response(data=d, message="Année académique créée.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-academic-year error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/academic-years/<year_id>/set-current", methods=["PUT"])
@jwt_required()
@role_required("admin")
def set_current_academic_year(year_id):
    """Set a given academic year as the current one."""
    from app.models import AcademicYear

    year = AcademicYear.query.get(year_id)
    if not year:
        return error_response("Année académique introuvable.", 404)

    try:
        # Unset all others
        AcademicYear.query.update({"is_current": False})
        year.is_current = True
        db.session.commit()
        d = year.to_dict() if hasattr(year, "to_dict") else {"id": year.id}
        return success_response(data=d, message="Année courante mise à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Set-current-year error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Courses
# ─────────────────────────────────────────────────────────────────────────────

@academics_bp.route("/courses", methods=["GET"])
@jwt_required()
def list_courses():
    """List courses with optional filters (paginated)."""
    from app.models import Course

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    department_id = request.args.get("department_id")
    level = request.args.get("level")
    teacher_id = request.args.get("teacher_id")

    query = Course.query
    if department_id:
        query = query.filter_by(department_id=department_id)
    if level:
        query = query.filter_by(level=level)
    if teacher_id:
        query = query.filter_by(teacher_id=teacher_id)

    paginated = query.order_by(Course.name).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return paginated_response(
        items=[c.to_dict() if hasattr(c, "to_dict") else {"id": c.id} for c in paginated.items],
        total=paginated.total,
        page=page,
        per_page=per_page,
        message="Cours récupérés.",
    )


@academics_bp.route("/courses", methods=["POST"])
@jwt_required()
@role_required("admin", "manager", "teacher")
def create_course():
    """Create a new course."""
    from app.models import Course

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error_response("Le nom du cours est requis.", 422)

    try:
        course = Course(
            name=name,
            code=data.get("code", "").upper().strip(),
            description=data.get("description"),
            credits=data.get("credits"),
            level=data.get("level"),
            department_id=data.get("department_id"),
            teacher_id=data.get("teacher_id"),
            academic_year_id=data.get("academic_year_id"),
        )
        db.session.add(course)
        db.session.commit()
        d = course.to_dict() if hasattr(course, "to_dict") else {"id": course.id}
        return success_response(data=d, message="Cours créé.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-course error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/courses/<course_id>", methods=["GET"])
@jwt_required()
def get_course(course_id):
    """Course detail."""
    from app.models import Course

    course = Course.query.get(course_id)
    if not course:
        return error_response("Cours introuvable.", 404)
    return success_response(
        data=course.to_dict() if hasattr(course, "to_dict") else {"id": course.id},
        message="Cours récupéré.",
    )


@academics_bp.route("/courses/<course_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_course(course_id):
    """Update a course."""
    from app.models import Course

    course = Course.query.get(course_id)
    if not course:
        return error_response("Cours introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed = ["name", "code", "description", "credits", "level",
               "department_id", "teacher_id", "academic_year_id"]
    try:
        for field in allowed:
            if field in data:
                setattr(course, field, data[field])
        db.session.commit()
        d = course.to_dict() if hasattr(course, "to_dict") else {"id": course.id}
        return success_response(data=d, message="Cours mis à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-course error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/courses/<course_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_course(course_id):
    """Permanently delete a course."""
    from app.models import Course

    course = Course.query.get(course_id)
    if not course:
        return error_response("Cours introuvable.", 404)

    try:
        db.session.delete(course)
        db.session.commit()
        return success_response(message="Cours supprimé.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Delete-course error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Schedules
# ─────────────────────────────────────────────────────────────────────────────

def _times_overlap(start1, end1, start2, end2) -> bool:
    """Return True when two time intervals overlap (exclusive on boundaries)."""
    return start1 < end2 and start2 < end1


@academics_bp.route("/schedules", methods=["GET"])
@jwt_required()
def list_schedules():
    """List schedules.

    Students automatically see only schedules that match their
    department and academic level.  All other roles see everything
    (with optional filters).
    """
    from app.models import Schedule, Student

    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")

    query = Schedule.query

    # Optional explicit filters
    day_of_week = request.args.get("day_of_week")
    academic_year_id = request.args.get("academic_year_id")
    classroom_id = request.args.get("classroom_id")
    teacher_id = request.args.get("teacher_id")
    course_id = request.args.get("course_id")

    if day_of_week:
        query = query.filter(Schedule.day_of_week == day_of_week)
    if academic_year_id:
        query = query.filter(Schedule.academic_year_id == academic_year_id)
    if classroom_id:
        query = query.filter(Schedule.classroom_id == classroom_id)
    if teacher_id:
        query = query.filter(Schedule.teacher_id == teacher_id)
    if course_id:
        query = query.filter(Schedule.course_id == course_id)

    # Restrict students to their own department / level
    if role == "student":
        student = Student.query.filter_by(user_id=current_user_id).first()
        if student:
            if student.department_id:
                from app.models import Course
                course_ids = [
                    c.id for c in Course.query.filter_by(
                        department_id=student.department_id
                    ).all()
                ]
                query = query.filter(Schedule.course_id.in_(course_ids))

    schedules = query.all()
    return success_response(
        data=[s.to_dict() if hasattr(s, "to_dict") else {"id": s.id} for s in schedules],
        message="Emplois du temps récupérés.",
    )


@academics_bp.route("/schedules", methods=["POST"])
@jwt_required()
@role_required("admin", "manager")
def create_schedule():
    """Create a schedule entry, checking for classroom/teacher conflicts."""
    from app.models import Schedule

    data = request.get_json(silent=True) or {}
    required = ["course_id", "classroom_id", "teacher_id", "day_of_week",
                "start_time", "end_time", "academic_year_id"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Champs requis manquants: {', '.join(missing)}", 422)

    start_time = data["start_time"]
    end_time = data["end_time"]

    # Conflict check: same classroom, same day, overlapping times
    classroom_conflicts = Schedule.query.filter(
        Schedule.classroom_id == data["classroom_id"],
        Schedule.day_of_week == data["day_of_week"],
        Schedule.academic_year_id == data["academic_year_id"],
        Schedule.start_time < end_time,
        Schedule.end_time > start_time,
    ).first()

    if classroom_conflicts:
        return error_response(
            "Conflit de salle : la salle est déjà occupée sur ce créneau.",
            409,
            errors={"conflicting_schedule_id": classroom_conflicts.id},
        )

    # Conflict check: same teacher, same day, overlapping times
    teacher_conflicts = Schedule.query.filter(
        Schedule.teacher_id == data["teacher_id"],
        Schedule.day_of_week == data["day_of_week"],
        Schedule.academic_year_id == data["academic_year_id"],
        Schedule.start_time < end_time,
        Schedule.end_time > start_time,
    ).first()

    if teacher_conflicts:
        return error_response(
            "Conflit d'enseignant : cet enseignant a déjà un cours sur ce créneau.",
            409,
            errors={"conflicting_schedule_id": teacher_conflicts.id},
        )

    try:
        schedule = Schedule(
            course_id=data["course_id"],
            classroom_id=data["classroom_id"],
            teacher_id=data["teacher_id"],
            day_of_week=data["day_of_week"],
            start_time=data["start_time"],
            end_time=data["end_time"],
            academic_year_id=data["academic_year_id"],
            notes=data.get("notes"),
        )
        db.session.add(schedule)
        db.session.commit()
        d = schedule.to_dict() if hasattr(schedule, "to_dict") else {"id": schedule.id}
        return success_response(data=d, message="Créneau créé.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-schedule error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/schedules/<schedule_id>", methods=["GET"])
@jwt_required()
def get_schedule(schedule_id):
    """Schedule detail."""
    from app.models import Schedule

    schedule = Schedule.query.get(schedule_id)
    if not schedule:
        return error_response("Créneau introuvable.", 404)
    return success_response(
        data=schedule.to_dict() if hasattr(schedule, "to_dict") else {"id": schedule.id},
        message="Créneau récupéré.",
    )


@academics_bp.route("/schedules/<schedule_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "manager")
def update_schedule(schedule_id):
    """Update a schedule entry and notify affected students."""
    from app.models import Schedule, Student

    schedule = Schedule.query.get(schedule_id)
    if not schedule:
        return error_response("Créneau introuvable.", 404)

    data = request.get_json(silent=True) or {}
    allowed = ["course_id", "classroom_id", "teacher_id", "day_of_week",
               "start_time", "end_time", "academic_year_id", "notes"]

    start_time = data.get("start_time", schedule.start_time)
    end_time = data.get("end_time", schedule.end_time)
    classroom_id = data.get("classroom_id", schedule.classroom_id)
    teacher_id = data.get("teacher_id", schedule.teacher_id)
    day_of_week = data.get("day_of_week", schedule.day_of_week)
    academic_year_id = data.get("academic_year_id", schedule.academic_year_id)

    # Re-check conflicts (exclude the current schedule itself)
    classroom_conflicts = Schedule.query.filter(
        Schedule.id != schedule_id,
        Schedule.classroom_id == classroom_id,
        Schedule.day_of_week == day_of_week,
        Schedule.academic_year_id == academic_year_id,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time,
    ).first()

    if classroom_conflicts:
        return error_response(
            "Conflit de salle détecté.",
            409,
            errors={"conflicting_schedule_id": classroom_conflicts.id},
        )

    teacher_conflicts = Schedule.query.filter(
        Schedule.id != schedule_id,
        Schedule.teacher_id == teacher_id,
        Schedule.day_of_week == day_of_week,
        Schedule.academic_year_id == academic_year_id,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time,
    ).first()

    if teacher_conflicts:
        return error_response(
            "Conflit d'enseignant détecté.",
            409,
            errors={"conflicting_schedule_id": teacher_conflicts.id},
        )

    try:
        for field in allowed:
            if field in data:
                setattr(schedule, field, data[field])
        db.session.flush()

        # Notify affected students (those in the related department/level)
        if hasattr(schedule, "course") and schedule.course:
            dept_id = schedule.course.department_id
            students = Student.query.filter_by(department_id=dept_id).all()
            for student in students:
                create_notification(
                    user_id=student.user_id,
                    title="Modification d'emploi du temps",
                    message=f"Le créneau du cours '{getattr(schedule.course, 'name', '')}' "
                            f"a été modifié.",
                    notif_type="schedule_change",
                    related_id=schedule.id,
                    related_type="schedule",
                )

        db.session.commit()
        d = schedule.to_dict() if hasattr(schedule, "to_dict") else {"id": schedule.id}
        return success_response(data=d, message="Créneau mis à jour.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Update-schedule error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/schedules/<schedule_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin", "manager")
def delete_schedule(schedule_id):
    """Delete or cancel a schedule entry."""
    from app.models import Schedule

    schedule = Schedule.query.get(schedule_id)
    if not schedule:
        return error_response("Créneau introuvable.", 404)

    try:
        db.session.delete(schedule)
        db.session.commit()
        return success_response(message="Créneau supprimé.")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Delete-schedule error: %s", exc)
        return error_response("Erreur interne.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Classrooms
# ─────────────────────────────────────────────────────────────────────────────

@academics_bp.route("/classrooms", methods=["GET"])
@jwt_required()
def list_classrooms():
    """List classrooms with optional filters."""
    from app.models import Classroom

    building_id = request.args.get("building_id")
    room_type = request.args.get("type")
    min_capacity = request.args.get("min_capacity", type=int)

    query = Classroom.query
    if building_id:
        query = query.filter_by(building_id=building_id)
    if room_type:
        query = query.filter_by(room_type=room_type)
    if min_capacity is not None:
        query = query.filter(Classroom.capacity >= min_capacity)

    classrooms = query.order_by(Classroom.name).all()
    return success_response(
        data=[c.to_dict() if hasattr(c, "to_dict") else {"id": c.id} for c in classrooms],
        message="Salles récupérées.",
    )


@academics_bp.route("/classrooms", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_classroom():
    """Create a classroom."""
    from app.models import Classroom

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error_response("Le nom de la salle est requis.", 422)

    try:
        classroom = Classroom(
            name=name,
            building_id=data.get("building_id"),
            floor=data.get("floor"),
            room_type=data.get("room_type", "classroom"),
            capacity=data.get("capacity"),
            has_projector=data.get("has_projector", False),
            has_ac=data.get("has_ac", False),
            is_active=data.get("is_active", True),
        )
        db.session.add(classroom)
        db.session.commit()
        d = classroom.to_dict() if hasattr(classroom, "to_dict") else {"id": classroom.id}
        return success_response(data=d, message="Salle créée.", status_code=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Create-classroom error: %s", exc)
        return error_response("Erreur interne.", 500)


@academics_bp.route("/classrooms/<classroom_id>", methods=["GET"])
@jwt_required()
def get_classroom(classroom_id):
    """Classroom detail with its schedule."""
    from app.models import Classroom, Schedule

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return error_response("Salle introuvable.", 404)

    data = classroom.to_dict() if hasattr(classroom, "to_dict") else {"id": classroom.id}
    schedules = Schedule.query.filter_by(classroom_id=classroom_id).all()
    data["schedules"] = [
        s.to_dict() if hasattr(s, "to_dict") else {"id": s.id} for s in schedules
    ]
    return success_response(data=data, message="Salle récupérée.")
