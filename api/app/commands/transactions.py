import click
from flask import Flask
from flask.cli import with_appcontext
from sqlalchemy import select

from app.extensions import db
from app.models import User
from app.services.recurrence import RecurrenceService


@click.command("materialize-recurring")
@with_appcontext
def materialize_recurring() -> None:
    count = 0
    for user in db.session.scalars(select(User).where(User.is_active.is_(True))):
        count += RecurrenceService().materialize_due(user)
    click.echo(f"Recurring transactions ready ({count} created).")


def register_transaction_commands(app: Flask) -> None:
    app.cli.add_command(materialize_recurring)
