"""
TrollPyla humour subsystem.

This package is deliberately self-contained: nothing in the PylaAI core
(``play.py``, ``stage_manager.py``, ``state_finder.py``, ``window_controller.py``,
...) imports from here, and nothing in here imports from the bot core except the
generic helpers in ``utils.py``.

Integration surface with upstream PylaAI is exactly one call::

    from troll import register_troll
    register_troll(app)

which mounts the ``/api/troll`` blueprint on an existing Flask app.
Removing that single line disables the whole fork's humour layer server side.
"""

from .blueprint import register_troll, troll_bp
from .config import (
    CONFIG_PATH,
    default_config,
    ensure_config_file,
    get_config,
    humour_enabled,
    reset_config,
    update_config,
)

__all__ = [
    "CONFIG_PATH",
    "default_config",
    "ensure_config_file",
    "get_config",
    "humour_enabled",
    "register_troll",
    "reset_config",
    "troll_bp",
    "update_config",
]
