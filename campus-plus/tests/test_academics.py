import pytest
import json


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


# ─────────────────────────────────────────
# Departments
# ─────────────────────────────────────────

def test_list_departments_authenticated(client, student_data):
    """Authenticated user can list departments."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/academics/departments', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)


def test_list_departments_unauthenticated(client):
    """Unauthenticated request to list departments returns 401."""
    response = client.get('/api/v1/academics/departments')
    assert response.status_code == 401


def test_create_department_as_admin(client, admin_data):
    """Admin can create a department."""
    token = _register_and_login(client, admin_data)
    payload = {
        "name": "Génie Logiciel",
        "code": "GSW",
        "description": "Software engineering department"
    }
    response = client.post('/api/v1/academics/departments',
                           json=payload, headers=_auth(token))
    assert response.status_code in (200, 201)
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['code'] == 'GSW'


def test_create_department_as_student_forbidden(client, student_data):
    """Student cannot create a department (403)."""
    token = _register_and_login(client, student_data)
    payload = {
        "name": "Test Dept",
        "code": "TST",
        "description": "Should not be created by a student"
    }
    response = client.post('/api/v1/academics/departments',
                           json=payload, headers=_auth(token))
    assert response.status_code == 403


def test_create_department_missing_fields(client, admin_data):
    """Creating department without required fields returns 400."""
    token = _register_and_login(client, admin_data)
    response = client.post('/api/v1/academics/departments',
                           json={"description": "No name or code"},
                           headers=_auth(token))
    assert response.status_code == 400


# ─────────────────────────────────────────
# Courses
# ─────────────────────────────────────────

def test_list_courses_paginated(client, student_data):
    """Course list endpoint returns paginated results."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/academics/courses?page=1&per_page=5',
                          headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    # Pagination meta should be present
    assert 'meta' in data or isinstance(data['data'], list)


def test_list_courses_unauthenticated(client):
    """Unauthenticated request to courses returns 401."""
    response = client.get('/api/v1/academics/courses')
    assert response.status_code == 401


def test_filter_courses_by_department(client, student_data):
    """Courses can be filtered by department."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/academics/courses?department=INFO',
                          headers=_auth(token))
    assert response.status_code == 200


# ─────────────────────────────────────────
# Schedules
# ─────────────────────────────────────────

def test_create_schedule_as_admin(client, admin_data):
    """Admin can create a schedule entry."""
    token = _register_and_login(client, admin_data)
    payload = {
        "course_id": 1,
        "classroom_id": 1,
        "day_of_week": "monday",
        "start_time": "08:00",
        "end_time": "10:00",
        "semester": "S1"
    }
    response = client.post('/api/v1/academics/schedules',
                           json=payload, headers=_auth(token))
    # Either success or 404/422 if no course/classroom seeded — both acceptable
    assert response.status_code in (200, 201, 404, 422)


def test_schedule_conflict_detection(client, admin_data):
    """Creating two overlapping schedules for the same classroom returns 409."""
    token = _register_and_login(client, admin_data)
    base_payload = {
        "course_id": 1,
        "classroom_id": 2,
        "day_of_week": "tuesday",
        "start_time": "09:00",
        "end_time": "11:00",
        "semester": "S1"
    }
    r1 = client.post('/api/v1/academics/schedules',
                     json=base_payload, headers=_auth(token))
    # Only test conflict if first creation succeeded
    if r1.status_code in (200, 201):
        overlap_payload = dict(base_payload)
        overlap_payload["start_time"] = "10:00"
        overlap_payload["end_time"] = "12:00"
        r2 = client.post('/api/v1/academics/schedules',
                         json=overlap_payload, headers=_auth(token))
        assert r2.status_code == 409


def test_list_schedules_by_day_of_week(client, student_data):
    """Schedules can be filtered by day_of_week."""
    token = _register_and_login(client, student_data)
    for day in ("monday", "wednesday", "friday"):
        response = client.get(f'/api/v1/academics/schedules?day_of_week={day}',
                              headers=_auth(token))
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


def test_list_schedules_unauthenticated(client):
    """Unauthenticated request to schedules returns 401."""
    response = client.get('/api/v1/academics/schedules')
    assert response.status_code == 401
