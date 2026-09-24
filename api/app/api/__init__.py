from flask import Blueprint

from app.api.responses import success

api_v1 = Blueprint("api_v1", __name__)


@api_v1.get("")
def api_index():
    return success({"name": "CampusCoin API", "version": "v1"})


from app.api.v1.jobs.routes import jobs  # noqa: E402

api_v1.register_blueprint(jobs, url_prefix="/jobs")
