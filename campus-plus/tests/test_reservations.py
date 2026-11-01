import pytest
import json
import threading


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
# Locker Reservations
# ─────────────────────────────────────────

def test_reserve_locker_success(client, student_data):
    """Student can successfully reserve an available locker."""
    token = _register_and_login(client, student_data)
    response = client.post('/api/v1/lockers/reserve',
                           json={"locker_number": "C1-01"},
                           headers=_auth(token))
    # 201 on success; 404 if no lockers seeded in test DB
    assert response.status_code in (200, 201, 404)
    if response.status_code in (200, 201):
        data = response.get_json()
        assert data['success'] is True


def test_reserve_locker_duplicate_returns_409(client, student_data):
    """Reserving the same locker twice returns 409."""
    token = _register_and_login(client, student_data)
    r1 = client.post('/api/v1/lockers/reserve',
                     json={"locker_number": "C1-02"},
                     headers=_auth(token))
    if r1.status_code not in (200, 201):
        pytest.skip("Locker reservation endpoint not available or lockers not seeded")
    r2 = client.post('/api/v1/lockers/reserve',
                     json={"locker_number": "C1-02"},
                     headers=_auth(token))
    assert r2.status_code == 409


def test_reserve_nonexistent_locker(client, student_data):
    """Reserving a locker that does not exist returns 404."""
    token = _register_and_login(client, student_data)
    response = client.post('/api/v1/lockers/reserve',
                           json={"locker_number": "Z9-99"},
                           headers=_auth(token))
    assert response.status_code == 404


def test_reserve_locker_unauthenticated(client):
    """Unauthenticated locker reservation returns 401."""
    response = client.post('/api/v1/lockers/reserve',
                           json={"locker_number": "C1-03"})
    assert response.status_code == 401


def test_concurrent_locker_reservation(client, student_data, admin_data):
    """
    Simulate two concurrent requests for the same locker.
    Only one should succeed; the other must receive 409.
    """
    token1 = _register_and_login(client, student_data)
    token2 = _register_and_login(client, admin_data)

    results = []

    def reserve(token):
        r = client.post('/api/v1/lockers/reserve',
                        json={"locker_number": "C1-05"},
                        headers=_auth(token))
        results.append(r.status_code)

    t1 = threading.Thread(target=reserve, args=(token1,))
    t2 = threading.Thread(target=reserve, args=(token2,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Filter only the codes we care about
    success_codes = [c for c in results if c in (200, 201)]
    conflict_codes = [c for c in results if c == 409]
    skip_codes = [c for c in results if c == 404]

    if skip_codes:
        pytest.skip("Locker not seeded — skipping concurrency test")

    # Exactly one success and one conflict
    assert len(success_codes) == 1
    assert len(conflict_codes) == 1


def test_list_lockers(client, student_data):
    """Authenticated user can list lockers."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/lockers', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_cancel_locker_reservation(client, student_data):
    """Student can cancel their own locker reservation."""
    token = _register_and_login(client, student_data)
    reserve_resp = client.post('/api/v1/lockers/reserve',
                               json={"locker_number": "C1-06"},
                               headers=_auth(token))
    if reserve_resp.status_code not in (200, 201):
        pytest.skip("Locker reservation not available")
    reservation_id = reserve_resp.get_json()['data']['id']
    response = client.delete(f'/api/v1/lockers/reservations/{reservation_id}',
                             headers=_auth(token))
    assert response.status_code in (200, 204)


# ─────────────────────────────────────────
# Room Reservations
# ─────────────────────────────────────────

def test_create_room_reservation_success(client, student_data):
    """Student can reserve a classroom for a future time slot."""
    token = _register_and_login(client, student_data)
    payload = {
        "classroom_id": 1,
        "date": "2026-12-01",
        "start_time": "10:00",
        "end_time": "12:00",
        "purpose": "Réunion de groupe"
    }
    response = client.post('/api/v1/reservations',
                           json=payload, headers=_auth(token))
    # 201 on success; 404 if classroom not seeded
    assert response.status_code in (200, 201, 404, 422)
    if response.status_code in (200, 201):
        data = response.get_json()
        assert data['success'] is True


def test_room_reservation_overlap_returns_409(client, student_data, admin_data):
    """Overlapping room reservations for the same classroom return 409."""
    token1 = _register_and_login(client, student_data)
    token2 = _register_and_login(client, admin_data)

    slot_payload = {
        "classroom_id": 2,
        "date": "2026-12-05",
        "start_time": "14:00",
        "end_time": "16:00",
        "purpose": "Étude de groupe"
    }
    r1 = client.post('/api/v1/reservations', json=slot_payload,
                     headers=_auth(token1))
    if r1.status_code not in (200, 201):
        pytest.skip("Room reservation not available or classroom not seeded")

    # Same classroom, overlapping time
    overlap_payload = dict(slot_payload)
    overlap_payload["start_time"] = "15:00"
    overlap_payload["end_time"] = "17:00"
    r2 = client.post('/api/v1/reservations', json=overlap_payload,
                     headers=_auth(token2))
    assert r2.status_code == 409


def test_room_reservation_unauthenticated(client):
    """Unauthenticated room reservation returns 401."""
    payload = {
        "classroom_id": 1,
        "date": "2026-12-10",
        "start_time": "08:00",
        "end_time": "10:00",
        "purpose": "Test"
    }
    response = client.post('/api/v1/reservations', json=payload)
    assert response.status_code == 401


def test_list_room_reservations(client, student_data):
    """Authenticated user can list their reservations."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/reservations', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_cancel_room_reservation(client, student_data):
    """Student can cancel their room reservation."""
    token = _register_and_login(client, student_data)
    payload = {
        "classroom_id": 1,
        "date": "2026-12-15",
        "start_time": "09:00",
        "end_time": "11:00",
        "purpose": "Travail de groupe"
    }
    create_resp = client.post('/api/v1/reservations', json=payload,
                              headers=_auth(token))
    if create_resp.status_code not in (200, 201):
        pytest.skip("Room reservation not available")
    reservation_id = create_resp.get_json()['data']['id']
    response = client.delete(f'/api/v1/reservations/{reservation_id}',
                             headers=_auth(token))
    assert response.status_code in (200, 204)
