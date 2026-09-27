from pathlib import Path

from flask import Blueprint, Response, current_app, send_file

docs = Blueprint("docs", __name__)

SWAGGER_VERSION = "5.32.0"


@docs.get("/api/openapi.yaml")
def openapi_spec():
    source = Path(__file__).resolve().parents[2] / "openapi.yaml"
    if not source.is_file():
        source = Path(current_app.root_path) / "static" / "openapi.yaml"
    return send_file(source, mimetype="application/yaml")


@docs.get("/api/docs")
def swagger_ui():
    cdn = f"https://cdn.jsdelivr.net/npm/swagger-ui-dist@{SWAGGER_VERSION}"
    page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CampusCoin API · Swagger UI</title>
  <link rel="stylesheet" href="{cdn}/swagger-ui.css">
  <style>body {{ margin: 0; background: #f6f8f7; }} .topbar {{ display: none; }}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="{cdn}/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => window.ui = SwaggerUIBundle({{
      url: "/api/openapi.yaml",
      dom_id: "#swagger-ui",
      deepLinking: true,
      withCredentials: true,
      validatorUrl: null,
      presets: [SwaggerUIBundle.presets.apis],
      requestInterceptor: async (request) => {{
        request.credentials = "same-origin";
        if (["POST", "PUT", "PATCH", "DELETE"].includes((request.method || "GET").toUpperCase())) {{
          const response = await fetch("/api/v1/auth/csrf", {{ credentials: "same-origin" }});
          if (response.ok) {{
            const payload = await response.json();
            request.headers = request.headers || {{}};
            request.headers["X-CSRF-Token"] = payload.data.csrf_token;
          }}
        }}
        return request;
      }}
    }});
  </script>
</body>
</html>"""
    return Response(page, mimetype="text/html")
