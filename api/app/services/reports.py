from __future__ import annotations

import hashlib
import io
import json
import uuid
from datetime import datetime

from flask import Response, current_app
from sqlalchemy import select

from app.api.responses import success
from app.extensions import db
from app.models import Job, JobStatus, JobType, ReportExport, User
from app.services.jobs.service import JobService
from app.services.planning import PlanningService
from app.services.transactions import LedgerError
from app.utils.time import utcnow


def render_report(report, format):
    lines = [
        "CampusCoin report",
        f"Period: {report['from']} to {report['to']}",
        f"Currency: {report['currency']}",
        f"Income: {report['income']}",
        f"Expenses: {report['expenses']}",
        f"Balance: {report['balance']}",
        f"Transactions: {report['transaction_count']}",
        "Categories:",
        *[f"{item['type']} / {item['name']}: {item['amount']}" for item in report["categories"]],
    ]
    output = io.BytesIO()
    if format == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        page = canvas.Canvas(output, pagesize=A4)
        y = A4[1] - 48
        for line in lines:
            if y < 48:
                page.showPage()
                y = A4[1] - 48
            page.drawString(36, y, line[:105])
            y -= 18
        page.save()
    else:
        from PIL import Image, ImageDraw

        width, height = 1100, max(300, 30 * (len(lines) + 2))
        image = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(image)
        for index, line in enumerate(lines):
            draw.text((24, 24 + index * 30), line, fill="black")
        image.save(output, format="PNG")
    return output.getvalue()


class ReportService:
    def create_export(self, user, options, format):
        if format not in {"pdf", "png"}:
            raise LedgerError("invalid_format", "Format must be pdf or png")
        report = PlanningService().report(user, **options)
        if report["transaction_count"] <= current_app.config["REPORT_SYNC_TRANSACTION_LIMIT"]:
            return self._response(render_report(report, format), format)
        payload = {
            key: value.isoformat()
            if isinstance(value, datetime)
            else str(value)
            if isinstance(value, uuid.UUID)
            else value
            for key, value in options.items()
        }
        fingerprint = hashlib.sha256(
            json.dumps(
                {"owner_id": str(user.id), "options": payload, "format": format, "report": report},
                sort_keys=True,
            ).encode()
        ).hexdigest()
        existing = db.session.scalar(select(Job).where(Job.idempotency_key == fingerprint))
        if existing is not None:
            return success(
                {
                    "job_id": str(existing.id),
                    "status": existing.status,
                    "status_url": f"/api/v1/jobs/{existing.id}",
                },
                status=202,
            )
        job = JobService().create(
            JobType.REPORT_EXPORT,
            {"options": payload, "format": format},
            owner_id=user.id,
            idempotency_key=fingerprint,
        )
        db.session.flush()
        export = ReportExport(owner_id=user.id, job_id=job.id, format=format)
        db.session.add(export)
        db.session.commit()
        return success(
            {"job_id": str(job.id), "status": "pending", "status_url": f"/api/v1/jobs/{job.id}"},
            status=202,
        )

    def download(self, user, export_id):
        export = db.session.scalar(
            select(ReportExport).where(
                ReportExport.id == export_id, ReportExport.owner_id == user.id
            )
        )
        if export is None or export.content is None:
            raise LedgerError("not_found", "Export not found or not ready", 404)
        return self._response(export.content, export.format)

    @staticmethod
    def _response(content, format):
        mime = "application/pdf" if format == "pdf" else "image/png"
        return Response(
            content,
            mimetype=mime,
            headers={"Content-Disposition": f"attachment; filename=campuscoin-report.{format}"},
        )

    def process_pending(self, limit=10):
        processed = 0
        for _ in range(limit):
            query = (
                select(Job)
                .where(Job.job_type == JobType.REPORT_EXPORT, Job.status == JobStatus.PENDING)
                .order_by(Job.created_at)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            job = db.session.scalar(query)
            if job is None:
                break
            job.status = JobStatus.RUNNING
            job.started_at = utcnow()
            db.session.commit()
            try:
                user = db.session.get(User, job.owner_id)
                if user is None:
                    raise ValueError("Export owner no longer exists")
                options = job.payload["options"].copy()
                for key in ("start", "end"):
                    if options.get(key):
                        options[key] = datetime.fromisoformat(options[key])
                if options.get("category_id"):
                    options["category_id"] = uuid.UUID(options["category_id"])
                report = PlanningService().report(user, **options)
                export = db.session.scalar(
                    select(ReportExport).where(ReportExport.job_id == job.id)
                )
                export.content = render_report(report, export.format)
                job.status = JobStatus.SUCCEEDED
                job.result = {
                    "export_id": str(export.id),
                    "download_url": f"/api/v1/reports/exports/{export.id}",
                }
                job.finished_at = utcnow()
                db.session.commit()
                processed += 1
            except Exception as exc:
                db.session.rollback()
                job = db.session.get(Job, job.id)
                job.status = JobStatus.FAILED
                job.error = str(exc)[:500]
                job.finished_at = utcnow()
                db.session.commit()
        return processed
