from __future__ import annotations

import hashlib
import json
import secrets
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from flask import current_app


class CloudinaryError(Exception):
    pass


def create_avatar_upload(user_id) -> dict:
    config = _config()
    timestamp = int(time.time())
    public_id = f"campuscoin/avatars/{user_id}/{secrets.token_hex(16)}"
    transformation = "c_fill,g_auto,h_512,w_512"
    parameters = {
        "public_id": public_id,
        "timestamp": timestamp,
        "transformation": transformation,
    }
    return {
        "upload_url": (
            f"https://api.cloudinary.com/v1_1/{quote(config['cloud_name'], safe='')}/image/upload"
        ),
        "cloud_name": config["cloud_name"],
        "api_key": config["api_key"],
        **parameters,
        "signature": _sign(parameters, config["api_secret"]),
    }


def avatar_url(public_id: str) -> str:
    cloud_name = _config()["cloud_name"]
    encoded_id = quote(public_id, safe="/")
    base_url = f"https://res.cloudinary.com/{quote(cloud_name, safe='')}/image/upload"
    return f"{base_url}/f_auto,q_auto/{encoded_id}"


def destroy_image(public_id: str) -> None:
    config = _config()
    timestamp = int(time.time())
    parameters = {"invalidate": "true", "public_id": public_id, "timestamp": timestamp}
    body = urlencode(
        {
            **parameters,
            "api_key": config["api_key"],
            "signature": _sign(parameters, config["api_secret"]),
        }
    ).encode()
    request = Request(
        f"https://api.cloudinary.com/v1_1/{quote(config['cloud_name'], safe='')}/image/destroy",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
    except (HTTPError, URLError, OSError, TimeoutError, ValueError) as exc:
        raise CloudinaryError("Profile photo service is temporarily unavailable") from exc
    if result.get("result") not in {"ok", "not found"}:
        raise CloudinaryError("Profile photo could not be removed")


def _sign(parameters: dict, api_secret: str) -> str:
    canonical = "&".join(f"{key}={parameters[key]}" for key in sorted(parameters))
    return hashlib.sha1(f"{canonical}{api_secret}".encode(), usedforsecurity=False).hexdigest()


def _config() -> dict[str, str]:
    config = {
        "cloud_name": current_app.config["CLOUDINARY_CLOUD_NAME"],
        "api_key": current_app.config["CLOUDINARY_API_KEY"],
        "api_secret": current_app.config["CLOUDINARY_API_SECRET"],
    }
    if not all(config.values()):
        raise CloudinaryError("Profile photo service is not configured")
    return config
