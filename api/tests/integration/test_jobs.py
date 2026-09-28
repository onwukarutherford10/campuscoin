from app.models import JobType
from app.repositories.users import UserRepository
from app.services.jobs.service import JobService
from tests.integration.test_auth import register


def test_job_status_endpoint(client, app):
    register(client)
    with app.app_context():
        user = UserRepository().by_email("student@example.com")
        job = JobService().create(JobType.REPORT_EXPORT, {"report": "monthly"}, owner_id=user.id)
        job_id = str(job.id)

    response = client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    assert response.get_json()["data"] == {
        "job_id": job_id,
        "type": "report_export",
        "status": "pending",
        "status_url": f"/api/v1/jobs/{job_id}",
        "result": None,
        "error": None,
    }


def test_missing_job_uses_failure_contract(client):
    register(client)
    response = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
