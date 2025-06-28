import os
import json
from app.utils.working_dir import get_base_dir
BASE_DIR = get_base_dir()



def get_availeable_languages():
    languages = {}

    for root, dirs, files in os.walk(os.path.join(BASE_DIR, "webdeck", "translations")):
        for index, file in enumerate(files):
            if file.endswith(".lang"):
                languages[index] = file.split(".")[0]
    
    return languages


def write_default_settings():
    with open(os.path.join(BASE_DIR, ".config/settings.json"), "w", encoding="utf-8") as f:
        def_settings= { 
            "webdeck": {
                "server": "flask",
                "plugins_repo": "Dalinnar/NeoDeck-plugins",
                "open_settings_in_integrated_browser": False,
                "ear_soundboard": True,
                "allowed_networks": [],
                "data_transfer_method": "http",
                "ip": "0.0.0.0",
                "dev_mode": False,
                "windows_start_menu_shortcut": False,
                "show_popup": False,
                "auto_updates": True,
                "gpu_method": "nvidia (pynvml)",
                "update_channel": "stable",
                "windows_startup": True,
                "flask_debug": True,
                "flask_secret_key": "secret",
                "update_repo": "dalinnar",
                "show_console": False,
                "optimized_usage_display": False,
                "flask_reloader": True,
                "fix_stop_soundboard": False,
                "app_admin": True,
                "port": "59997",
                "sort_colors_on_startup": False,
                "automatic_firewall_bypass": False,
                "language": "en_US",
                "netmask": "16"
        }
    }
        json.dump(def_settings, f, indent=4)
           


def get_settings(category=None, specific_setting=None):
    """Obtiene la configuración guardada y permite acceder a categorías y ajustes específicos."""
    settings_path = os.path.join(BASE_DIR, ".config/settings.json")
    try:
        with open(settings_path, "r", encoding="utf-8") as f:
            settings = json.load(f) 
        if category is not None:
            settings = settings.get(category, {})  
            if specific_setting is not None:
                return settings.get(specific_setting, None)          
        return settings
    except (FileNotFoundError, json.JSONDecodeError) as e:
        write_default_settings()
        return get_settings()
    
def get_default_settings():
    """returns a python type dyct with the sum of all settings"""
    return default_settings
    
def get_base_settings():
    """returns only the base settings"""
    return get_settings()["webdeck"]

def load_settings(settings):
    if not settings:
        return
    # Elimina claves con valor vacío
    cleaned_settings = {k: v for k, v in settings.items() if v != ""}

    with open(os.path.join(BASE_DIR, ".config", "settings.json"), "w") as f:
        json.dump(cleaned_settings, f, indent=4)
    return cleaned_settings
base_settings = {
        "ip": "0.0.0.0",
        "port": 59997,
        "language": get_availeable_languages(),
        "show_popup": False,
        "windows_startup": True,
        "windows_start_menu_shortcut": False,
        "auto_updates": True,
        "update_channel": "stable",
        "update_repo": "Lenochxd/WebDeck",
        "plugins_repo" : "Dalinnar/NeoDeck-plugins",
        "dev_mode": False,
        "server": "flask",
        "flask_debug": True,
        "flask_reloader": False,
        "flask_secret_key": "secret",
        "app_admin": True,
        "optimized_usage_display": False,
        "gpu_method": "nvidia (pynvml)",
        "show_console": False,
        "open_settings_in_integrated_browser": False,
        "data_transfer_method": "http",
        "automatic_firewall_bypass": False,
        "sort_colors_on_startup": False,
        "fix_stop_soundboard": False,
        "ear_soundboard": True,
        "allowed_networks": [],
        "netmask": "16"
    }


#append the default settings 
loaded_settings = get_settings()

default_settings = {}
default_settings["webdeck"] = base_settings