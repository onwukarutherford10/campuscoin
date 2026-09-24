from typing import Any

from flask import jsonify


def success(data: Any, *, meta: dict | None = None, status: int = 200):
    return jsonify({"data": data, "meta": meta or {}}), status


def failure(code: str, message: str, *, fields: dict | None = None, status: int = 400):
    return jsonify({"error": {"code": code, "message": message, "fields": fields or {}}}), status
