import uuid

from flask import Blueprint, g

from app.api.responses import failure, success
from app.services.jobs.service import JobService
from app.utils.security import auth_required

jobs = Blueprint("jobs", __name__)


@jobs.get("/<uuid:job_id>")
@auth_required()
def get_job(job_id: uuid.UUID):
    job = JobService().get(job_id)
    if job is None or job.owner_id != g.current_user.id:
        return failure("not_found", "Job not found", status=404)
    return success(JobService.serialize(job))
