import pytest
import json
from app import create_app
from app import db as _db

@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    app = create_app('testing')
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()

@pytest.fixture(scope='session')
def db(app):
    """Provide the database for testing."""
    return _db

@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture(scope='function', autouse=True)
def clean_db(app):
    """Clean all database tables before each test to guarantee test isolation."""
    with app.app_context():
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
    yield

@pytest.fixture(scope='function')
def db_session(db):
    """Create fresh database session for each test."""
    connection = db.engine.connect()
    transaction = connection.begin()
    session = db.session
    yield session
    session.close()
    transaction.rollback()
    connection.close()

# Helper fixtures
@pytest.fixture
def student_data():
    return {
        "email": "etudiant@ist.edu",
        "username": "etudiant01",
        "password": "TestPass123!",
        "first_name": "Jean",
        "last_name": "Dupont",
        "role": "student",
        "student_number": "IST2025001"
    }

@pytest.fixture
def teacher_data():
    return {
        "email": "prof@ist.edu",
        "username": "prof01",
        "password": "TeachPass123!",
        "first_name": "Marie",
        "last_name": "Martin",
        "role": "teacher",
        "teacher_number": "PROF001",
        "specialization": "Informatique"
    }

@pytest.fixture
def admin_data():
    return {
        "email": "admin@ist.edu",
        "username": "admin01",
        "password": "AdminPass123!",
        "first_name": "Admin",
        "last_name": "IST",
        "role": "admin"
    }

def get_token(client, email, password):
    """Helper to get JWT token."""
    response = client.post('/api/v1/auth/login',
                          json={"email": email, "password": password})
    return response.get_json()['data']['access_token']
