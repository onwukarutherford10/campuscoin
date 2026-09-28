from flask import Blueprint, current_app, g, request

from app.api.responses import success
from app.schemas.users import AvatarUpdateSchema, ProfileUpdateSchema
from app.services.cloudinary import create_avatar_upload
from app.services.rate_limit import check_rate_limit
from app.services.users import (
    attach_avatar,
    delete_account,
    remove_avatar,
    serialize_user,
    update_profile,
)
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


@users.post("/me/avatar/upload-signature")
@auth_required()
def avatar_upload_signature():
    check_rate_limit("avatar_upload", str(g.current_user.id))
    return success(create_avatar_upload(g.current_user.id))


@users.put("/me/avatar")
@auth_required()
def save_avatar():
    values = AvatarUpdateSchema().load(request.get_json(silent=True) or {})
    return success(serialize_user(attach_avatar(g.current_user, values["public_id"])))


@users.delete("/me/avatar")
@auth_required()
def delete_avatar():
    return success(serialize_user(remove_avatar(g.current_user)))


@users.delete("/me")
@auth_required()
def delete_current_account():
    delete_account(g.current_user)
    response, status = success({"deleted": True})
    for name in (
        current_app.config["ACCESS_COOKIE_NAME"],
        current_app.config["REFRESH_COOKIE_NAME"],
        current_app.config["CSRF_COOKIE_NAME"],
    ):
        response.delete_cookie(name, path="/")
    return response, status
