import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from flask import Blueprint, g, request

from app.api.responses import success
from app.extensions import db
from app.repositories.planning import PlanningRepository
from app.services.planning import PlanningService
from app.services.transactions import LedgerError
from app.utils.security import auth_required

budgets = Blueprint("budgets", __name__)


@budgets.get("")
@auth_required()
def list_budgets():
    now = datetime.now(ZoneInfo(g.current_user.timezone))
    return success(
        PlanningService().budget_list(
            g.current_user,
            request.args.get("year", now.year, type=int),
            request.args.get("month", now.month, type=int),
        )
    )


@budgets.post("")
@auth_required()
def upsert_budget():
    budget, created = PlanningService().budget_upsert(
        g.current_user, request.get_json(silent=True) or {}
    )
    rows = PlanningService().budget_list(g.current_user, budget.year, budget.month)
    return success(
        next(row for row in rows if row["id"] == str(budget.id)), status=201 if created else 200
    )


@budgets.delete("/<uuid:budget_id>")
@auth_required()
def delete_budget(budget_id: uuid.UUID):
    budget = PlanningRepository().budget(g.current_user.id, budget_id)
    if budget is None:
        raise LedgerError("not_found", "Budget not found", 404)
    db.session.delete(budget)
    db.session.commit()
    return success({"deleted": True})


@budgets.get("/<uuid:budget_id>")
@auth_required()
def get_budget(budget_id: uuid.UUID):
    budget = PlanningRepository().budget(g.current_user.id, budget_id)
    if budget is None:
        raise LedgerError("not_found", "Budget not found", 404)
    rows = PlanningService().budget_list(g.current_user, budget.year, budget.month)
    return success(next(row for row in rows if row["id"] == str(budget.id)))
