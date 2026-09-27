import click
from flask import Flask
from flask.cli import with_appcontext
from sqlalchemy import select

from app.extensions import db
from app.models import User
from app.services.imports import ImportService
from app.services.recurrence import RecurrenceService


@click.command("materialize-recurring")
@with_appcontext
def materialize_recurring() -> None:
    count = 0
    for user in db.session.scalars(select(User).where(User.is_active.is_(True))):
        count += RecurrenceService().materialize_due(user)
    click.echo(f"Recurring transactions ready ({count} created).")


@click.command("process-csv-imports")
@click.option("--limit", default=10, type=int)
@with_appcontext
def process_csv_imports(limit: int) -> None:
    """Create transactions for queued, confirmed CSV imports."""
    click.echo(f"Processed {ImportService().process_pending(limit)} CSV imports")


def register_transaction_commands(app: Flask) -> None:
    app.cli.add_command(materialize_recurring)
    app.cli.add_command(process_csv_imports)
