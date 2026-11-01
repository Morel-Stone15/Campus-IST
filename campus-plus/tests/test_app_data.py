"""Tests for authenticated shared application data persistence."""


def _login(client, user):
    client.post("/api/v1/auth/register", json=user)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    token = response.get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_shared_data_requires_authentication(client):
    response = client.get("/api/v1/app-data")
    assert response.status_code == 401


def test_admin_bootstraps_and_updates_shared_data(client, admin_data):
    headers = _login(client, admin_data)
    initial = {
        "announcements": [{"id": "announcement-1", "title": "Bienvenue"}],
        "identity": {"history": "Présentation de l'IST"},
    }

    created = client.post(
        "/api/v1/app-data/bootstrap",
        json={"collections": initial},
        headers=headers,
    )
    assert created.status_code == 201

    update = client.put(
        "/api/v1/app-data/announcements",
        json=[{"id": "announcement-2", "title": "Rentrée"}],
        headers=headers,
    )
    assert update.status_code == 200

    loaded = client.get("/api/v1/app-data", headers=headers)
    data = loaded.get_json()["data"]
    assert data["initialized"] is True
    assert data["collections"]["announcements"][0]["title"] == "Rentrée"
    assert data["collections"]["identity"]["history"] == "Présentation de l'IST"


def test_student_cannot_modify_shared_content(client, student_data):
    headers = _login(client, student_data)
    response = client.put(
        "/api/v1/app-data/announcements",
        json=[{"id": "forbidden", "title": "Non autorisé"}],
        headers=headers,
    )
    assert response.status_code == 403


def test_bootstrap_can_only_run_once(client, admin_data):
    headers = _login(client, admin_data)
    payload = {"collections": {"announcements": []}}

    assert client.post("/api/v1/app-data/bootstrap", json=payload, headers=headers).status_code == 201
    assert client.post("/api/v1/app-data/bootstrap", json=payload, headers=headers).status_code == 409


def test_debug_mode_does_not_allow_privileged_self_registration(client, admin_data, monkeypatch):
    monkeypatch.setitem(client.application.config, "TESTING", False)
    monkeypatch.setitem(client.application.config, "DEBUG", True)
    response = client.post("/api/v1/auth/register", json=admin_data)
    assert response.status_code == 403
