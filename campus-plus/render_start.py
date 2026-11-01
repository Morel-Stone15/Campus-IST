"""Initialize the production database and start the Render web service."""

import os
import secrets


def initialize_production_database(flask_app=None) -> None:
    """Create the initial schema and a configured administrator once."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise RuntimeError("Render must provide a PostgreSQL DATABASE_URL.")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = database_url
    if not database_url.startswith("postgresql://"):
        raise RuntimeError("DATABASE_URL must point to a PostgreSQL database.")

    for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
        if len(os.environ.get(key, "")) < 32:
            raise RuntimeError(f"Set a random {key} of at least 32 characters in Render.")

    from app import create_app, db
    from app.models.user import User

    app = flask_app or create_app("production")
    with app.app_context():
        if not app.config["SQLALCHEMY_DATABASE_URI"]:
            raise RuntimeError("Render must provide a PostgreSQL DATABASE_URL.")

        email = os.environ.get("INITIAL_ADMIN_EMAIL", "").strip().lower()
        password = os.environ.get("INITIAL_ADMIN_PASSWORD", "")
        if not email or "@" not in email or len(email) > 254 or len(password) < 12:
            raise RuntimeError(
                "Set a valid INITIAL_ADMIN_EMAIL and an INITIAL_ADMIN_PASSWORD "
                "of at least 12 characters in Render."
            )

        db.create_all()

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            if existing_user.role != "admin":
                raise RuntimeError(
                    "INITIAL_ADMIN_EMAIL is already assigned to a non-admin account."
                )
            return

        admin = User(
            email=email,
            username=f"campus-admin-{secrets.token_hex(4)}",
            first_name="Administrateur",
            last_name="IST",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()


if __name__ == "__main__":
    initialize_production_database()
    port = os.environ.get("PORT", "10000")
    os.execvp(
        "gunicorn",
        ["gunicorn", "run:app", "--bind", f"0.0.0.0:{port}"],
    )
