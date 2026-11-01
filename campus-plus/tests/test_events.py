import pytest
import json
from datetime import datetime, timedelta


# ─────────────────────────────────────────
# Helper
# ─────────────────────────────────────────

def _register_and_login(client, data):
    """Register a user and return their JWT access token."""
    client.post('/api/v1/auth/register', json=data)
    resp = client.post('/api/v1/auth/login', json={
        "email": data["email"],
        "password": data["password"]
    })
    return resp.get_json()['data']['access_token']


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _future_event_payload(suffix=""):
    """Build a valid future event payload."""
    start = datetime.utcnow() + timedelta(days=10)
    end = start + timedelta(hours=3)
    return {
        "title": f"Test Event{suffix}",
        "description": "A test event for unit tests",
        "event_type": "internal",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "location": "Salle de Conférence",
        "is_public": True,
        "registration_required": True,
        "max_participants": 50,
        "status": "published"
    }


# ─────────────────────────────────────────
# List Events
# ─────────────────────────────────────────

def test_list_events_authenticated(client, student_data):
    """Authenticated user can list events."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/events', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)


def test_list_events_unauthenticated(client):
    """Public events may be listed without auth — or 401 if all protected."""
    response = client.get('/api/v1/events')
    assert response.status_code in (200, 401)


def test_list_events_filter_by_type(client, student_data):
    """Events can be filtered by event_type."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/events?event_type=conference',
                          headers=_auth(token))
    assert response.status_code == 200


def test_list_events_paginated(client, student_data):
    """Event list supports pagination."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/events?page=1&per_page=5',
                          headers=_auth(token))
    assert response.status_code == 200


# ─────────────────────────────────────────
# Create Event (Admin)
# ─────────────────────────────────────────

def test_create_event_as_admin(client, admin_data):
    """Admin can create an event."""
    token = _register_and_login(client, admin_data)
    response = client.post('/api/v1/events',
                           json=_future_event_payload(),
                           headers=_auth(token))
    assert response.status_code in (200, 201)
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['title'] == "Test Event"


def test_create_event_as_student_forbidden(client, student_data):
    """Student cannot create an event (403)."""
    token = _register_and_login(client, student_data)
    response = client.post('/api/v1/events',
                           json=_future_event_payload(),
                           headers=_auth(token))
    assert response.status_code == 403


def test_create_event_missing_fields(client, admin_data):
    """Creating event without required fields returns 400."""
    token = _register_and_login(client, admin_data)
    response = client.post('/api/v1/events',
                           json={"title": "Incomplete Event"},
                           headers=_auth(token))
    assert response.status_code == 400


# ─────────────────────────────────────────
# Event Registration
# ─────────────────────────────────────────

def _create_event(client, admin_token, max_participants=50, suffix=""):
    """Helper: admin creates an event and returns its id."""
    payload = _future_event_payload(suffix)
    payload["max_participants"] = max_participants
    resp = client.post('/api/v1/events', json=payload,
                       headers=_auth(admin_token))
    if resp.status_code not in (200, 201):
        return None
    return resp.get_json()['data']['id']


def test_student_registers_for_event(client, admin_data, student_data):
    """Student can register for a published event."""
    admin_token = _register_and_login(client, admin_data)
    event_id = _create_event(client, admin_token, suffix="_reg")
    if event_id is None:
        pytest.skip("Event creation not available")

    student_token = _register_and_login(client, student_data)
    response = client.post(f'/api/v1/events/{event_id}/register',
                           headers=_auth(student_token))
    assert response.status_code in (200, 201)
    data = response.get_json()
    assert data['success'] is True


def test_duplicate_registration_returns_409(client, admin_data, student_data):
    """Registering for the same event twice returns 409."""
    admin_token = _register_and_login(client, admin_data)
    event_id = _create_event(client, admin_token, suffix="_dup")
    if event_id is None:
        pytest.skip("Event creation not available")

    student_token = _register_and_login(client, student_data)
    client.post(f'/api/v1/events/{event_id}/register',
                headers=_auth(student_token))
    response = client.post(f'/api/v1/events/{event_id}/register',
                           headers=_auth(student_token))
    assert response.status_code == 409


def test_register_for_full_event_returns_409(client, admin_data, student_data, teacher_data):
    """Registering when event is full returns 409."""
    admin_token = _register_and_login(client, admin_data)
    # Create event with max 1 participant
    event_id = _create_event(client, admin_token, max_participants=1, suffix="_full")
    if event_id is None:
        pytest.skip("Event creation not available")

    # First user registers (fills the event)
    admin_me_resp = client.get('/api/v1/auth/me', headers=_auth(admin_token))
    # Register admin as first participant
    client.post(f'/api/v1/events/{event_id}/register', headers=_auth(admin_token))

    # Student tries to register but event is full
    student_token = _register_and_login(client, student_data)
    response = client.post(f'/api/v1/events/{event_id}/register',
                           headers=_auth(student_token))
    assert response.status_code == 409


def test_register_nonexistent_event(client, student_data):
    """Registering for a non-existent event returns 404."""
    token = _register_and_login(client, student_data)
    response = client.post('/api/v1/events/99999/register',
                           headers=_auth(token))
    assert response.status_code == 404


def test_cancel_registration(client, admin_data, student_data):
    """Student can cancel their event registration."""
    admin_token = _register_and_login(client, admin_data)
    event_id = _create_event(client, admin_token, suffix="_cancel")
    if event_id is None:
        pytest.skip("Event creation not available")

    student_token = _register_and_login(client, student_data)
    client.post(f'/api/v1/events/{event_id}/register',
                headers=_auth(student_token))
    response = client.delete(f'/api/v1/events/{event_id}/register',
                             headers=_auth(student_token))
    assert response.status_code in (200, 204)
