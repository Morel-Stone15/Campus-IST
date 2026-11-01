"""
seeds.py – Populate the CAMPUS+ database with realistic demo data.

Usage (from the campus-plus/ directory):
    python seeds.py

The script is idempotent: running it multiple times won't duplicate records
because it checks for existing entries before inserting.

WARNING: Do NOT use real student data. All data below is fictional.
"""

import os
import secrets
import sys
from datetime import date, datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure the campus-plus directory is on the path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.course import Department, AcademicYear, Course
from app.models.building import Building, Location, Classroom
from app.models.service import Service
from app.models.locker import Locker
from app.models.event import Event
from app.models.document import DocumentCategory, Document
from app.models.notification import HymnContent


def seed_departments(existing_codes: set) -> dict:
    """Insert departments and return a code→object mapping."""
    departments_data = [
        {"name": "Informatique & Réseaux", "code": "INFO"},
        {"name": "Génie Civil", "code": "GC"},
        {"name": "Génie Électrique", "code": "GE"},
        {"name": "Gestion & Comptabilité", "code": "GCOM"},
        {"name": "Sciences de la Santé", "code": "SS"},
    ]
    depts = {}
    for d in departments_data:
        if d["code"] not in existing_codes:
            dept = Department(name=d["name"], code=d["code"])
            db.session.add(dept)
            depts[d["code"]] = dept
        else:
            depts[d["code"]] = Department.query.filter_by(code=d["code"]).first()
    db.session.flush()
    return depts


def seed_academic_years() -> dict:
    """Insert academic years and return a name→object mapping."""
    years_data = [
        {
            "name": "2023-2024",
            "start_date": date(2023, 10, 1),
            "end_date": date(2024, 7, 31),
            "is_current": False,
        },
        {
            "name": "2024-2025",
            "start_date": date(2024, 10, 1),
            "end_date": date(2025, 7, 31),
            "is_current": False,
        },
        {
            "name": "2025-2026",
            "start_date": date(2025, 10, 1),
            "end_date": date(2026, 7, 31),
            "is_current": True,
        },
    ]
    years = {}
    for y in years_data:
        existing = AcademicYear.query.filter_by(name=y["name"]).first()
        if not existing:
            ay = AcademicYear(**y)
            db.session.add(ay)
            years[y["name"]] = ay
        else:
            years[y["name"]] = existing
    db.session.flush()
    return years


def seed_users(depts: dict, years: dict) -> dict:
    """Insert demo users (admin, managers, teachers, students)."""
    users = {}
    created_user = False
    ay = years.get("2025-2026")
    seed_password = os.environ.get("CAMPUS_SEED_PASSWORD") or secrets.token_urlsafe(18)

    # ── Admin ────────────────────────────────────────────────────────────────
    if not User.query.filter_by(email="admin@ist.edu").first():
        created_user = True
        admin = User(
            email="admin@ist.edu",
            username="admin_ist",
            first_name="Administrateur",
            last_name="IST",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin.set_password(seed_password)
        db.session.add(admin)
        users["admin"] = admin
        db.session.flush()

    if not User.query.filter_by(email="admin@ist.ga").first():
        created_user = True
        admin_ga = User(
            email="admin@ist.ga",
            username="admin_ist_ga",
            first_name="Administration",
            last_name="IST",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin_ga.set_password(seed_password)
        db.session.add(admin_ga)
        db.session.flush()

    # ── Manager ──────────────────────────────────────────────────────────────
    if not User.query.filter_by(email="directeur@ist.edu").first():
        created_user = True
        mgr = User(
            email="directeur@ist.edu",
            username="directeur_ist",
            first_name="Jean-Baptiste",
            last_name="Kouassi",
            role="manager",
            is_active=True,
            is_verified=True,
        )
        mgr.set_password(seed_password)
        db.session.add(mgr)
        users["manager"] = mgr
        db.session.flush()

    # ── Staff ────────────────────────────────────────────────────────────────
    if not User.query.filter_by(email="secretariat@ist.edu").first():
        created_user = True
        staff = User(
            email="secretariat@ist.edu",
            username="secretariat_ist",
            first_name="Marie-Claire",
            last_name="Akoto",
            role="staff",
            is_active=True,
            is_verified=True,
        )
        staff.set_password(seed_password)
        db.session.add(staff)
        users["staff"] = staff
        db.session.flush()

    # ── Teachers ─────────────────────────────────────────────────────────────
    teachers_data = [
        {
            "email": "prof.diallo@ist.edu",
            "username": "prof_diallo",
            "first_name": "Mamadou",
            "last_name": "Diallo",
            "teacher_number": "PROF001",
            "dept_code": "INFO",
            "specialization": "Algorithmes & Structures de données",
        },
        {
            "email": "prof.bamba@ist.edu",
            "username": "prof_bamba",
            "first_name": "Aminata",
            "last_name": "Bamba",
            "teacher_number": "PROF002",
            "dept_code": "GE",
            "specialization": "Électronique de puissance",
        },
        {
            "email": "prof.kone@ist.edu",
            "username": "prof_kone",
            "first_name": "Ibrahim",
            "last_name": "Koné",
            "teacher_number": "PROF003",
            "dept_code": "GC",
            "specialization": "Béton armé et structures",
        },
    ]

    for td in teachers_data:
        if not User.query.filter_by(email=td["email"]).first():
            created_user = True
            t_user = User(
                email=td["email"],
                username=td["username"],
                first_name=td["first_name"],
                last_name=td["last_name"],
                role="teacher",
                is_active=True,
                is_verified=True,
            )
            t_user.set_password(seed_password)
            db.session.add(t_user)
            db.session.flush()

            teacher = Teacher(
                user_id=t_user.id,
                teacher_number=td["teacher_number"],
                department_id=depts[td["dept_code"]].id,
                specialization=td["specialization"],
            )
            db.session.add(teacher)
            db.session.flush()
            users[td["username"]] = t_user

    # ── Students ─────────────────────────────────────────────────────────────
    # Course level Enum values: L1, L2, L3, M1, M2
    students_data = [
        {
            "email": "etudiant.traore@ist.edu",
            "username": "traore_k",
            "first_name": "Karim",
            "last_name": "Traoré",
            "student_number": "IST2025001",
            "dept_code": "INFO",
            "level": "L3",
        },
        {
            "email": "etudiant.coulibaly@ist.edu",
            "username": "coulibaly_f",
            "first_name": "Fatoumata",
            "last_name": "Coulibaly",
            "student_number": "IST2025002",
            "dept_code": "GCOM",
            "level": "L2",
        },
        {
            "email": "etudiant.ouedraogo@ist.edu",
            "username": "ouedraogo_r",
            "first_name": "Rasmané",
            "last_name": "Ouédraogo",
            "student_number": "IST2025003",
            "dept_code": "GE",
            "level": "M1",
        },
        {
            "email": "etudiant.yao@ist.edu",
            "username": "yao_a",
            "first_name": "Ange",
            "last_name": "Yao",
            "student_number": "IST2025004",
            "dept_code": "INFO",
            "level": "L1",
        },
        {
            "email": "etudiant.sow@ist.edu",
            "username": "sow_m",
            "first_name": "Mariama",
            "last_name": "Sow",
            "student_number": "IST2025005",
            "dept_code": "SS",
            "level": "L2",
        },
    ]

    for sd in students_data:
        if not User.query.filter_by(email=sd["email"]).first():
            created_user = True
            s_user = User(
                email=sd["email"],
                username=sd["username"],
                first_name=sd["first_name"],
                last_name=sd["last_name"],
                role="student",
                is_active=True,
                is_verified=True,
            )
            s_user.set_password(seed_password)
            db.session.add(s_user)
            db.session.flush()

            student = Student(
                user_id=s_user.id,
                student_number=sd["student_number"],
                department_id=depts[sd["dept_code"]].id,
                level=sd["level"],
                academic_year_id=ay.id if ay else None,
            )
            db.session.add(student)
            db.session.flush()
            users[sd["username"]] = s_user

    if created_user:
        print("Mot de passe temporaire des comptes de démonstration : " + seed_password)

    return users


def seed_buildings() -> dict:
    """Insert campus buildings and return a code→object mapping."""
    buildings_data = [
        {
            "name": "Bâtiment Administratif",
            "code": "ADM",
            "description": "Bureaux de la direction et services administratifs",
            "floors": 3,
            "latitude": 5.3484,
            "longitude": -4.0083,
            "address": "Avenue IST, Abidjan",
        },
        {
            "name": "Bâtiment A – Informatique",
            "code": "BA",
            "description": "Salles de cours et laboratoires informatiques",
            "floors": 4,
            "latitude": 5.3486,
            "longitude": -4.0079,
        },
        {
            "name": "Bâtiment B – Sciences",
            "code": "BB",
            "description": "Laboratoires de sciences et génie civil",
            "floors": 3,
            "latitude": 5.3481,
            "longitude": -4.0075,
        },
        {
            "name": "Bibliothèque Centrale",
            "code": "LIB",
            "description": "Bibliothèque universitaire avec espace de travail",
            "floors": 2,
            "latitude": 5.3479,
            "longitude": -4.0082,
        },
        {
            "name": "Centre Médical",
            "code": "MED",
            "description": "Infirmerie et centre de soins étudiants",
            "floors": 1,
            "latitude": 5.3477,
            "longitude": -4.0086,
        },
        {
            "name": "Restaurant Universitaire",
            "code": "RU",
            "description": "Cafétéria et restaurant du campus",
            "floors": 1,
            "latitude": 5.3482,
            "longitude": -4.0088,
        },
    ]
    buildings = {}
    for bd in buildings_data:
        if not Building.query.filter_by(code=bd["code"]).first():
            b = Building(**bd)
            db.session.add(b)
            buildings[bd["code"]] = b
        else:
            buildings[bd["code"]] = Building.query.filter_by(code=bd["code"]).first()
    db.session.flush()
    return buildings


def seed_classrooms(buildings: dict) -> None:
    """Insert classrooms."""
    classrooms_data = [
        {"name": "Amphi 200", "code": "AMP200", "capacity": 200, "room_type": "amphitheater", "has_projector": True, "has_ac": True},
        {"name": "Salle Info 101", "code": "SI101", "capacity": 30, "room_type": "computer_lab", "has_projector": True, "has_whiteboard": True, "has_ac": True},
        {"name": "Salle Info 102", "code": "SI102", "capacity": 30, "room_type": "computer_lab", "has_projector": True, "has_whiteboard": True},
        {"name": "Salle de Cours B201", "code": "SCB201", "capacity": 50, "room_type": "lecture_hall", "has_projector": True, "has_whiteboard": True},
        {"name": "Salle de Cours B202", "code": "SCB202", "capacity": 50, "room_type": "lecture_hall", "has_projector": True, "has_whiteboard": True},
        {"name": "Salle de Séminaire A301", "code": "SA301", "capacity": 20, "room_type": "seminar", "has_projector": True, "has_whiteboard": True, "has_ac": True},
        {"name": "Labo Génie Civil", "code": "LGC001", "capacity": 25, "room_type": "lab", "has_whiteboard": True},
    ]
    for cd in classrooms_data:
        if not Classroom.query.filter_by(code=cd["code"]).first():
            c = Classroom(**cd)
            db.session.add(c)
    db.session.flush()


def seed_services() -> None:
    """Insert campus services."""
    services_data = [
        {
            "name": "Restaurant Universitaire IST",
            "service_type": "restaurant",
            "description": "Repas chauds, buffets et collations pour étudiants et personnel.",
            "capacity": 300,
            "contact_phone": "+225 07 00 00 01",
            "opening_hours": {
                "monday": {"open": "07:00", "close": "20:00"},
                "tuesday": {"open": "07:00", "close": "20:00"},
                "wednesday": {"open": "07:00", "close": "20:00"},
                "thursday": {"open": "07:00", "close": "20:00"},
                "friday": {"open": "07:00", "close": "18:00"},
                "saturday": {"open": "08:00", "close": "14:00"},
            },
        },
        {
            "name": "Bibliothèque Centrale",
            "service_type": "library",
            "description": "Plus de 15 000 ouvrages, accès internet, salle de lecture.",
            "capacity": 150,
            "contact_email": "bibliotheque@ist.edu",
            "opening_hours": {
                "monday": {"open": "08:00", "close": "20:00"},
                "tuesday": {"open": "08:00", "close": "20:00"},
                "wednesday": {"open": "08:00", "close": "20:00"},
                "thursday": {"open": "08:00", "close": "20:00"},
                "friday": {"open": "08:00", "close": "18:00"},
                "saturday": {"open": "09:00", "close": "13:00"},
            },
        },
        {
            "name": "Infirmerie du Campus",
            "service_type": "infirmary",
            "description": "Consultations médicales gratuites pour les étudiants.",
            "contact_phone": "+225 07 00 00 02",
            "contact_email": "sante@ist.edu",
            "opening_hours": {
                "monday": {"open": "08:00", "close": "17:00"},
                "tuesday": {"open": "08:00", "close": "17:00"},
                "wednesday": {"open": "08:00", "close": "17:00"},
                "thursday": {"open": "08:00", "close": "17:00"},
                "friday": {"open": "08:00", "close": "15:00"},
            },
        },
        {
            "name": "Aire de Jeux & Sport",
            "service_type": "playground",
            "description": "Terrain de football, basketball et zone de détente.",
            "opening_hours": {
                "monday": {"open": "06:00", "close": "22:00"},
                "tuesday": {"open": "06:00", "close": "22:00"},
                "wednesday": {"open": "06:00", "close": "22:00"},
                "thursday": {"open": "06:00", "close": "22:00"},
                "friday": {"open": "06:00", "close": "22:00"},
                "saturday": {"open": "07:00", "close": "22:00"},
                "sunday": {"open": "08:00", "close": "20:00"},
            },
        },
        {
            "name": "Scolarité & Admissions",
            "service_type": "administrative",
            "description": "Inscriptions, relevés de notes, attestations et documents officiels.",
            "contact_phone": "+225 07 00 00 03",
            "contact_email": "scolarite@ist.edu",
            "opening_hours": {
                "monday": {"open": "08:00", "close": "16:30"},
                "tuesday": {"open": "08:00", "close": "16:30"},
                "wednesday": {"open": "08:00", "close": "12:00"},
                "thursday": {"open": "08:00", "close": "16:30"},
                "friday": {"open": "08:00", "close": "15:00"},
            },
        },
    ]

    for sd in services_data:
        if not Service.query.filter_by(name=sd["name"]).first():
            s = Service(**sd)
            db.session.add(s)
    db.session.flush()


def seed_lockers(buildings: dict) -> None:
    """Insert sample lockers."""
    ba_building = buildings.get("BA")
    if not ba_building:
        return

    for i in range(1, 41):  # 40 lockers
        number = f"A{i:03d}"
        if not Locker.query.filter_by(locker_number=number).first():
            size = "small" if i <= 15 else ("medium" if i <= 30 else "large")
            locker = Locker(
                locker_number=number,
                building_id=ba_building.id,
                floor=1 if i <= 20 else 2,
                section="Section Est" if i % 2 == 0 else "Section Ouest",
                size=size,
                status="available",
                is_active=True,
            )
            db.session.add(locker)
    db.session.flush()


def seed_events(admin_user) -> None:
    """Insert sample events.
    Note: Event.event_type Enum values: internal, external, sport, conference, competition, training
    """
    if not admin_user:
        return

    events_data = [
        {
            "title": "Cérémonie d'ouverture de l'année académique 2025-2026",
            "description": "Accueil officiel de tous les étudiants et présentation des programmes.",
            "event_type": "internal",
            "start_datetime": datetime(2025, 10, 6, 9, 0),
            "end_datetime": datetime(2025, 10, 6, 13, 0),
            "location": "Amphithéâtre principal",
            "max_participants": 500,
            "is_public": True,
            "status": "published",
        },
        {
            "title": "Hackathon IST – Innovation Numérique 2025",
            "description": "48h de programmation intensive autour des défis du numérique en Afrique.",
            "event_type": "competition",
            "start_datetime": datetime(2025, 11, 14, 8, 0),
            "end_datetime": datetime(2025, 11, 16, 18, 0),
            "location": "Bâtiment Informatique",
            "max_participants": 120,
            "is_public": True,
            "status": "published",
        },
        {
            "title": "Tournoi de Football Inter-Départements",
            "description": "Compétition sportive annuelle entre les départements de l'IST.",
            "event_type": "sport",
            "start_datetime": datetime(2025, 12, 5, 14, 0),
            "end_datetime": datetime(2025, 12, 5, 19, 0),
            "location": "Terrain de sport",
            "max_participants": 200,
            "is_public": True,
            "status": "published",
        },
        {
            "title": "Conférence: Intelligence Artificielle et Emploi en Afrique",
            "description": "Intervenants experts issus du monde académique et industriel.",
            "event_type": "conference",
            "start_datetime": datetime(2025, 11, 28, 10, 0),
            "end_datetime": datetime(2025, 11, 28, 17, 0),
            "location": "Amphi 200",
            "max_participants": 200,
            "is_public": True,
            "status": "published",
        },
        {
            "title": "Formation: Certification CompTIA Network+",
            "description": "Préparation aux certifications réseau pour les étudiants en informatique.",
            "event_type": "training",
            "start_datetime": datetime(2025, 11, 3, 8, 0),
            "end_datetime": datetime(2025, 11, 7, 17, 0),
            "location": "Salle Info 101",
            "max_participants": 25,
            "is_public": False,
            "status": "published",
        },
    ]

    for ed in events_data:
        if not Event.query.filter_by(title=ed["title"]).first():
            e = Event(organizer_id=admin_user.id, **ed)
            db.session.add(e)
    db.session.flush()


def seed_documents(admin_user) -> None:
    """Insert document categories and sample document metadata."""
    if not admin_user:
        return

    categories = [
        {"name": "Règlement Intérieur", "description": "Règles et procédures officielles de l'établissement"},
        {"name": "Programmes Académiques", "description": "Maquettes pédagogiques par département et niveau"},
        {"name": "Formulaires Administratifs", "description": "Formulaires de demandes et déclarations"},
        {"name": "Rapports & Publications", "description": "Rapports annuels et publications de recherche"},
        {"name": "Ressources Pédagogiques", "description": "Cours, TD et supports de cours partagés"},
    ]

    cat_objects = {}
    for c in categories:
        existing = DocumentCategory.query.filter_by(name=c["name"]).first()
        if not existing:
            cat = DocumentCategory(**c)
            db.session.add(cat)
            db.session.flush()
            cat_objects[c["name"]] = cat
        else:
            cat_objects[c["name"]] = existing

    docs = [
        {
            "title": "Règlement Intérieur IST – Édition 2025",
            "description": "Règlement complet applicable à tous les étudiants et personnels.",
            "file_name": "reglement_ist_2025.pdf",
            "file_type": "application/pdf",
            "is_public": True,
            "category_key": "Règlement Intérieur",
        },
        {
            "title": "Programme Licence Informatique 2025-2026",
            "description": "Maquette pédagogique complète du cursus Licence Informatique.",
            "file_name": "programme_info_l3_2025.pdf",
            "file_type": "application/pdf",
            "is_public": True,
            "category_key": "Programmes Académiques",
        },
        {
            "title": "Formulaire de Demande d'Attestation de Scolarité",
            "description": "À remettre au secrétariat avec une pièce d'identité.",
            "file_name": "formulaire_attestation.pdf",
            "file_type": "application/pdf",
            "is_public": True,
            "category_key": "Formulaires Administratifs",
        },
        {
            "title": "Rapport Annuel IST 2024-2025",
            "description": "Bilan des activités pédagogiques et administratives de l'année.",
            "file_name": "rapport_annuel_2024_2025.pdf",
            "file_type": "application/pdf",
            "is_public": False,
            "category_key": "Rapports & Publications",
        },
    ]

    for dd in docs:
        if not Document.query.filter_by(title=dd["title"]).first():
            cat_key = dd.pop("category_key")
            cat = cat_objects.get(cat_key)
            doc = Document(
                uploaded_by=admin_user.id,
                category_id=cat.id if cat else None,
                file_path=f"documents/{dd['file_name']}",
                version=1,
                **dd,
            )
            db.session.add(doc)
    db.session.flush()


def seed_hymn(admin_user) -> None:
    """Insert the campus hymn placeholder."""
    if not admin_user:
        return

    if not HymnContent.query.first():
        hymn = HymnContent(
            id=1,
            title="Hymne de l'Institut Supérieur de Technologie",
            lyrics=(
                "Debout, étudiants de l'IST,\n"
                "Porteurs du savoir et de la fierté,\n"
                "Sous ce ciel de lumière et de vérité,\n"
                "Bâtissons ensemble un monde éclairé.\n\n"
                "Refrain:\n"
                "IST, berceau de nos rêves,\n"
                "École de la persévérance,\n"
                "Nos cœurs à toi se lèvent,\n"
                "Dans l'honneur et l'excellence.\n"
            ),
            is_downloadable=True,
            uploaded_by=admin_user.id,
        )
        db.session.add(hymn)
        db.session.flush()


def seed_courses(depts: dict, years: dict) -> None:
    """Insert sample courses.
    Course.level Enum values: L1, L2, L3, M1, M2
    """
    ay = years.get("2025-2026")

    courses_data = [
        {"name": "Algorithmes et Structures de Données", "code": "INFO301", "credits": 4, "level": "L3", "dept": "INFO"},
        {"name": "Réseaux Informatiques", "code": "INFO201", "credits": 3, "level": "L2", "dept": "INFO"},
        {"name": "Bases de Données Avancées", "code": "INFO302", "credits": 4, "level": "L3", "dept": "INFO"},
        {"name": "Développement Web Full-Stack", "code": "INFO303", "credits": 3, "level": "L3", "dept": "INFO"},
        {"name": "Électronique de Puissance", "code": "GE201", "credits": 4, "level": "L2", "dept": "GE"},
        {"name": "Automatique & Régulation", "code": "GE301", "credits": 3, "level": "L3", "dept": "GE"},
        {"name": "Résistance des Matériaux", "code": "GC201", "credits": 4, "level": "L2", "dept": "GC"},
        {"name": "Comptabilité Générale", "code": "GCOM101", "credits": 3, "level": "L1", "dept": "GCOM"},
    ]

    for cd in courses_data:
        if not Course.query.filter_by(code=cd["code"]).first():
            dept_key = cd.pop("dept")
            dept_obj = depts.get(dept_key)
            course = Course(
                department_id=dept_obj.id if dept_obj else None,
                **cd,
            )
            db.session.add(course)
    db.session.flush()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def run_seeds():
    app = create_app("development")

    with app.app_context():
        print("🌱  Création des tables si nécessaire …")
        db.create_all()

        print("📦  Insertion des départements …")
        existing_codes = {d.code for d in Department.query.all()}
        depts = seed_departments(existing_codes)

        print("📅  Insertion des années académiques …")
        years = seed_academic_years()

        print("📚  Insertion des matières …")
        seed_courses(depts, years)

        print("👤  Insertion des utilisateurs …")
        users = seed_users(depts, years)
        admin_user = users.get("admin") or User.query.filter_by(email="admin@ist.edu").first()

        print("🏢  Insertion des bâtiments …")
        buildings = seed_buildings()

        print("🚪  Insertion des salles de cours …")
        seed_classrooms(buildings)

        print("🛎️   Insertion des services du campus …")
        seed_services()

        print("🔒  Insertion des casiers …")
        seed_lockers(buildings)

        print("📅  Insertion des événements …")
        seed_events(admin_user)

        print("📄  Insertion des documents …")
        seed_documents(admin_user)

        print("🎵  Insertion de l'hymne de l'IST …")
        seed_hymn(admin_user)

        db.session.commit()
        print("\n✅  Données de démonstration insérées avec succès !")
        print("\n📋  Les comptes de démonstration partagent le mot de passe temporaire affiché ci-dessus.")


if __name__ == "__main__":
    run_seeds()
