from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select

from app.extensions import db
from app.models import Budget, Notification, RecurringRule, TipState
from app.repositories.planning import PlanningRepository
from app.services.recurrence import RecurrenceService
from app.services.transactions import LedgerError, serialize_transaction


def period_bounds(user, year: int, month: int):
    if not 1 <= month <= 12 or not 1 <= year <= 9999:
        raise LedgerError("invalid_period", "Invalid year or month")
    try:
        zone = ZoneInfo(user.timezone)
    except ZoneInfoNotFoundError as exc:
        raise LedgerError("invalid_timezone", "Unknown user timezone") from exc
    start = datetime(year, month, 1, tzinfo=zone)
    end = datetime(year + (month == 12), month % 12 + 1, 1, tzinfo=zone)
    return start.astimezone(UTC), end.astimezone(UTC)


def money(value):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError) as exc:
        raise LedgerError("invalid_amount", "Amount must be a positive two-decimal number") from exc
    if not amount.is_finite() or amount <= 0 or amount != amount.quantize(Decimal("0.01")):
        raise LedgerError("invalid_amount", "Amount must be a positive two-decimal number")
    return amount


class PlanningService:
    def __init__(self):
        self.repo = PlanningRepository()

    def budget_upsert(self, user, values):
        try:
            category_id = uuid.UUID(str(values["category_id"]))
            year, month = int(values["year"]), int(values["month"])
            amount = money(values["amount"])
            threshold = int(values.get("near_limit_percent", 80))
        except (KeyError, ValueError, TypeError) as exc:
            raise LedgerError(
                "invalid_budget", "Category, year, month and amount are required"
            ) from exc
        period_bounds(user, year, month)
        if not 1 <= threshold <= 99:
            raise LedgerError("invalid_budget", "Near-limit percent must be 1–99")
        category = self.repo.category(category_id)
        if (
            category is None
            or category.owner_id not in (None, user.id)
            or category.category_type != "expense"
            or not category.is_active
        ):
            raise LedgerError("invalid_category", "An active expense category is required")
        budget = db.session.scalar(
            select(Budget).where(
                Budget.owner_id == user.id,
                Budget.category_id == category_id,
                Budget.year == year,
                Budget.month == month,
            )
        )
        created = budget is None
        if created:
            budget = Budget(owner_id=user.id, category_id=category_id, year=year, month=month)
            db.session.add(budget)
        budget.amount, budget.near_limit_percent = amount, threshold
        db.session.commit()
        return budget, created

    def budget_list(self, user, year, month):
        RecurrenceService().materialize_due(user)
        start, end = period_bounds(user, year, month)
        spent = self.repo.spending(user.id, start, end)
        result = []
        for budget in self.repo.budgets(user.id, year, month):
            consumption = spent.get(budget.category_id) or Decimal("0.00")
            percent = (consumption / budget.amount * 100).quantize(Decimal("0.01"))
            state = (
                "exceeded"
                if consumption >= budget.amount
                else "near_limit"
                if percent >= budget.near_limit_percent
                else "within_limit"
            )
            if state != "within_limit":
                key = f"budget:{budget.id}:{state}"
                if (
                    db.session.scalar(select(Notification.id).where(Notification.key == key))
                    is None
                ):
                    db.session.add(
                        Notification(
                            owner_id=user.id,
                            key=key,
                            kind=state,
                            message=(
                                f"{self.repo.category(budget.category_id).name} budget is "
                                f"{state.replace('_', ' ')}"
                            ),
                        )
                    )
            result.append(
                {
                    "id": str(budget.id),
                    "category_id": str(budget.category_id),
                    "category_name": self.repo.category(budget.category_id).name,
                    "year": year,
                    "month": month,
                    "amount": str(budget.amount),
                    "spent": str(consumption),
                    "remaining": str(budget.amount - consumption),
                    "percent": str(percent),
                    "status": state,
                    "near_limit_percent": budget.near_limit_percent,
                    "version": budget.version,
                }
            )
        db.session.commit()
        return result

    def tips(self, user, year, month):
        budgets = self.budget_list(user, year, month)
        tips = []
        for budget in budgets:
            if budget["status"] == "within_limit":
                continue
            overspend = Decimal(budget["spent"]) - Decimal(budget["amount"])
            estimate = max(
                overspend, (Decimal(budget["spent"]) * Decimal("0.10")).quantize(Decimal("0.01"))
            )
            tips.append(
                {
                    "key": f"budget:{budget['id']}:{year}-{month}",
                    "message": (
                        f"Review {budget['category_name']} spending against your monthly budget."
                    ),
                    "estimated_savings": str(max(estimate, Decimal("0.00"))),
                }
            )
        start, end = period_bounds(user, year, month)
        prior = start.astimezone(ZoneInfo(user.timezone)) - timedelta(days=1)
        previous_start, _ = period_bounds(user, prior.year, prior.month)
        previous = self.repo.spending(user.id, previous_start, start)
        current = self.repo.spending(user.id, start, end)
        for category_id, amount in current.items():
            baseline = previous.get(category_id)
            if baseline and amount > baseline * Decimal("1.20"):
                estimate = (amount - baseline).quantize(Decimal("0.01"))
                tips.append(
                    {
                        "key": f"trend:{category_id}:{year}-{month}",
                        "message": (
                            f"{self.repo.category(category_id).name} spending rose; "
                            "review recent purchases."
                        ),
                        "estimated_savings": str(estimate),
                    }
                )
        recurring = db.session.scalars(
            select(RecurringRule).where(
                RecurringRule.owner_id == user.id,
                RecurringRule.is_active.is_(True),
                RecurringRule.transaction_type == "expense",
            )
        ).all()
        if recurring:
            monthly = sum(
                (
                    r.amount
                    * (
                        Decimal("30")
                        if r.frequency == "daily"
                        else Decimal("4")
                        if r.frequency == "weekly"
                        else Decimal("1")
                    )
                    / r.interval
                    for r in recurring
                ),
                Decimal("0.00"),
            )
            tips.append(
                {
                    "key": f"recurring:{year}-{month}",
                    "message": "Review recurring charges for services you no longer use.",
                    "estimated_savings": str((monthly * Decimal("0.10")).quantize(Decimal("0.01"))),
                }
            )
        for tip in tips:
            state = self.repo.tip_state(user.id, tip["key"])
            tip.update(
                {
                    "pinned": bool(state and state.pinned),
                    "bookmarked": bool(state and state.bookmarked),
                    "dismissed": bool(state and state.dismissed),
                }
            )
        return sorted(
            (t for t in tips if not t["dismissed"]), key=lambda t: (not t["pinned"], t["key"])
        )

    def tip_action(self, user, key, action):
        now = datetime.now(ZoneInfo(user.timezone))
        if key not in {t["key"] for t in self.tips(user, now.year, now.month)}:
            raise LedgerError("not_found", "Tip not found", 404)
        state = self.repo.tip_state(user.id, key)
        if state is None:
            state = TipState(owner_id=user.id, tip_key=key)
            db.session.add(state)
        if action == "pin":
            state.pinned = not state.pinned
        elif action == "bookmark":
            state.bookmarked = not state.bookmarked
        else:
            state.dismissed = True
        db.session.commit()
        return {
            "key": key,
            "pinned": state.pinned,
            "bookmarked": state.bookmarked,
            "dismissed": state.dismissed,
        }

    def dashboard(self, user):
        now = datetime.now(ZoneInfo(user.timezone))
        report = self.report(user, "monthly", now.year, now.month)
        budgets = self.budget_list(user, now.year, now.month)
        return {
            "currency": user.currency,
            "balance": report["balance"],
            "income": report["income"],
            "expenses": report["expenses"],
            "top_categories": report["categories"][:5],
            "budgets": budgets,
            "tips": self.tips(user, now.year, now.month),
            "alerts": [self.serialize_notification(n) for n in self.repo.notifications(user.id)],
            "recent_activity": report["recent_activity"],
        }

    def report(
        self, user, period="monthly", year=None, month=None, start=None, end=None, category_id=None
    ):
        RecurrenceService().materialize_due(user)
        now = datetime.now(ZoneInfo(user.timezone))
        year, month = year or now.year, month or now.month
        if period == "monthly":
            lower, upper = period_bounds(user, year, month)
        elif period == "six_months":
            end_month = year * 12 + month - 1
            first = end_month - 5
            lower, _ = period_bounds(user, first // 12, first % 12 + 1)
            _, upper = period_bounds(user, year, month)
        elif period in {"daily", "weekly"}:
            local = now if start is None else start.astimezone(ZoneInfo(user.timezone))
            day = local.date() - timedelta(days=local.weekday() if period == "weekly" else 0)
            lower = datetime.combine(day, datetime.min.time(), ZoneInfo(user.timezone)).astimezone(
                UTC
            )
            upper = (
                datetime.combine(day, datetime.min.time(), ZoneInfo(user.timezone))
                + timedelta(days=7 if period == "weekly" else 1)
            ).astimezone(UTC)
        elif period in {"range", "category", "income_source"}:
            if (
                start is None
                or end is None
                or start.tzinfo is None
                or end.tzinfo is None
                or start >= end
            ):
                raise LedgerError("invalid_period", "A timezone-aware start before end is required")
            lower, upper = start.astimezone(UTC), end.astimezone(UTC)
        else:
            raise LedgerError("invalid_period", "Unsupported report period")
        if category_id:
            category = self.repo.category(category_id)
            if category is None or category.owner_id not in (None, user.id):
                raise LedgerError("not_found", "Category not found", 404)
        rows = self.repo.transactions(user.id, lower, upper)
        if category_id:
            rows = [row for row in rows if row.category_id == category_id]
        if period == "income_source":
            rows = [row for row in rows if row.transaction_type == "income"]
        income = sum(
            (row.amount for row in rows if row.transaction_type == "income"), Decimal("0.00")
        )
        expense = sum(
            (row.amount for row in rows if row.transaction_type == "expense"), Decimal("0.00")
        )
        groups = {}
        for row in rows:
            category = self.repo.category(row.category_id)
            key = (row.transaction_type, str(row.category_id), category.name)
            groups[key] = groups.get(key, Decimal("0.00")) + row.amount
        categories = [
            {"type": kind, "category_id": identifier, "name": name, "amount": str(amount)}
            for (kind, identifier, name), amount in groups.items()
        ]
        categories.sort(key=lambda item: (-Decimal(item["amount"]), item["name"]))
        return {
            "period": period,
            "from": lower.isoformat(),
            "to": upper.isoformat(),
            "currency": user.currency,
            "income": str(income),
            "expenses": str(expense),
            "balance": str(income - expense),
            "transaction_count": len(rows),
            "categories": categories,
            "recent_activity": [serialize_transaction(row) for row in rows[:10]],
            "transactions": [serialize_transaction(row) for row in rows],
        }

    @staticmethod
    def serialize_notification(item):
        return {
            "id": str(item.id),
            "kind": item.kind,
            "message": item.message,
            "created_at": item.created_at.isoformat(),
            "read_at": item.read_at.isoformat() if item.read_at else None,
            "dismissed_at": item.dismissed_at.isoformat() if item.dismissed_at else None,
        }
