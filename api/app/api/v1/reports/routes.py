import uuid
from datetime import datetime

from flask import Blueprint, g, request

from app.api.responses import success
from app.services.planning import PlanningService
from app.services.reports import ReportService
from app.services.transactions import LedgerError
from app.utils.security import auth_required

reports = Blueprint("reports", __name__)
dashboard = Blueprint("dashboard", __name__)


def _options(values):
    def date(name):
        raw = values.get(name)
        if not raw:
            return None
        try:
            value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError as exc:
            raise LedgerError("invalid_period", f"{name} must be ISO-8601") from exc
        if value.tzinfo is None:
            raise LedgerError("invalid_period", f"{name} must include a timezone")
        return value

    try:
        return {
            "period": values.get("period", "monthly"),
            "year": int(values["year"]) if values.get("year") else None,
            "month": int(values["month"]) if values.get("month") else None,
            "start": date("start"),
            "end": date("end"),
            "category_id": uuid.UUID(values["category_id"]) if values.get("category_id") else None,
        }
    except (ValueError, TypeError) as exc:
        raise LedgerError("invalid_filter", "Invalid report filter") from exc


@reports.get("")
@auth_required()
def get_report():
    return success(PlanningService().report(g.current_user, **_options(request.args)))


@dashboard.get("")
@auth_required()
def get_dashboard():
    return success(PlanningService().dashboard(g.current_user))


@reports.post("/exports")
@auth_required()
def create_export():
    values = request.get_json(silent=True) or {}
    return ReportService().create_export(
        g.current_user, _options(values), values.get("format", "pdf")
    )


@reports.get("/exports/<uuid:export_id>")
@auth_required()
def download_export(export_id: uuid.UUID):
    return ReportService().download(g.current_user, export_id)
