import os
import locale
import json
import copy
from app.utils.working_dir import get_base_dir

BASE_DIR = get_base_dir()
CONFIG_DIR = os.path.join(BASE_DIR, ".config")
SETTINGS_PATH = os.path.join(CONFIG_DIR, "settings.json")


# =========================
# Helpers
# =========================

def get_available_languages() -> dict:
    translations_path = os.path.join(BASE_DIR, "neodeck", "translations")
    languages = {}
    if not os.path.exists(translations_path):
        return languages
    for file in os.listdir(translations_path):
        if file.endswith(".lang"):
            lang = file.rsplit(".", 1)[0]
            languages[lang] = lang  # key=value for select options
    return languages


def resolve_default_language() -> str:
    """
    Resolve the best default language from the system locale.
    Exact match first, then base language match, then fallback to en_US.
    """

    available = get_available_languages()

    if not available:
        return "en_US"

    system_lang = locale.getdefaultlocale()[0]

    if not system_lang:
        return "en_US"

    system_lang = system_lang.replace("-", "_")

    # Exact match
    if system_lang in available:
        return system_lang

    # Base language fallback
    base = system_lang.split("_")[0].lower()

    for lang in available:
        if lang.split("_")[0].lower() == base:
            return lang

    return "en_US"


# =========================
# CORE SCHEMA
# Each leaf is a descriptor dict with at least "type".
# Persisted settings must also have "default".
# Display-only types (link, status) have no "default".
# =========================

_CORE_SCHEMA: dict = {
    "neodeck": {
        "server":           {"type": "text",    "default": "flask"},
        "plugins_repo":     {"type": "text",    "default": "Dalinnar/NeoDeck-plugins"},
        "update_repo":      {"type": "text",    "default": "Dalinnar/NeoDeck"},
        "update_channel":   {
            "type": "select",
            "default": "stable",
            "options": {"stable": "Stable", "beta": "Beta", "nightly": "Nightly"},
        },

        "ip":               {"type": "text",    "default": "0.0.0.0"},
        "port":             {"type": "number",  "default": 59997},

        "language": {
            "type": "select",
            "default": resolve_default_language(),
            "options": "dynamic:get_available_languages",
        },

        "data_transfer_method": {"type": "text", "default": "http"},
        "allowed_networks":     {"type": "multiselect", "default": []},
        "netmask":              {"type": "text", "default": "16"},

        "auto_updates":     {"type": "boolean", "default": True},
        "dev_mode":         {"type": "boolean", "default": False},

        "windows_startup":                  {"type": "boolean", "default": True},
        "windows_start_menu_shortcut":      {"type": "boolean", "default": False},
        "open_settings_in_integrated_browser": {"type": "boolean", "default": False},

        "show_popup":               {"type": "boolean", "default": True},
        "show_console":             {"type": "boolean", "default": False},
        "optimized_usage_display":  {"type": "boolean", "default": False},

        "ear_soundboard":       {"type": "boolean", "default": True},
        "fix_stop_soundboard":  {"type": "boolean", "default": False},

        "gpu_method":   {"type": "text", "default": "nvidia (pynvml)"},

        "automatic_firewall_bypass": {"type": "boolean", "default": False},
        "sort_colors_on_startup":    {"type": "boolean", "default": False},

        "flask_debug":      {"type": "boolean", "default": False},
        "flask_reloader":   {"type": "boolean", "default": False},
        "flask_secret_key": {"type": "text",    "default": "secret", "secret": True},
        "use_root_plugins": {"type": "boolean", "default": False},
        "app_admin":        {"type": "boolean", "default": False},
    }
}

# Plugin schemas registered at runtime.
_plugin_schemas: dict = {}


# =========================
# SCHEMA HELPERS
# =========================

def _extract_defaults(schema: dict) -> dict:
    """
    Walk a schema category and return a plain {key: default_value} dict.
    Descriptors without "default" (e.g. link, status) are skipped.
    """
    result = {}
    for key, descriptor in schema.items():
        if not isinstance(descriptor, dict) or "type" not in descriptor:
            continue
        if "default" in descriptor:
            result[key] = copy.deepcopy(descriptor["default"])
    return result


def _build_full_defaults() -> dict:
    """Derive defaults from all schemas (core + plugins)."""
    result = {}
    for category, schema in _build_full_schema().items():
        result[category] = _extract_defaults(schema)
    return result


def _build_full_schema() -> dict:
    """Merge core schema + all registered plugin schemas."""
    result = copy.deepcopy(_CORE_SCHEMA)
    for name, schema in _plugin_schemas.items():
        result[name] = copy.deepcopy(schema)
    return result


def resolve_dynamic_options(schema: dict) -> dict:
    """
    Return a copy of the schema with dynamic option loaders resolved to
    their actual values. Call this when sending the schema to the frontend.
    """
    _dynamic_loaders = {
        "dynamic:get_available_languages": get_available_languages,
    }
    resolved = copy.deepcopy(schema)
    for category, fields in resolved.items():
        for key, descriptor in fields.items():
            if isinstance(descriptor, dict):
                opts = descriptor.get("options")
                if isinstance(opts, str) and opts in _dynamic_loaders:
                    descriptor["options"] = _dynamic_loaders[opts]()
    return resolved


# =========================
# PLUGIN REGISTRATION
# =========================

def register_plugin_settings(plugin_name: str, plugin_schema: dict):
    """
    Register a plugin's schema.
    plugin_schema format mirrors _CORE_SCHEMA categories:
      {
        "my_setting": {"type": "boolean", "default": True},
        ...
      }
    """
    _plugin_schemas[plugin_name] = copy.deepcopy(plugin_schema)
    _invalidate_cache()


def unregister_plugin_settings(plugin_name: str):
    _plugin_schemas.pop(plugin_name, None)
    _invalidate_cache()


# =========================
# RUNTIME CACHE
# =========================

_cache: dict | None = None


def _invalidate_cache():
    global _cache
    _cache = None


def _apply_overrides(defaults: dict, overrides: dict) -> dict:
    result = copy.deepcopy(defaults)
    for key, default_value in defaults.items():
        if key not in overrides:
            continue
        override_value = overrides[key]
        if isinstance(default_value, dict) and isinstance(override_value, dict):
            result[key] = _apply_overrides(default_value, override_value)
        elif isinstance(default_value, dict) or isinstance(override_value, dict):
            result[key] = copy.deepcopy(override_value)
        elif type(override_value) is type(default_value):
            result[key] = override_value
    return result


def _compute_delta(defaults: dict, resolved: dict) -> dict:
    delta = {}
    for key, default_value in defaults.items():
        resolved_value = resolved.get(key)
        if isinstance(default_value, dict) and isinstance(resolved_value, dict):
            nested = _compute_delta(default_value, resolved_value)
            if nested:
                delta[key] = nested
        elif resolved_value != default_value:
            delta[key] = resolved_value
    return delta


def _load_overrides() -> dict:
    if not os.path.exists(SETTINGS_PATH):
        return {}
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _write_overrides(delta: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(delta, f, indent=4)


def _resolve() -> dict:
    global _cache
    full_defaults = _build_full_defaults()
    overrides = _load_overrides()
    _cache = _apply_overrides(full_defaults, overrides)
    return _cache


# =========================
# PUBLIC API
# =========================

def get_settings(category: str | None = None, specific_setting: str | None = None):
    """
    get_settings()                    → full resolved dict
    get_settings("neodeck")           → category dict
    get_settings("neodeck", "port")   → single value
    """
    global _cache
    resolved = _cache if _cache is not None else _resolve()

    if category is None:
        return copy.deepcopy(resolved)

    cat = resolved.get(category, {})
    if specific_setting is None:
        return copy.deepcopy(cat)

    return cat.get(specific_setting)


def save_settings(updates: dict):
    global _cache
    resolved = _cache if _cache is not None else _resolve()

    new_resolved = _apply_overrides(resolved, updates)
    for key, value in updates.items():
        if key not in resolved and isinstance(value, dict):
            new_resolved[key] = copy.deepcopy(value)

    full_defaults = _build_full_defaults()
    delta = _compute_delta(full_defaults, new_resolved)
    _write_overrides(delta)
    _cache = new_resolved
    return new_resolved


def get_default_settings() -> dict:
    return _build_full_defaults()


def get_schema() -> dict:
    """
    Returns the full schema with dynamic options resolved.
    Pass this to the frontend instead of default_settings.
    """
    return resolve_dynamic_options(_build_full_schema())


# =========================
# CONVENIENCE ACCESSORS — unchanged signatures
# =========================

def get_base_settings():
    return get_settings("neodeck")


def get_port():
    return get_settings("neodeck", "port") or 5000


# Snapshot at import time. Live code should call get_settings() directly.
loaded_settings = get_settings()