"""
Flask application configuration.
Loads settings from environment variables / .env file.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env from the project root (campus-plus/)
load_dotenv()


class BaseConfig:
    """Shared base configuration."""

    # ── Security ────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")

    # ── JWT ─────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES", 2592000))
    )
    JWT_TOKEN_LOCATION: list = ["headers"]
    JWT_HEADER_NAME: str = "Authorization"
    JWT_HEADER_TYPE: str = "Bearer"

    # ── SQLAlchemy ───────────────────────────────────────────────────────────
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # ── File uploads ─────────────────────────────────────────────────────────
    MAX_CONTENT_LENGTH: int = int(os.environ.get("MAX_CONTENT_LENGTH", 16_777_216))  # 16 MB
    UPLOAD_FOLDER: str = os.environ.get("UPLOAD_FOLDER", "app/uploads")
    ALLOWED_EXTENSIONS: set = set(
        os.environ.get("ALLOWED_EXTENSIONS", "pdf,png,jpg,jpeg,gif,mp3,wav").split(",")
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        # GitHub Pages frontend
        "https://morel-stone15.github.io",
    ]

    # ── Firebase ─────────────────────────────────────────────────────────────
    FIREBASE_CREDENTIALS: str = os.environ.get("FIREBASE_CREDENTIALS", "")

    # ── Pagination defaults ───────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100


class DevelopmentConfig(BaseConfig):
    """Development configuration – uses SQLite."""

    DEBUG: bool = True
    TESTING: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL", "sqlite:///campus.db"
    )
    SQLALCHEMY_ECHO: bool = False  # Set True to log all SQL statements


class ProductionConfig(BaseConfig):
    """Production configuration – expects a PostgreSQL DATABASE_URL env var."""

    DEBUG: bool = False
    TESTING: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL", "postgresql://user:password@localhost/campusdb"
    )
    # Tighten CORS in production – override via env if needed
    CORS_ORIGINS: list = os.environ.get(
        "CORS_ORIGINS",
        # GitHub Pages frontend + any custom domain
        "https://morel-stone15.github.io,https://campusplus.example.com"
    ).split(",")
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    }


class TestingConfig(BaseConfig):
    """Testing configuration – uses in-memory SQLite."""

    DEBUG: bool = True
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    WTF_CSRF_ENABLED: bool = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


# Mapping used by create_app()
config: dict = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
