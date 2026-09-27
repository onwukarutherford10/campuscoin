"""Local advisory categorization, with no external provider calls."""

from __future__ import annotations

import hashlib
import re

from app.extensions import db
from app.models import CategoryCorrection
from app.repositories.ai import SuggestionRepository
from app.services.transactions import LedgerError

_RULES = {
    "expense": (
        (
            ("cafe", "coffee", "lunch", "dinner", "grocer", "restaurant", "canteen"),
            ("food", "groceries", "dining"),
        ),
        (("bus", "uber", "bolt", "taxi", "petrol", "fare", "train"), ("transport", "travel")),
        (("rent", "hostel", "landlord", "accommodation"), ("housing", "hostel", "rent")),
        (
            ("book", "tuition", "print", "exam", "stationery"),
            ("tuition", "academics", "books", "education"),
        ),
        (
            ("netflix", "spotify", "subscription", "airtime", "data bundle"),
            ("subscriptions", "data", "airtime"),
        ),
        (("movie", "cinema", "concert", "game"), ("entertainment",)),
    ),
    "income": (
        (("allowance", "pocket money"), ("allowance",)),
        (("salary", "wage", "shift", "weekend job"), ("part-time", "work", "salary")),
        (("scholarship", "bursary", "grant"), ("scholarship", "grant")),
        (("freelance", "client", "gig"), ("freelance", "gig", "other income")),
        (("birthday gift", "gift", "present"), ("gift",)),
    ),
}


def minimize(value: str, limit: int) -> str:
    """Remove common identifiers before hashing, caching, or external submission."""
    value = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[email]", value)
    value = re.sub(r"\+?\d[\d\s()-]{7,}\d", "[number]", value)
    return " ".join(value.lower().strip().split())[:limit]


def fingerprint(transaction_type: str, description: str, merchant: str) -> str:
    raw = f"{transaction_type}\0{minimize(merchant, 80)}\0{minimize(description, 120)}"
    return hashlib.sha256(raw.encode()).hexdigest()


def result(category, confidence: str, source: str, rationale: str) -> dict:
    return {
        "category_id": str(category.id) if category else None,
        "confidence": confidence,
        "source": source,
        "rationale": rationale[:160],
    }


class CategorizationService:
    def __init__(self, repository: SuggestionRepository | None = None):
        self.repo = repository or SuggestionRepository()

    def suggest(self, user, values: dict) -> dict:
        transaction_type = values["transaction_type"]
        description = minimize(values["description"], 120)
        merchant = minimize(values.get("merchant", ""), 80)
        key = fingerprint(transaction_type, description, merchant)
        categories = self.repo.categories(user.id, transaction_type)
        available = {category.id: category for category in categories}
        if not categories:
            return result(None, "none", "manual", "Choose or create a category manually.")

        remembered = self.repo.correction(user.id, transaction_type, key)
        if remembered and remembered.category_id in available:
            return result(
                available[remembered.category_id],
                "high",
                "memory",
                "Based on your previous choice.",
            )

        text = f"{merchant} {description}"
        direct = next((c for c in categories if c.name.lower() in text), None)
        if direct:
            return result(direct, "high", "rule", "Matched an existing category name.")
        for needles, names in _RULES[transaction_type]:
            if any(needle in text for needle in needles):
                category = next(
                    (c for c in categories if any(name in c.name.lower() for name in names)), None
                )
                if category:
                    return result(
                        category, "medium", "rule", "Matched a common transaction pattern."
                    )

        return result(None, "none", "manual", "Choose a category manually.")

    def feedback(self, user, values: dict) -> dict:
        transaction_type = values["transaction_type"]
        key = fingerprint(transaction_type, values["description"], values.get("merchant", ""))
        categories = {
            category.id: category for category in self.repo.categories(user.id, transaction_type)
        }
        chosen = values["category_id"]
        if chosen not in categories:
            raise LedgerError(
                "invalid_category", "Choose an active category available to your account"
            )
        suggested = values.get("suggested_category_id")
        if suggested is not None and suggested not in categories:
            raise LedgerError("invalid_category", "Suggested category is unavailable")
        memory = self.repo.correction(user.id, transaction_type, key)
        if memory is None:
            memory = CategoryCorrection(
                owner_id=user.id,
                transaction_type=transaction_type,
                text_hash=key,
                category_id=chosen,
                accepted_count=0,
                corrected_count=0,
            )
            db.session.add(memory)
        memory.category_id = chosen
        if suggested == chosen:
            memory.accepted_count += 1
        else:
            memory.corrected_count += 1
        db.session.commit()
        return {"remembered": True, "category_id": str(chosen)}
