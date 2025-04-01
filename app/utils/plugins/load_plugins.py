import os
import importlib.util
import shutil
import json
import sys
import re
from ..logger import log
from settings import BASE_DIR, load_settings, default_settings,get_settings,loaded_settings
from app.buttons.commands import command_map as base_commands
from app.buttons.commands import monitors_map as base_monitors

from app.utils.languages import load_lang_file
from app.functions import deep_merge

SATISFIED_INSTALLS = "satisfied_installs.txt"
PLUGINS_PATH = "plugins"
TEMP_PATH = os.path.join(BASE_DIR, ".temp")


def install_requirements(plugin_name, root):
    log.info(f"Installing requirements for plugin: {plugin_name}")
    try:
        os.system(f"pip install -r \"{os.path.join(root, 'requirements.txt')}\"")
        with open(SATISFIED_INSTALLS, "a", encoding="utf-8") as f:
            f.write(plugin_name + "\n")
    except Exception as e:
        log.exception(f"Failed to install requirements for plugin {plugin_name}: {e}")


def process_languages(root, plugins_translation_keywords):
    for file in os.listdir(root):
        if file.endswith(".lang"):
            lang_name = file[:-5]
            plugins_translation_keywords.setdefault(lang_name, {}).update(
                load_lang_file(lang_name, os.path.join(root, file))
            )

    lang_path = os.path.join(TEMP_PATH, "languages")
    os.makedirs(lang_path, exist_ok=True)
    for language, lang_dict in plugins_translation_keywords.items():
        with open(os.path.join(lang_path, f"{language}.lang"), "w", encoding="utf-8") as f:
            for key, value in lang_dict.items():
                f.write(f"{key}={value}\n")
        log.info(f"Loaded language file: {language}")


def load_plugin_module(app, root, file, plugin_name):
    module_name = file[:-3]
    module_path = os.path.join(root, file)

    spec = importlib.util.spec_from_file_location(module_name, module_path)
    plugin_module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = plugin_module
    spec.loader.exec_module(plugin_module)

    if hasattr(plugin_module, 'plugin'):
        app.register_blueprint(plugin_module.plugin)
        log.info(f"Loaded plugin: {plugin_name}")

def load_plugins(app):
    global loaded_settings
    if PLUGINS_PATH not in sys.path:
        sys.path.append(PLUGINS_PATH)

    satisfied_plugins = set()
    if os.path.exists(SATISFIED_INSTALLS):
        with open(SATISFIED_INSTALLS, "r", encoding="utf-8") as f:
            satisfied_plugins = set(f.read().splitlines())

    plugins_translation_keywords = {}
    try:
        with open("webdeck/commands.json", encoding="utf-8") as f:
            buttons = json.load(f)
    except Exception as e:
        log.warning(f"Error loading commands.json: {e}")
        return {}

    for root, dirs, files in os.walk(PLUGINS_PATH):
        plugin_name = re.sub(r'[^A-Za-z0-9_]', '_', os.path.basename(root))
        
        if root.endswith(".disabled"):
            log.info(f"Skipping disabled plugin folder: {root}")
            continue
        
        if root.endswith("assets"):
            shutil.copytree(root, TEMP_PATH, dirs_exist_ok=True)
            continue        
        if root.endswith("scripts"):
            shutil.copytree(root, TEMP_PATH, dirs_exist_ok=True)
            continue
        
        if "requirements.txt" in files and plugin_name not in satisfied_plugins:
            install_requirements(plugin_name, root)
        
        if root.endswith("languages"):
            process_languages(root, plugins_translation_keywords)
            continue
        
        for file in files:
            try:
                if file == "__init__.py":
                    load_plugin_module(app, root, file, plugin_name)
                elif file == "buttons.json":
                    with open(os.path.join(root, file), "r") as buttons_file:
                        plugin_buttons = json.load(buttons_file)
                        for mod_buttons in plugin_buttons.values():
                            for button_data in mod_buttons.values():
                                if "style" in button_data and "image" in button_data["style"]:
                                    button_data["style"]["image"] = f"/temp/{button_data['style']['image']}"
                        buttons.update(plugin_buttons)
            except Exception as e:
                log.warning(f"Error loading {file}: {e}")


    #load all the seetings , and the commands     
    for name, plugin in app.blueprints.items():
        if hasattr(plugin, 'command_map'):
            base_commands.update({k: v for k, v in plugin.command_map.items() if k not in base_commands})
        if hasattr(plugin, 'settings'):
            default_settings[name] = plugin.settings
        if hasattr(plugin, 'monitors'):
            base_monitors.update({k: v for k, v in plugin.monitors.items() if k not in base_monitors})       

    updated_default = deep_merge(default_settings, get_settings())
    loaded_settings = load_settings(updated_default)
    return buttons