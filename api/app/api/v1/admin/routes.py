import uuid

from flask import Blueprint, current_app, g, request
from sqlalchemy import func, select

from app.api.responses import success
from app.extensions import db
from app.models import Budget, Category, Job, Notification, Transaction, User
from app.repositories.auth import AuthRepository
from app.repositories.users import UserRepository
from app.schemas.auth import LoginSchema
from app.schemas.categories import CategorySchema, CategoryUpdateSchema
from app.schemas.system_content import SystemContentCreateSchema, SystemContentUpdateSchema
from app.services.audit import record_audit
from app.services.auth import AuthService
from app.services.categories import CategoryService, serialize_category
from app.services.system_content import SystemContentService, serialize_content
from app.services.users import serialize_user
from app.utils.security import auth_required
from app.utils.time import utcnow

admin = Blueprint("admin", __name__)


@admin.get("/usage")
@auth_required(admin=True)
def usage_statistics():
    def count(model):
        return db.session.scalar(select(func.count()).select_from(model))

    active_transactions = db.session.scalar(
        select(func.count()).select_from(Transaction).where(Transaction.deleted_at.is_(None))
    )
    return success(
        {
            "users": count(User),
            "active_users": db.session.scalar(
                select(func.count()).select_from(User).where(User.is_active.is_(True))
            ),
            "transactions": active_transactions,
            "total_transactions_logged": count(Transaction),
            "budgets": count(Budget),
            "notifications": count(Notification),
            "jobs": count(Job),
            "most_used_categories": [
                {"id": str(category_id), "name": name, "type": category_type, "transactions": total}
                for category_id, name, category_type, total in db.session.execute(
                    select(
                        Category.id,
                        Category.name,
                        Category.category_type,
                        func.count(Transaction.id).label("total"),
                    )
                    .join(Transaction, Transaction.category_id == Category.id)
                    .where(Transaction.deleted_at.is_(None))
                    .group_by(Category.id, Category.name, Category.category_type)
                    .order_by(func.count(Transaction.id).desc(), Category.name)
                    .limit(5)
                ).all()
            ],
        }
    )


@admin.get("/content")
@auth_required(admin=True)
def list_system_content():
    kind = request.args.get("kind")
    if kind not in (None, "announcement", "tip_template"):
        from app.api.responses import failure

        return failure("invalid_kind", "Unknown content kind", status=400)
    return success([serialize_content(item) for item in SystemContentService().list(kind)])


@admin.post("/content")
@auth_required(admin=True)
def create_system_content():
    values = SystemContentCreateSchema().load(request.get_json(silent=True) or {})
    return success(
        serialize_content(SystemContentService().create(g.current_user, values)), status=201
    )


@admin.patch("/content/<uuid:item_id>")
@auth_required(admin=True)
def update_system_content(item_id: uuid.UUID):
    values = SystemContentUpdateSchema().load(request.get_json(silent=True) or {})
    return success(
        serialize_content(SystemContentService().update(g.current_user, item_id, values))
    )


@admin.delete("/content/<uuid:item_id>")
@auth_required(admin=True)
def delete_system_content(item_id: uuid.UUID):
    SystemContentService().delete(g.current_user, item_id)
    return success({"deleted": True})


@admin.post("/login")
def admin_login():
    # Kept as a distinct policy endpoint; token issuance is shared with student login.
    from app.api.v1.auth.routes import _set_auth_cookies
    from app.services.rate_limit import check_rate_limit

    payload = LoginSchema().load(request.get_json(silent=True) or {})
    check_rate_limit("admin_login", f"{request.remote_addr}:{payload['email'].lower()}")
    service = AuthService()
    user = service.authenticate(**payload, require_admin=True)
    tokens = service.issue_tokens(
        user, ip_address=request.remote_addr, user_agent=request.headers.get("User-Agent")
    )
    response, status = success(serialize_user(user))
    _set_auth_cookies(response, tokens)
    return response, status


@admin.get("/users")
@auth_required(admin=True)
def list_users():
    return success([serialize_user(user) for user in UserRepository().list_all()])


@admin.get("/users/<uuid:user_id>")
@auth_required(admin=True)
def get_user(user_id: uuid.UUID):
    user = UserRepository().get(user_id)
    if user is None:
        from app.api.responses import failure

        return failure("user_not_found", "User not found", status=404)
    return success(serialize_user(user))


@admin.post("/users/<uuid:user_id>/disable")
@auth_required(admin=True)
def disable_user(user_id: uuid.UUID):
    user = UserRepository().get(user_id)
    if user is None:
        from app.api.responses import failure

        return failure("user_not_found", "User not found", status=404)
    if user.id == g.current_user.id:
        from app.api.responses import failure

        return failure(
            "cannot_disable_self", "Administrators cannot disable themselves", status=400
        )
    user.is_active = False
    AuthRepository().revoke_user_sessions(user.id)
    record_audit("admin.user_disabled", actor_id=g.current_user.id, target_user_id=user.id)
    db.session.commit()
    return success({"disabled": True})


@admin.post("/users/<uuid:user_id>/sessions/revoke")
@auth_required(admin=True)
def revoke_sessions(user_id: uuid.UUID):
    user = UserRepository().get(user_id)
    if user is None:
        from app.api.responses import failure

        return failure("user_not_found", "User not found", status=404)
    AuthRepository().revoke_user_sessions(user.id)
    record_audit("admin.sessions_revoked", actor_id=g.current_user.id, target_user_id=user.id)
    db.session.commit()
    return success({"revoked": True, "at": utcnow().isoformat()})


@admin.post("/users/<uuid:user_id>/password-reset")
@auth_required(admin=True)
def initiate_reset(user_id: uuid.UUID):
    user = UserRepository().get(user_id)
    code = AuthService().send_password_reset_code(user.email) if user else None
    record_audit(
        "admin.password_reset_initiated", actor_id=g.current_user.id, target_user_id=user_id
    )
    db.session.commit()
    meta = {"reset_code": code} if current_app.testing and code else None
    return success({"initiated": bool(code)}, meta=meta)


@admin.post("/categories")
@auth_required(admin=True)
def create_system_category():
    values = CategorySchema().load(request.get_json(silent=True) or {})
    category = CategoryService().create(g.current_user, values, system=True)
    return success(serialize_category(category), status=201)


@admin.patch("/categories/<uuid:category_id>")
@auth_required(admin=True)
def update_system_category(category_id: uuid.UUID):
    values = CategoryUpdateSchema().load(request.get_json(silent=True) or {})
    category = CategoryService().update(g.current_user, category_id, values, system=True)
    return success(serialize_category(category))


@admin.delete("/categories/<uuid:category_id>")
@auth_required(admin=True)
def delete_system_category(category_id: uuid.UUID):
    CategoryService().deactivate(g.current_user, category_id, system=True)
    return success({"deleted": True})
