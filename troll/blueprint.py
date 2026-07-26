"""
Flask blueprint exposing the TrollPyla humour subsystem to the web UI.

Mounted by ``register_troll(app)``. All endpoints are read/write on
``cfg/troll_config.toml`` plus a static content bundle. Nothing here can touch
the queue, the runtime or the bot itself, which keeps the humour layer unable to
affect a running session.
"""

from __future__ import annotations

import logging
import random
import time

from flask import Blueprint, Flask, jsonify, request

from .config import ensure_config_file, get_config, reset_config, resolved_settings, update_config
from .content import HTTP_HEADERS, LOST_PAGE_LINES, get_content
from .lexicon import get_lexicon

logger = logging.getLogger(__name__)

troll_bp = Blueprint("troll", __name__, url_prefix="/api/troll")


def _payload() -> dict:
    """Everything the browser needs in a single response."""
    return {
        "ok": True,
        **resolved_settings(),
        "content": get_content(),
        "lexicon": get_lexicon(),
    }


@troll_bp.get("/config")
def read_config():
    return jsonify(_payload())


@troll_bp.put("/config")
def write_config():
    patch = request.get_json(silent=True) or {}
    update_config(patch)
    return jsonify(_payload())


@troll_bp.post("/config/reset")
def reset():
    reset_config()
    return jsonify(_payload())


@troll_bp.get("/content")
def read_content():
    return jsonify({"ok": True, "content": get_content()})


@troll_bp.get("/lexicon")
def read_lexicon():
    return jsonify({"ok": True, "lexicon": get_lexicon()})


class _SuppressTrollPolling(logging.Filter):
    """Keep the humour layer out of the request log, like upstream does for polls."""

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not ("GET /api/troll/" in message and " 200 -" in message)


LOST_PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Lost</title>
<style>
  html,body{{margin:0;height:100%;background:#060608;color:#fff;
    font:600 15px/1.6 Inter,system-ui,sans-serif;display:grid;place-items:center}}
  .box{{text-align:center;padding:30px}}
  .big{{font-size:5rem;font-weight:900;color:#ff2a44;line-height:1;margin-bottom:10px}}
  p{{color:#8e95a5;max-width:32rem}}
  a{{color:#ff2a44;font-weight:800;text-decoration:none}}
  .cat{{font-size:2rem;margin-top:22px}}
</style></head>
<body><div class="box">
  <div class="big">404</div>
  <p>{line}</p>
  <p><a href="/">take me back to the bunker</a></p>
  <div class="cat">= ^ . ^ =</div>
</div></body></html>
"""


def _install_flavour(app: Flask) -> None:
    """
    Server side jokes that have nothing to do with the web UI: absurd response
    headers and a nicer place to end up when a URL is wrong.
    """

    # The UI polls a few times per second, so the enabled flag is cached instead of
    # re-reading the TOML file on every single response.
    cache = {"checked_at": 0.0, "enabled": True}

    def _headers_wanted() -> bool:
        now = time.monotonic()
        if now - cache["checked_at"] > 5.0:
            try:
                cache["enabled"] = bool(get_config().get("enabled"))
            except Exception:
                cache["enabled"] = False
            cache["checked_at"] = now
        return cache["enabled"]

    @app.after_request
    def _flavour_headers(response):
        try:
            if _headers_wanted():
                for header, value in HTTP_HEADERS.items():
                    response.headers.setdefault(header, value)
        except Exception:
            pass
        return response

    @app.errorhandler(404)
    def _lost(_error):
        # API consumers still get JSON; only humans browsing get the silly page.
        if request.path.startswith("/api/"):
            return jsonify({"ok": False, "message": "No such endpoint."}), 404
        return LOST_PAGE.format(line=random.choice(LOST_PAGE_LINES)), 404


def register_troll(app: Flask) -> Flask:
    """
    Mount the humour subsystem on an existing PylaAI Flask app.

    Safe to call more than once and safe to fail: if anything goes wrong the app
    is returned untouched so TrollPyla degrades into plain PylaAI instead of
    refusing to boot.
    """
    try:
        ensure_config_file()

        if troll_bp.name not in app.blueprints:
            app.register_blueprint(troll_bp)
            _install_flavour(app)

        werkzeug_logger = logging.getLogger("werkzeug")
        if not any(isinstance(log_filter, _SuppressTrollPolling) for log_filter in werkzeug_logger.filters):
            werkzeug_logger.addFilter(_SuppressTrollPolling())

        config = get_config()
        logger.info(
            "TrollPyla humour layer registered (enabled=%s, intensity=%s)",
            config["enabled"],
            config["intensity"],
        )
    except Exception:
        logger.exception("TrollPyla humour layer failed to register - continuing without it.")

    return app
