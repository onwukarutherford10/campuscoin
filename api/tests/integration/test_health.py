def test_health_uses_success_contract(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"data": {"status": "healthy"}, "meta": {}}


def test_readiness_checks_database(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.get_json()["data"]["checks"] == {"database": "ok"}


def test_api_index_is_versioned(client):
    response = client.get("/api/v1")
    assert response.status_code == 200
    assert response.get_json()["data"]["version"] == "v1"


def test_http_errors_use_failure_contract(client):
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
