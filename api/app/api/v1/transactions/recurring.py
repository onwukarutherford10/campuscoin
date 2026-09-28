import uuid

from flask import Blueprint, g, request

from app.api.responses import success
from app.schemas.transactions import RecurringRuleSchema, RecurringRuleUpdateSchema
from app.services.recurrence import RecurrenceService, serialize_rule
from app.utils.security import auth_required

recurring = Blueprint("recurring", __name__)


@recurring.get("")
@auth_required()
def list_rules():
    return success([serialize_rule(rule) for rule in RecurrenceService().list_for(g.current_user)])


@recurring.post("")
@auth_required()
def create_rule():
    values = RecurringRuleSchema().load(request.get_json(silent=True) or {})
    return success(serialize_rule(RecurrenceService().create(g.current_user, values)), status=201)


@recurring.patch("/<uuid:rule_id>")
@auth_required()
def update_rule(rule_id: uuid.UUID):
    values = RecurringRuleUpdateSchema().load(request.get_json(silent=True) or {})
    return success(serialize_rule(RecurrenceService().update(g.current_user, rule_id, values)))


@recurring.delete("/<uuid:rule_id>")
@auth_required()
def deactivate_rule(rule_id: uuid.UUID):
    RecurrenceService().deactivate(g.current_user, rule_id)
    return success({"deactivated": True})
