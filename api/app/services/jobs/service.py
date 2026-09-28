import uuid
from typing import Any

from app.models import Job, JobStatus, JobType
from app.repositories.jobs import JobRepository


class JobService:
    def __init__(self, repository: JobRepository | None = None):
        self.repository = repository or JobRepository()

    def create(
        self,
        job_type: JobType,
        payload: dict[str, Any],
        idempotency_key: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> Job:
        return self.repository.add(
            Job(
                job_type=job_type.value,
                payload=payload,
                idempotency_key=idempotency_key,
                owner_id=owner_id,
            )
        )

    def get(self, job_id: uuid.UUID) -> Job | None:
        return self.repository.get(job_id)

    @staticmethod
    def serialize(job: Job) -> dict[str, Any]:
        return {
            "job_id": str(job.id),
            "type": job.job_type,
            "status": job.status,
            "status_url": f"/api/v1/jobs/{job.id}",
            "result": job.result if job.status == JobStatus.SUCCEEDED else None,
            "error": job.error if job.status == JobStatus.FAILED else None,
        }
