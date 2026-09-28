def test_swagger_ui_and_openapi_spec(client):
    page = client.get("/api/docs")
    assert page.status_code == 200
    assert b"SwaggerUIBundle" in page.data
    assert b"/api/openapi.yaml" in page.data
    assert b'(request.method || "GET").toUpperCase()' in page.data

    specification = client.get("/api/openapi.yaml")
    assert specification.status_code == 200
    assert specification.mimetype == "application/yaml"
    assert b"openapi: 3.0.3" in specification.data
    assert b"/admin/usage:" in specification.data
