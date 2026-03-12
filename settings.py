import os
import json
from app.utils.working_dir import get_base_dir

BASE_DIR = get_base_dir()
CONFIG_DIR = os.path.join(BASE_DIR, ".config")
SETTINGS_PATH = os.path.join(CONFIG_DIR, "settings.json")


# =========================
# Helpers
# =========================

def get_available_languages():
    """
    Returns available languages as a dict:
    { "en_US": "en_US.lang", ... }
    """
    translations_path = os.path.join(BASE_DIR, "neodeck", "translations")
    languages = {}

    if not os.path.exists(translations_path):
        return languages

    for file in os.listdir(translations_path):
        if file.endswith(".lang"):
            lang = file.rsplit(".", 1)[0]
            languages[lang] = file

    return languages


def merge_defaults(defaults, current):
    """
    Recursively merge defaults into current settings.
    User values always win.
    """
    if not isinstance(defaults, dict):
        return current

    result = dict(defaults)

    for key, value in current.items():
        if (
            key in result
            and isinstance(result[key], dict)
            and isinstance(value, dict)
        ):
            result[key] = merge_defaults(result[key], value)
        else:
            result[key] = value

    return result


# =========================
# DEFAULT SETTINGS
# =========================

DEFAULT_SETTINGS = {
    "neodeck": {
        "server": "flask",
        "plugins_repo": "Dalinnar/NeoDeck-plugins",
        "update_repo": "Dalinnar/NeoDeck",
        "update_channel": "stable",

        "ip": "0.0.0.0",
        "port": 59997,

        "language": "en_US",

        "data_transfer_method": "http",
        "allowed_networks": [],
        "netmask": "16",

        "auto_updates": True,
        "dev_mode": False,

        "windows_startup": True,
        "windows_start_menu_shortcut": False,
        "open_settings_in_integrated_browser": False,

        "show_popup": True,
        "show_console": False,
        "optimized_usage_display": False,

        "ear_soundboard": True,
        "fix_stop_soundboard": False,

        "gpu_method": "nvidia (pynvml)",

        "automatic_firewall_bypass": False,
        "sort_colors_on_startup": False,

        "flask_debug": False,
        "flask_reloader": False,
        "flask_secret_key": "secret",
        "use_root_plugins": False,
        "app_admin": False,
    }
}


# =========================
# IO FUNCTIONS
# =========================

def write_default_settings():
    """Write default settings to disk"""
    os.makedirs(CONFIG_DIR, exist_ok=True)

    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(DEFAULT_SETTINGS, f, indent=4)


def get_settings(category=None, specific_setting=None):
    """
    Load settings from disk and merge with defaults.
    """
    if not os.path.exists(SETTINGS_PATH):
        write_default_settings()

    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            user_settings = json.load(f)
    except json.JSONDecodeError:
        write_default_settings()
        user_settings = {}

    merged_settings = merge_defaults(DEFAULT_SETTINGS, user_settings)

    if category:
        merged_settings = merged_settings.get(category, {})
        if specific_setting:
            return merged_settings.get(specific_setting)

    return merged_settings


def save_settings(settings):
    """
    Save settings to disk.
    Assumes settings are already validated/merged.
    """
    os.makedirs(CONFIG_DIR, exist_ok=True)

    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=4)

    return settings


# =========================
# CONVENIENCE ACCESSORS
# =========================

def get_base_settings():
    """Returns neodeck settings only"""
    return get_settings("neodeck")


def get_port():
    return get_settings("neodeck", "port") or 5000


def get_default_settings():
    """Returns DEFAULT_SETTINGS (single source of truth)"""
    return DEFAULT_SETTINGS


# =========================
# INITIAL LOAD
# =========================

loaded_settings = get_settings()