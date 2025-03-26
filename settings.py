import os
import json
from app.utils.working_dir import get_base_dir


BASE_DIR = get_base_dir()
default_settings = {}
loaded_settings = {}

def get_availeable_languages():
    languages = {}

    for root, dirs, files in os.walk(os.path.join(BASE_DIR, "webdeck", "translations")):
        for index, file in enumerate(files):
            if file.endswith(".lang"):
                languages[index] = file.split(".")[0]
    
    return languages

#this gets all the saved settings,
def get_settings():
    with open(os.path.join(BASE_DIR, ".config/settings.json"), "r", encoding="utf-8") as f:
        json_data = f.read()
        return json.loads(json_data)
    

def load_settings(settings):
    """
    passing the settings, saves them on the json
    """
    with open(os.path.join(get_base_dir(), ".config","settings.json"), "w") as f:
        json.dump(settings, f, indent=4)
    
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
default_settings["webdeck"] = base_settings