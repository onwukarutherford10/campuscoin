import json
import uuid

from flask import Blueprint, Response, g, request

from app.api.responses import success
from app.services.imports import ImportService, serialize_import
from app.services.transactions import LedgerError
from app.utils.security import auth_required

imports = Blueprint("transaction_imports", __name__)


@imports.post("/preview")
@auth_required()
def preview_import():
    if "file" in request.files:
        uploaded = request.files["file"]
        try:
            content = uploaded.read().decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise LedgerError("invalid_csv_encoding", "CSV must use UTF-8 encoding") from exc
        mapping_raw = request.form.get("mapping")
        try:
            mapping = json.loads(mapping_raw) if mapping_raw else None
        except json.JSONDecodeError as exc:
            raise LedgerError("invalid_mapping", "mapping must be valid JSON") from exc
        filename = uploaded.filename or "import.csv"
    else:
        payload = request.get_json(silent=True) or {}
        content = payload.get("csv", "")
        mapping = payload.get("mapping")
        filename = payload.get("filename", "import.csv")
    batch = ImportService().preview(g.current_user, content, filename, mapping)
    return success(serialize_import(batch), status=201)


@imports.post("/<uuid:import_id>/confirm")
@auth_required()
def confirm_import(import_id: uuid.UUID):
    payload = request.get_json(silent=True) or {}
    result = ImportService().confirm(
        g.current_user, import_id, include_duplicates=bool(payload.get("include_duplicates", False))
    )
    return success(result, status=202 if result["status"] == "pending" else 200)


@imports.get("/<uuid:import_id>/errors")
@auth_required()
def import_errors(import_id: uuid.UUID):
    batch = ImportService().get(g.current_user, import_id)
    if not batch.error_csv:
        raise LedgerError("no_import_errors", "This import has no row errors", 404)
    return Response(
        batch.error_csv,
        mimetype="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{batch.id}-errors.csv"',
        },
    )
