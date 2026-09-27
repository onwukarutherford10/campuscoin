from flask import Blueprint, g, request

from app.api.responses import success
from app.schemas.ai import BatchSuggestionSchema, SuggestionFeedbackSchema, SuggestionSchema
from app.services.ai.categorization import CategorizationService
from app.utils.security import auth_required

suggestions = Blueprint("suggestions", __name__)


@suggestions.post("/suggest")
@auth_required()
def suggest_category():
    values = SuggestionSchema().load(request.get_json(silent=True) or {})
    return success(CategorizationService().suggest(g.current_user, values))


@suggestions.post("/suggest/batch")
@auth_required()
def suggest_categories():
    values = BatchSuggestionSchema().load(request.get_json(silent=True) or {})
    service = CategorizationService()
    return success([service.suggest(g.current_user, item) for item in values["items"]])


@suggestions.post("/suggest/feedback")
@auth_required()
def suggestion_feedback():
    values = SuggestionFeedbackSchema().load(request.get_json(silent=True) or {})
    return success(CategorizationService().feedback(g.current_user, values))
