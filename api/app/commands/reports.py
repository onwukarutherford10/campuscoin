import click
from flask import Flask

from app.services.reports import ReportService


def register_report_commands(app: Flask):
    @app.cli.command("process-report-exports")
    @click.option("--limit", default=10, type=int)
    def process_report_exports(limit):
        """Render queued report exports from database jobs."""
        click.echo(f"Processed {ReportService().process_pending(limit)} exports")
