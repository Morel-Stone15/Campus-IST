"""
Building, Location, and Classroom models.
"""

from app import db


class Building(db.Model):
    __tablename__ = "buildings"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    floors = db.Column(db.Integer, nullable=True)

    # ── GPS / OpenStreetMap ───────────────────────────────────────────────────
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.String(500), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    locations = db.relationship("Location", back_populates="building")
    lockers = db.relationship("Locker", back_populates="building")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "floors": self.floors,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "image_url": self.image_url,
            "is_active": self.is_active,
        }

    def __repr__(self) -> str:
        return f"<Building {self.code}: {self.name}>"


class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location_type = db.Column(
        db.Enum(
            "building",
            "classroom",
            "restaurant",
            "library",
            "infirmary",
            "admin",
            "playground",
            "locker_area",
            "outdoor",
            name="location_type_enum",
        ),
        nullable=False,
    )
    building_id = db.Column(
        db.Integer, db.ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True
    )
    floor = db.Column(db.Integer, nullable=True)
    room_number = db.Column(db.String(20), nullable=True)

    # ── Coordinates ───────────────────────────────────────────────────────────
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # ── Accessibility ─────────────────────────────────────────────────────────
    is_accessible = db.Column(db.Boolean, nullable=False, default=False)  # wheelchair
    image_url = db.Column(db.String(500), nullable=True)
    osm_node_id = db.Column(db.BigInteger, nullable=True)  # OpenStreetMap node

    # ── Relationships ─────────────────────────────────────────────────────────
    building = db.relationship("Building", back_populates="locations")
    classrooms = db.relationship("Classroom", back_populates="location")
    services = db.relationship("Service", back_populates="location")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location_type": self.location_type,
            "building_id": self.building_id,
            "floor": self.floor,
            "room_number": self.room_number,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "is_accessible": self.is_accessible,
            "image_url": self.image_url,
            "osm_node_id": self.osm_node_id,
        }

    def __repr__(self) -> str:
        return f"<Location {self.id}: {self.name}>"


class Classroom(db.Model):
    __tablename__ = "classrooms"

    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(
        db.Integer, db.ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    capacity = db.Column(db.Integer, nullable=True)
    room_type = db.Column(
        db.Enum(
            "lecture_hall",
            "lab",
            "seminar",
            "amphitheater",
            "computer_lab",
            name="room_type_enum",
        ),
        nullable=False,
        default="lecture_hall",
    )

    # ── Equipment flags ───────────────────────────────────────────────────────
    has_projector = db.Column(db.Boolean, nullable=False, default=False)
    has_whiteboard = db.Column(db.Boolean, nullable=False, default=False)
    has_ac = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    location = db.relationship("Location", back_populates="classrooms")
    schedules = db.relationship("Schedule", back_populates="classroom")
    room_reservations = db.relationship("RoomReservation", back_populates="classroom")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "location_id": self.location_id,
            "name": self.name,
            "code": self.code,
            "capacity": self.capacity,
            "room_type": self.room_type,
            "has_projector": self.has_projector,
            "has_whiteboard": self.has_whiteboard,
            "has_ac": self.has_ac,
            "is_active": self.is_active,
        }

    def __repr__(self) -> str:
        return f"<Classroom {self.code}: {self.name}>"
