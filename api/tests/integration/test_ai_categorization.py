"""The category suggestion contract is now local and deterministic."""

from app.extensions import db
from app.models import AISuggestionUsage, CategoryCorrection
from app.services.ai.categorization import minimize
from tests.integration.test_auth import post, register
from tests.integration.test_transactions import make_category, make_transaction


def ask(client, description, transaction_type="expense"):
    return post(
        client,
        "/api/v1/categories/suggest",
        {"transaction_type": transaction_type, "description": description},
    )


def test_category_name_and_keywords_match_existing_categories_without_ai(app):
    client = app.test_client()
    register(client)
    food = make_category(client, "Food")
    income = make_category(client, "Allowance", "income")
    assert ask(client, "Food at campus cafe").get_json()["data"] == {
        "category_id": food,
        "confidence": "high",
        "source": "rule",
        "rationale": "Matched an existing category name.",
    }
    assert ask(client, "Campus lunch").get_json()["data"]["category_id"] == food
    assert ask(client, "Monthly allowance", "income").get_json()["data"]["category_id"] == income
    assert ask(client, "Unrecognized purchase").get_json()["data"]["source"] == "manual"
    with app.app_context():
        assert db.session.query(AISuggestionUsage).count() == 0


def test_corrections_are_private_and_batch_suggestions_remain_advisory(app):
    first, second = app.test_client(), app.test_client()
    register(first, "first-suggestions@example.com")
    register(second, "second-suggestions@example.com")
    category = make_category(first, "Travel")
    feedback = post(
        first,
        "/api/v1/categories/suggest/feedback",
        {
            "transaction_type": "expense",
            "description": "Mystery transfer",
            "category_id": category,
        },
    )
    assert feedback.status_code == 200
    assert ask(first, "Mystery transfer").get_json()["data"]["category_id"] == category
    assert ask(second, "Mystery transfer").get_json()["data"]["category_id"] is None
    batch = post(
        first,
        "/api/v1/categories/suggest/batch",
        {
            "items": [
                {"transaction_type": "expense", "description": "Mystery transfer"},
                {"transaction_type": "expense", "description": "Unknown item"},
            ]
        },
    )
    assert [item["source"] for item in batch.get_json()["data"]] == ["memory", "manual"]
    assert make_transaction(first, category).status_code == 201
    with app.app_context():
        assert db.session.query(CategoryCorrection).count() == 1


def test_minimize_redacts_common_identifiers():
    clean = minimize("Pay alice@example.com 08012345678", 120)
    assert "alice@example.com" not in clean and "08012345678" not in clean
