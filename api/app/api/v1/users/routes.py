from flask import Blueprint, g, request

from app.api.responses import success
from app.schemas.users import ProfileUpdateSchema
from app.services.users import serialize_user, update_profile
from app.utils.security import auth_required

users = Blueprint("users", __name__)


@users.get("/me")
@auth_required(allow_unverified=True)
def get_profile():
    return success(serialize_user(g.current_user))


@users.patch("/me")
@auth_required()
def patch_profile():
    changes = ProfileUpdateSchema().load(request.get_json(silent=True) or {})
    return success(serialize_user(update_profile(g.current_user, changes)))
