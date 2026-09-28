from datetime import datetime
from zoneinfo import ZoneInfo

from flask import Blueprint, g

from app.api.responses import success
from app.services.planning import PlanningService
from app.utils.security import auth_required

tips = Blueprint("tips", __name__)


@tips.get("")
@auth_required()
def list_tips():
    now = datetime.now(ZoneInfo(g.current_user.timezone))
    return success(PlanningService().tips(g.current_user, now.year, now.month))


@tips.post("/<path:key>/pin")
@auth_required()
def pin_tip(key):
    return success(PlanningService().tip_action(g.current_user, key, "pin"))


@tips.post("/<path:key>/bookmark")
@auth_required()
def bookmark_tip(key):
    return success(PlanningService().tip_action(g.current_user, key, "bookmark"))


@tips.post("/<path:key>/dismiss")
@auth_required()
def dismiss_tip(key):
    return success(PlanningService().tip_action(g.current_user, key, "dismiss"))
