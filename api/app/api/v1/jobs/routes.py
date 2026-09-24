import uuid

from flask import Blueprint

from app.api.responses import failure, success
from app.services.jobs.service import JobService

jobs = Blueprint("jobs", __name__)


@jobs.get("/<uuid:job_id>")
def get_job(job_id: uuid.UUID):
    job = JobService().get(job_id)
    if job is None:
        return failure("not_found", "Job not found", status=404)
    return success(JobService.serialize(job))
