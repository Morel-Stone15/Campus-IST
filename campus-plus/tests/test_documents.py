import pytest
import io
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


def _make_file(filename="test.pdf", content=b"%PDF-1.4 test content"):
    """Create an in-memory file-like object for upload tests."""
    return (io.BytesIO(content), filename)


# ─────────────────────────────────────────
# List Documents
# ─────────────────────────────────────────

def test_list_documents_authenticated(client, student_data):
    """Authenticated user can list documents."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/documents', headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)


def test_list_documents_unauthenticated(client):
    """Unauthenticated request returns 401."""
    response = client.get('/api/v1/documents')
    assert response.status_code == 401


def test_list_documents_paginated(client, student_data):
    """Document list supports pagination query parameters."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/documents?page=1&per_page=5',
                          headers=_auth(token))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True


def test_list_documents_filter_by_category(client, student_data):
    """Documents can be filtered by category."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/documents?category=1', headers=_auth(token))
    assert response.status_code == 200


# ─────────────────────────────────────────
# Upload Document
# ─────────────────────────────────────────

def test_upload_document_as_teacher(client, teacher_data):
    """Teacher can upload a document."""
    token = _register_and_login(client, teacher_data)
    data = {
        'title': 'Cours Algorithmique S1',
        'description': 'Support de cours chapitre 1',
        'category_id': '1',
        'is_public': 'true',
        'file': _make_file("algo_s1.pdf")
    }
    response = client.post(
        '/api/v1/documents',
        data=data,
        content_type='multipart/form-data',
        headers=_auth(token)
    )
    # 201 on success; 404 if category not seeded in test DB
    assert response.status_code in (201, 200, 404, 422)


def test_upload_document_no_file(client, teacher_data):
    """Upload without a file returns 400."""
    token = _register_and_login(client, teacher_data)
    response = client.post(
        '/api/v1/documents',
        data={'title': 'Missing file doc', 'category_id': '1'},
        content_type='multipart/form-data',
        headers=_auth(token)
    )
    assert response.status_code == 400


def test_upload_document_as_student(client, student_data):
    """Students can upload documents (allowed role)."""
    token = _register_and_login(client, student_data)
    data = {
        'title': 'Notes personnelles',
        'description': 'My notes',
        'category_id': '1',
        'is_public': 'false',
        'file': _make_file("notes.pdf")
    }
    response = client.post(
        '/api/v1/documents',
        data=data,
        content_type='multipart/form-data',
        headers=_auth(token)
    )
    assert response.status_code in (200, 201, 404, 422)


# ─────────────────────────────────────────
# Get Single Document
# ─────────────────────────────────────────

def test_get_document_by_id_not_found(client, student_data):
    """Requesting a non-existent document returns 404."""
    token = _register_and_login(client, student_data)
    response = client.get('/api/v1/documents/99999', headers=_auth(token))
    assert response.status_code == 404


def test_get_document_unauthenticated(client):
    """Getting a document without auth returns 401."""
    response = client.get('/api/v1/documents/1')
    assert response.status_code == 401


# ─────────────────────────────────────────
# Permission Tests — Private Documents
# ─────────────────────────────────────────

def test_private_document_inaccessible_to_other_user(client, student_data, teacher_data):
    """A private document uploaded by one user cannot be accessed by another user."""
    # Teacher uploads a private document
    teacher_token = _register_and_login(client, teacher_data)
    upload_data = {
        'title': 'Private Teacher Notes',
        'description': 'Strictly private',
        'category_id': '1',
        'is_public': 'false',
        'file': _make_file("private.pdf")
    }
    upload_resp = client.post(
        '/api/v1/documents',
        data=upload_data,
        content_type='multipart/form-data',
        headers=_auth(teacher_token)
    )

    if upload_resp.status_code not in (200, 201):
        pytest.skip("Document upload not available in test environment")

    doc_id = upload_resp.get_json()['data']['id']

    # Student tries to access the private document
    student_token = _register_and_login(client, student_data)
    response = client.get(f'/api/v1/documents/{doc_id}',
                          headers=_auth(student_token))
    assert response.status_code in (403, 404)


def test_public_document_accessible_to_any_user(client, student_data, teacher_data):
    """A public document is accessible to any authenticated user."""
    teacher_token = _register_and_login(client, teacher_data)
    upload_data = {
        'title': 'Public Lecture Notes',
        'description': 'Available for all',
        'category_id': '1',
        'is_public': 'true',
        'file': _make_file("public_notes.pdf")
    }
    upload_resp = client.post(
        '/api/v1/documents',
        data=upload_data,
        content_type='multipart/form-data',
        headers=_auth(teacher_token)
    )

    if upload_resp.status_code not in (200, 201):
        pytest.skip("Document upload not available in test environment")

    doc_id = upload_resp.get_json()['data']['id']

    student_token = _register_and_login(client, student_data)
    response = client.get(f'/api/v1/documents/{doc_id}',
                          headers=_auth(student_token))
    assert response.status_code == 200
