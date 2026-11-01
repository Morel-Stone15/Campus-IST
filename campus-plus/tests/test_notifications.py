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
# List Notifications
# ─────────────────────────────────────────

def test_list_own_notifications(client, student_data):
    """Authenticated user retrieves only their own notifications."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/notifications', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)


def test_list_notifications_unauthenticated(client):
    """Unauthenticated request returns 401."""
    response = client.get('/api/v1/notifications')
    assert response.status_code == 401


def test_list_notifications_paginated(client, student_data):
    """Notification list supports pagination."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/notifications?page=1&per_page=10',
                          headers=_auth(token))
    assert response.status_code == 200


def test_notifications_belong_to_current_user(client, student_data, admin_data):
    """Notifications returned belong only to the requesting user."""
    student_token = _register_and_login(client, student_data)
    admin_token = _register_and_login(client, admin_data)

    student_resp = client.get('/api/v1/notifications', headers=_auth(student_token))
    admin_resp = client.get('/api/v1/notifications', headers=_auth(admin_token))

    assert student_resp.status_code == 200
    assert admin_resp.status_code == 200
    # Notifications for distinct users must not share the same set
    # (They could both be empty in a clean test DB, which is also valid)
    s_ids = {n['id'] for n in student_resp.get_json()['data']}
    a_ids = {n['id'] for n in admin_resp.get_json()['data']}
    assert s_ids.isdisjoint(a_ids) or (not s_ids and not a_ids)


# ─────────────────────────────────────────
# Unread Count
# ─────────────────────────────────────────

def test_get_unread_count(client, student_data):
    """Unread notification count endpoint returns a non-negative integer."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/notifications/unread-count',
                          headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['data']['count'], int)
    assert data['data']['count'] >= 0


def test_get_unread_count_unauthenticated(client):
    """Unauthenticated request for unread count returns 401."""
    response = client.get('/api/v1/notifications/unread-count')
    assert response.status_code == 401


# ─────────────────────────────────────────
# Mark Single Notification as Read
# ─────────────────────────────────────────

def test_mark_notification_as_read(client, student_data, admin_data):
    """
    Mark a specific notification as read.
    We first create a notification via the admin broadcast, then mark it read.
    """
    admin_token = _register_and_login(client, admin_data)
    student_token = _register_and_login(client, student_data)

    # Admin broadcasts a notification to all users (if endpoint exists)
    broadcast_payload = {
        "title": "Test Notification",
        "message": "This is a test notification",
        "notification_type": "info",
        "target": "all"
    }
    broadcast_resp = client.post('/api/v1/notifications/broadcast',
                                 json=broadcast_payload,
                                 headers=_auth(admin_token))

    # Fetch student's notifications
    list_resp = client.get('/api/v1/notifications', headers=_auth(student_token))
    notifications = list_resp.get_json()['data']

    if not notifications:
        pytest.skip("No notifications available in test environment")

    notif_id = notifications[0]['id']
    response = client.put(f'/api/v1/notifications/{notif_id}/read',
                          headers=_auth(student_token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_mark_nonexistent_notification_as_read(client, student_data):
    """Marking a non-existent notification as read returns 404."""
    token = _register_and_login(client, student_data)
    response = client.put('/api/v1/notifications/99999/read',
                          headers=_auth(token))
    assert response.status_code == 404


def test_mark_other_users_notification_as_read(client, student_data, admin_data):
    """A user cannot mark another user's notification as read (403 or 404)."""
    admin_token = _register_and_login(client, admin_data)
    student_token = _register_and_login(client, student_data)

    # Fetch admin's notifications
    admin_notifs = client.get('/api/v1/notifications',
                              headers=_auth(admin_token)).get_json()['data']
    if not admin_notifs:
        pytest.skip("No admin notifications in test environment")

    admin_notif_id = admin_notifs[0]['id']
    # Student tries to mark admin's notification
    response = client.put(f'/api/v1/notifications/{admin_notif_id}/read',
                          headers=_auth(student_token))
    assert response.status_code in (403, 404)


# ─────────────────────────────────────────
# Mark All Notifications as Read
# ─────────────────────────────────────────

def test_mark_all_notifications_read(client, student_data):
    """Mark all notifications for current user as read."""
    token = _register_and_login(client, student_data)
    response = client.put('/api/v1/notifications/read-all', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_mark_all_read_unauthenticated(client):
    """Unauthenticated mark-all-read returns 401."""
    response = client.put('/api/v1/notifications/read-all')
    assert response.status_code == 401


def test_unread_count_is_zero_after_mark_all_read(client, student_data):
    """After marking all as read, unread count should be 0."""
    token = _register_and_login(client, student_data)
    client.put('/api/v1/notifications/read-all', headers=_auth(token))
    response = client.get('/api/v1/notifications/unread-count',
                          headers=_auth(token))
    data = response.get_json()
    assert response.status_code == 200
    assert data['data']['count'] == 0
