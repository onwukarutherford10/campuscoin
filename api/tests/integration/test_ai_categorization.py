import uuid
from types import SimpleNamespace

from app.extensions import db
from app.models import AISuggestionUsage, CategoryCorrection, CategorySuggestionCache
from app.services.ai.categorization import LunaClient, minimize
from tests.integration.test_auth import csrf, post, register
from tests.integration.test_transactions import make_category


def _ask(client, description, transaction_type="expense", merchant=""):
    return post(
        client,
        "/api/v1/categories/suggest",
        {
            "transaction_type": transaction_type,
            "description": description,
            "merchant": merchant,
        },
    )


def _enable(client):
    return client.patch(
        "/api/v1/users/me", json={"ai_consent": True}, headers={"X-CSRF-Token": csrf(client)}
    )


def test_opt_out_rules_and_user_memory_never_call_luna(app, monkeypatch):
    client = app.test_client()
    other = app.test_client()
    register(client, "ai-one@example.com")
    register(other, "ai-two@example.com")
    food = make_category(client, "Food")
    travel = make_category(client, "Transport")
    app.config["OPENAI_API_KEY"] = "test-only"
    calls = []
    monkeypatch.setattr(LunaClient, "suggest", lambda *args: calls.append(args))

    rule = _ask(client, "Lunch at campus cafe").get_json()["data"]
    assert (rule["category_id"], rule["source"]) == (food, "rule")
    manual = _ask(client, "Mystery item").get_json()["data"]
    assert manual["category_id"] is None and manual["source"] == "manual"
    assert not calls
    feedback = post(
        client,
        "/api/v1/categories/suggest/feedback",
        {
            "transaction_type": "expense",
            "description": "Mystery item",
            "category_id": travel,
            "suggested_category_id": food,
        },
    )
    assert feedback.status_code == 200
    remembered = _ask(client, "Mystery item").get_json()["data"]
    assert (remembered["category_id"], remembered["source"]) == (travel, "memory")
    assert _ask(other, "Mystery item").get_json()["data"]["category_id"] is None
    assert not calls


def test_luna_cache_quota_and_strict_category_validation(app, monkeypatch):
    client = app.test_client()
    register(client, "ai-luna@example.com")
    food = make_category(client, "Food")
    assert _enable(client).get_json()["data"]["ai_consent"] is True
    app.config.update(OPENAI_API_KEY="test-only", AI_DAILY_QUOTA=2, AI_MONTHLY_QUOTA=2)
    calls = []

    def valid(_self, description, merchant, categories):
        calls.append((description, merchant, categories))
        return {
            "category_id": food,
            "confidence": "medium",
            "rationale": "A likely match.",
        }, SimpleNamespace(input_tokens=12, output_tokens=5)

    monkeypatch.setattr(LunaClient, "suggest", valid)
    first = _ask(client, "Unfamiliar debit 12345678901", merchant="Shop").get_json()["data"]
    assert first["category_id"] == food and first["source"] == "luna"
    assert "12345678901" not in calls[0][0]
    second = _ask(client, "Unfamiliar debit 12345678901", merchant="Shop").get_json()["data"]
    assert second["source"] == "cache" and len(calls) == 1
    client.patch(
        "/api/v1/users/me",
        json={"ai_consent": False},
        headers={"X-CSRF-Token": csrf(client)},
    )
    assert (
        _ask(client, "Unfamiliar debit 12345678901", merchant="Shop").get_json()["data"]["source"]
        == "manual"
    )
    _enable(client)
    invented = str(uuid.uuid4())
    monkeypatch.setattr(
        LunaClient,
        "suggest",
        lambda *_: ({"category_id": invented, "confidence": "high", "rationale": "Invented"}, None),
    )
    fallback = _ask(client, "Completely different purchase").get_json()["data"]
    assert fallback["category_id"] is None and fallback["source"] == "manual"
    assert _ask(client, "Yet another debit").get_json()["data"]["source"] == "manual"
    with app.app_context():
        assert db.session.query(AISuggestionUsage).count() == 2
        assert db.session.query(CategorySuggestionCache).count() == 1


def test_model_rationale_is_never_published(app, monkeypatch):
    client = app.test_client()
    register(client, "ai-safety@example.com")
    food = make_category(client, "Food")
    _enable(client)
    app.config["OPENAI_API_KEY"] = "test-only"
    monkeypatch.setattr(
        LunaClient,
        "suggest",
        lambda *_: (
            {
                "category_id": food,
                "confidence": "high",
                "rationale": "Unsafe financial advice: take a loan",
            },
            None,
        ),
    )
    response = _ask(client, "An unrecognized purchase").get_json()["data"]
    assert response["source"] == "luna"
    assert "loan" not in response["rationale"].lower()


def test_batch_feedback_constraints_outage_and_no_transaction_dependency(app, monkeypatch):
    client = app.test_client()
    register(client, "ai-batch@example.com")
    food = make_category(client, "Food")
    other = app.test_client()
    register(other, "ai-batch-other@example.com")
    alien = make_category(other, "Alien")
    invalid = post(
        client,
        "/api/v1/categories/suggest/feedback",
        {
            "transaction_type": "expense",
            "description": "x",
            "category_id": alien,
        },
    )
    assert invalid.status_code == 400
    batch = post(
        client,
        "/api/v1/categories/suggest/batch",
        {
            "items": [
                {"transaction_type": "expense", "description": "Cafe lunch"},
                {"transaction_type": "expense", "description": "Unknown item"},
            ]
        },
    )
    assert batch.status_code == 200 and len(batch.get_json()["data"]) == 2
    assert post(client, "/api/v1/categories/suggest/batch", {"items": []}).status_code == 400
    assert _enable(client).status_code == 200
    app.config["OPENAI_API_KEY"] = "test-only"
    monkeypatch.setattr(LunaClient, "suggest", lambda *_: (_ for _ in ()).throw(TimeoutError()))
    assert _ask(client, "Unknown expense").get_json()["data"]["source"] == "manual"
    from tests.integration.test_transactions import make_transaction

    assert make_transaction(client, food).status_code == 201
    with app.app_context():
        assert db.session.query(CategoryCorrection).count() == 0


def test_minimize_redacts_common_identifiers():
    clean = minimize("Pay alice@example.com 08012345678", 120)
    assert "alice@example.com" not in clean and "08012345678" not in clean


def test_luna_request_uses_strict_enum_and_no_storage(app, monkeypatch):
    import openai

    client = app.test_client()
    register(client, "ai-sdk@example.com")
    food = make_category(client, "Food")
    _enable(client)
    app.config["OPENAI_API_KEY"] = "test-only"
    captured = {}

    class FakeResponses:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                status="completed",
                output_text=f'{{"category_id":"{food}","confidence":"low","rationale":"ok"}}',
                usage=SimpleNamespace(input_tokens=10, output_tokens=4),
            )

    monkeypatch.setattr(
        openai, "OpenAI", lambda **_kwargs: SimpleNamespace(responses=FakeResponses())
    )
    response = _ask(client, "Mystery invoice alice@example.com").get_json()["data"]
    assert response["source"] == "luna"
    assert captured["store"] is False
    assert captured["model"] == "gpt-6-luna"
    assert captured["text"]["format"]["strict"] is True
    assert captured["text"]["format"]["schema"]["properties"]["category_id"]["enum"] == [food]
    assert "alice@example.com" not in captured["input"]
