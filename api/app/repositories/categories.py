import uuid

from sqlalchemy import or_, select

from app.extensions import db
from app.models import Category


class CategoryRepository:
    def visible_to(self, user_id: uuid.UUID) -> list[Category]:
        statement = (
            select(Category)
            .where(or_(Category.owner_id == user_id, Category.owner_id.is_(None)))
            .order_by(Category.category_type, Category.name)
        )
        return list(db.session.scalars(statement))

    def get(self, category_id: uuid.UUID) -> Category | None:
        return db.session.get(Category, category_id)

    def add(self, category: Category) -> Category:
        db.session.add(category)
        return category
