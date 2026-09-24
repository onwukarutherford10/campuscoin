from flask import Blueprint

from app.api.responses import success

api_v1 = Blueprint("api_v1", __name__)


@api_v1.get("")
def api_index():
    return success({"name": "CampusCoin API", "version": "v1"})


from app.api.v1.admin.routes import admin  # noqa: E402
from app.api.v1.auth.routes import auth  # noqa: E402
from app.api.v1.categories.routes import categories  # noqa: E402
from app.api.v1.jobs.routes import jobs  # noqa: E402
from app.api.v1.transactions.imports import imports  # noqa: E402
from app.api.v1.transactions.recurring import recurring  # noqa: E402
from app.api.v1.transactions.routes import transactions  # noqa: E402
from app.api.v1.users.routes import users  # noqa: E402

api_v1.register_blueprint(auth, url_prefix="/auth")
api_v1.register_blueprint(users, url_prefix="/users")
api_v1.register_blueprint(categories, url_prefix="/categories")
api_v1.register_blueprint(jobs, url_prefix="/jobs")
api_v1.register_blueprint(transactions, url_prefix="/transactions")
api_v1.register_blueprint(imports, url_prefix="/transactions/imports")
api_v1.register_blueprint(recurring, url_prefix="/recurring-transactions")
api_v1.register_blueprint(admin, url_prefix="/admin")
