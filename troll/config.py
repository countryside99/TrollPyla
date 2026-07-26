"""
Configuration layer for the TrollPyla humour subsystem.

Mirrors the schema style used by ``webui/services.py`` (``{key: (type, default)}``)
so it feels native to the existing codebase, but keeps its own coercion helpers so
the humour layer never depends on private methods of ``WebDataService``.

Everything lives in ``cfg/troll_config.toml`` and is read/written through the same
cached TOML helpers the rest of PylaAI uses.
"""

from __future__ import annotations

from typing import Any

from utils import load_toml_as_dict, resolve_project_path, save_dict_as_toml

CONFIG_PATH = "cfg/troll_config.toml"

INTENSITY_VALUES: tuple[str, ...] = ("calm", "normal", "chaotic")

# key -> (value type, default value)
TROLL_FIELDS: dict[str, tuple[str, Any]] = {
    "enabled": ("bool", True),
    "intensity": ("intensity", "normal"),
    "startup_sequence": ("bool", True),
    "startup_challenges": ("bool", True),
    "language_prompt": ("bool", True),
    "country_quiz": ("bool", True),
    "section_quizzes": ("bool", True),
    "console_nonsense": ("bool", True),
    "random_events": ("bool", True),
    "runtime_gags": ("bool", True),
    "funny_status_messages": ("bool", True),
    "rename_ui": ("bool", True),
    "fake_errors": ("bool", True),
    "confetti": ("bool", True),
    "animations": ("bool", True),
    "challenge_count": ("int", 2),
    "skip_delay_seconds": ("int", 4),
    "max_startup_seconds": ("int", 30),
    "replay_every_launch": ("bool", True),
}

# Hard clamps so a hand-edited TOML file can never produce a hostile UI
# (for example a 10 minute startup overlay or 400 challenges).
TROLL_RANGES: dict[str, tuple[int, int]] = {
    "challenge_count": (1, 5),
    "skip_delay_seconds": (0, 30),
    "max_startup_seconds": (5, 120),
}

# Client side tuning per intensity level. Sent to the browser so the JS layer
# never has to hardcode balance numbers.
INTENSITY_PRESETS: dict[str, dict[str, Any]] = {
    "calm": {
        "label": "Calm",
        "description": "A couple of jokes, then out of the way.",
        "startup_stages": 5,
        "challenge_bonus": -1,
        "startup_event_interval_ms": 6500,
        "runtime_event_interval_ms": 150000,
        "runtime_event_chance": 0.25,
        "stage_duration_ms": [380, 760],
        "stage_mischief_chance": 0.25,
    },
    "normal": {
        "label": "Normal",
        "description": "The intended TrollPyla welcome.",
        "startup_stages": 9,
        "challenge_bonus": 0,
        "startup_event_interval_ms": 4000,
        "runtime_event_interval_ms": 75000,
        "runtime_event_chance": 0.5,
        "stage_duration_ms": [340, 700],
        "stage_mischief_chance": 0.42,
    },
    "chaotic": {
        "label": "Chaotic",
        "description": "Cats everywhere. You asked for this.",
        "startup_stages": 14,
        "challenge_bonus": 1,
        "startup_event_interval_ms": 2200,
        "runtime_event_interval_ms": 40000,
        "runtime_event_chance": 0.85,
        "stage_duration_ms": [300, 640],
        "stage_mischief_chance": 0.62,
    },
}

_TRUTHY = {"1", "true", "yes", "on"}


def _coerce(value_type: str, value: Any, default: Any) -> Any:
    """Coerce a raw TOML/JSON value into the type declared by the schema."""
    try:
        if value_type == "bool":
            if isinstance(value, bool):
                return value
            return str(value).strip().lower() in _TRUTHY
        if value_type == "int":
            return int(float(value))
        if value_type == "float":
            return float(value)
        if value_type == "intensity":
            text = str(value or "").strip().lower()
            return text if text in INTENSITY_VALUES else default
        return "" if value is None else str(value)
    except (TypeError, ValueError):
        return default


def _clamp(key: str, value: Any) -> Any:
    bounds = TROLL_RANGES.get(key)
    if not bounds or not isinstance(value, int):
        return value
    low, high = bounds
    return max(low, min(high, value))


def default_config() -> dict[str, Any]:
    return {key: default for key, (_type, default) in TROLL_FIELDS.items()}


def ensure_config_file() -> None:
    """Create ``cfg/troll_config.toml`` with defaults if it is missing."""
    target = resolve_project_path(CONFIG_PATH)
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    save_dict_as_toml(default_config(), CONFIG_PATH)


def get_config() -> dict[str, Any]:
    """Return the fully normalized humour configuration."""
    raw = load_toml_as_dict(CONFIG_PATH, cache=False) or {}
    config: dict[str, Any] = {}
    for key, (value_type, default) in TROLL_FIELDS.items():
        config[key] = _clamp(key, _coerce(value_type, raw.get(key, default), default))
    return config


def update_config(patch: dict[str, Any] | None) -> dict[str, Any]:
    """Apply a partial update. Unknown keys are ignored, values are clamped."""
    patch = patch or {}
    # Start from the normalized on-disk state so a hand-edited file with a bad
    # value is repaired rather than written straight back out.
    stored = get_config()

    for key, value in patch.items():
        if key not in TROLL_FIELDS:
            continue
        value_type, default = TROLL_FIELDS[key]
        stored[key] = _clamp(key, _coerce(value_type, value, default))

    save_dict_as_toml(stored, CONFIG_PATH)
    return get_config()


def reset_config() -> dict[str, Any]:
    """Restore the shipped defaults (humour on, normal intensity)."""
    save_dict_as_toml(default_config(), CONFIG_PATH)
    return get_config()


def humour_enabled() -> bool:
    """Convenience predicate used by the blueprint and by any future hook."""
    return bool(get_config().get("enabled"))


def resolved_settings() -> dict[str, Any]:
    """Config plus the intensity preset the client should use right now."""
    config = get_config()
    preset = INTENSITY_PRESETS.get(config["intensity"], INTENSITY_PRESETS["normal"])
    challenge_count = _clamp(
        "challenge_count",
        max(1, config["challenge_count"] + int(preset["challenge_bonus"])),
    )
    return {
        "config": config,
        "preset": {**preset, "resolved_challenge_count": challenge_count},
        "presets": INTENSITY_PRESETS,
        "intensities": list(INTENSITY_VALUES),
    }
