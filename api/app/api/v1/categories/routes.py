import uuid

from flask import Blueprint, g, request

from app.api.responses import success
from app.schemas.categories import CategorySchema, CategoryUpdateSchema
from app.services.categories import CategoryService, serialize_category
from app.utils.security import auth_required

categories = Blueprint("categories", __name__)


@categories.get("")
@auth_required()
def list_categories():
    items = CategoryService().list_for(g.current_user)
    return success([serialize_category(item) for item in items])


@categories.post("")
@auth_required()
def create_category():
    values = CategorySchema().load(request.get_json(silent=True) or {})
    category = CategoryService().create(g.current_user, values)
    return success(serialize_category(category), status=201)


@categories.patch("/<uuid:category_id>")
@auth_required()
def update_category(category_id: uuid.UUID):
    values = CategoryUpdateSchema().load(request.get_json(silent=True) or {})
    category = CategoryService().update(g.current_user, category_id, values)
    return success(serialize_category(category))


@categories.delete("/<uuid:category_id>")
@auth_required()
def delete_category(category_id: uuid.UUID):
    CategoryService().deactivate(g.current_user, category_id)
    return success({"deleted": True})
