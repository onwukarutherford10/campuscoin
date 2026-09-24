from app.models import JobType
from app.services.jobs.service import JobService


def test_job_status_endpoint(client, app):
    with app.app_context():
        job = JobService().create(JobType.REPORT_EXPORT, {"report": "monthly"})
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
    response = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
