import uuid

from app.extensions import db
from app.models import Job


class JobRepository:
    def add(self, job: Job) -> Job:
        db.session.add(job)
        db.session.commit()
        return job

    def get(self, job_id: uuid.UUID) -> Job | None:
        return db.session.get(Job, job_id)
