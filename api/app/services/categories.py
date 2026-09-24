import uuid

from sqlalchemy import select

from app.extensions import db
from app.models import Category, User
from app.repositories.categories import CategoryRepository
from app.services.audit import record_audit


class CategoryError(Exception):
    def __init__(self, code: str, message: str, status: int):
        self.code = code
        self.message = message
        self.status = status


class CategoryService:
    def __init__(self, repository: CategoryRepository | None = None):
        self.repository = repository or CategoryRepository()

    def list_for(self, user: User) -> list[Category]:
        return self.repository.visible_to(user.id)

    def create(self, actor: User, values: dict, *, system: bool = False) -> Category:
        owner_id = None if system else actor.id
        name = values["name"].strip()
        duplicate = db.session.scalar(
            select(Category).where(
                Category.owner_id == owner_id,
                Category.name == name,
                Category.category_type == values["category_type"],
            )
        )
        if duplicate:
            raise CategoryError("category_exists", "A category with this name already exists", 409)
        category = self.repository.add(Category(owner_id=owner_id, **(values | {"name": name})))
        db.session.flush()
        record_audit(
            "category.system_created" if system else "category.created",
            actor_id=actor.id,
            details={"category_id": str(category.id)},
        )
        db.session.commit()
        return category

    def update(
        self, actor: User, category_id: uuid.UUID, values: dict, *, system: bool = False
    ) -> Category:
        category = self._editable(actor, category_id, system=system)
        next_name = values.get("name", category.name).strip()
        duplicate = db.session.scalar(
            select(Category).where(
                Category.owner_id == category.owner_id,
                Category.name == next_name,
                Category.category_type == category.category_type,
                Category.id != category.id,
            )
        )
        if duplicate:
            raise CategoryError("category_exists", "A category with this name already exists", 409)
        for field, value in values.items():
            setattr(category, field, value.strip() if isinstance(value, str) else value)
        record_audit(
            "category.system_updated" if system else "category.updated",
            actor_id=actor.id,
            details={"category_id": str(category.id)},
        )
        db.session.commit()
        return category

    def deactivate(self, actor: User, category_id: uuid.UUID, *, system: bool = False) -> None:
        category = self._editable(actor, category_id, system=system)
        category.is_active = False
        record_audit(
            "category.system_deactivated" if system else "category.deactivated",
            actor_id=actor.id,
            details={"category_id": str(category.id)},
        )
        db.session.commit()

    def _editable(self, actor: User, category_id: uuid.UUID, *, system: bool) -> Category:
        category = self.repository.get(category_id)
        expected_owner = None if system else actor.id
        if category is None or category.owner_id != expected_owner:
            raise CategoryError("category_not_found", "Category not found", 404)
        return category


def serialize_category(category: Category) -> dict:
    return {
        "id": str(category.id),
        "name": category.name,
        "type": category.category_type,
        "color": category.color,
        "icon": category.icon,
        "is_system": category.is_system,
        "is_active": category.is_active,
    }
