import pytest

from app.models.user import User
from render_start import initialize_production_database


def configure_render_environment(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://render.example/campus")
    monkeypatch.setenv("SECRET_KEY", "s" * 40)
    monkeypatch.setenv("JWT_SECRET_KEY", "j" * 40)
    monkeypatch.setenv("INITIAL_ADMIN_EMAIL", "first-admin@ist.edu")
    monkeypatch.setenv("INITIAL_ADMIN_PASSWORD", "SecureAdminPass123")


def test_render_start_creates_admin_once(app, monkeypatch):
    configure_render_environment(monkeypatch)

    initialize_production_database(app)
    initialize_production_database(app)

    user = User.query.filter_by(email="first-admin@ist.edu").one()
    assert user.role == "admin"
    assert user.check_password("SecureAdminPass123")


def test_render_start_rejects_short_admin_password(app, monkeypatch):
    configure_render_environment(monkeypatch)
    monkeypatch.setenv("INITIAL_ADMIN_PASSWORD", "short")

    with pytest.raises(RuntimeError, match="at least 12 characters"):
        initialize_production_database(app)
