import click
from flask import Flask
from flask.cli import with_appcontext
from sqlalchemy import select
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import Category, User, UserRole

DEFAULT_CATEGORIES = {
    "income": ["Allowance", "Scholarship", "Part-time Work", "Gift", "Other Income"],
    "expense": [
        "Food",
        "Transport",
        "Housing",
        "Tuition & Books",
        "Data & Airtime",
        "Health",
        "Entertainment",
        "Personal Care",
        "Savings",
        "Other Expense",
    ],
}


@click.command("seed-categories")
@with_appcontext
def seed_categories() -> None:
    created = 0
    for category_type, names in DEFAULT_CATEGORIES.items():
        for name in names:
            exists = db.session.scalar(
                select(Category.id).where(
                    Category.owner_id.is_(None),
                    Category.category_type == category_type,
                    Category.name == name,
                )
            )
            if not exists:
                db.session.add(Category(name=name, category_type=category_type))
                created += 1
    db.session.commit()
    click.echo(f"Default categories ready ({created} created).")


@click.command("seed-admin")
@click.option("--email", envvar="ADMIN_EMAIL", required=True)
@click.option("--password", envvar="ADMIN_PASSWORD", required=True, hide_input=True)
@click.option("--name", envvar="ADMIN_NAME", default="CampusCoin Admin", show_default=True)
@with_appcontext
def seed_admin(email: str, password: str, name: str) -> None:
    if len(password) < 12:
        raise click.ClickException("Administrator password must be at least 12 characters")
    normalized = email.strip().lower()
    user = db.session.scalar(select(User).where(User.email == normalized))
    if user is None:
        user = User(
            email=normalized,
            password_hash=generate_password_hash(password),
            name=name.strip(),
            role=UserRole.ADMIN,
        )
        db.session.add(user)
        message = "Administrator created."
    else:
        user.role = UserRole.ADMIN
        user.is_active = True
        message = "Existing administrator ensured."
    db.session.commit()
    click.echo(message)


def register_commands(app: Flask) -> None:
    app.cli.add_command(seed_categories)
    app.cli.add_command(seed_admin)
