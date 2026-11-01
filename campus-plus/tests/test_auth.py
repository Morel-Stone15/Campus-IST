import pytest
import json


def test_register_student(client, student_data):
    """Test student registration."""
    response = client.post('/api/v1/auth/register', json=student_data)
    data = response.get_json()
    assert response.status_code == 201
    assert data['success'] is True
    assert 'access_token' in data['data']
    assert 'refresh_token' in data['data']


def test_register_duplicate_email(client, student_data):
    """Test duplicate email registration."""
    client.post('/api/v1/auth/register', json=student_data)
    response = client.post('/api/v1/auth/register', json=student_data)
    assert response.status_code == 409


def test_register_weak_password(client):
    """Test registration with weak password."""
    data = {
        "email": "test@ist.edu",
        "username": "testuser",
        "password": "weak",
        "first_name": "Test",
        "last_name": "User",
        "role": "student",
        "student_number": "IST2025002"
    }
    response = client.post('/api/v1/auth/register', json=data)
    assert response.status_code == 400


def test_login_success(client, student_data):
    """Test successful login."""
    client.post('/api/v1/auth/register', json=student_data)
    response = client.post('/api/v1/auth/login', json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    data = response.get_json()
    assert response.status_code == 200
    assert data['success'] is True
    assert 'access_token' in data['data']


def test_login_wrong_password(client, student_data):
    """Test login with wrong password."""
    client.post('/api/v1/auth/register', json=student_data)
    response = client.post('/api/v1/auth/login', json={
        "email": student_data["email"],
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    """Test login with non-existent user."""
    response = client.post('/api/v1/auth/login', json={
        "email": "nobody@ist.edu",
        "password": "somepassword"
    })
    assert response.status_code == 401


def test_get_profile_authenticated(client, student_data):
    """Test getting profile when authenticated."""
    client.post('/api/v1/auth/register', json=student_data)
    login_resp = client.post('/api/v1/auth/login', json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login_resp.get_json()['data']['access_token']
    response = client.get('/api/v1/auth/me',
                         headers={"Authorization": f"Bearer {token}"})
    data = response.get_json()
    assert response.status_code == 200
    assert data['data']['email'] == student_data['email']


def test_get_profile_unauthenticated(client):
    """Test getting profile without token."""
    response = client.get('/api/v1/auth/me')
    assert response.status_code == 401


def test_change_password(client, student_data):
    """Test password change."""
    client.post('/api/v1/auth/register', json=student_data)
    login_resp = client.post('/api/v1/auth/login', json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login_resp.get_json()['data']['access_token']
    response = client.put('/api/v1/auth/change-password',
                         json={
                             "current_password": student_data["password"],
                             "new_password": "NewPass123!"
                         },
                         headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_logout(client, student_data):
    """Test logout."""
    client.post('/api/v1/auth/register', json=student_data)
    login_resp = client.post('/api/v1/auth/login', json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login_resp.get_json()['data']['access_token']
    response = client.post('/api/v1/auth/logout',
                          headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_token_refresh(client, student_data):
    """Test token refresh."""
    client.post('/api/v1/auth/register', json=student_data)
    login_resp = client.post('/api/v1/auth/login', json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    refresh_token = login_resp.get_json()['data']['refresh_token']
    response = client.post('/api/v1/auth/refresh',
                          headers={"Authorization": f"Bearer {refresh_token}"})
    data = response.get_json()
    assert response.status_code == 200
    assert 'access_token' in data['data']
