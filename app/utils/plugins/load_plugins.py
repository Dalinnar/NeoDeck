"""
Loads and manages plugins for the WebDeck application.

This module is responsible for dynamically loading and managing plugins for the WebDeck application. It scans the `.config/plugins` directory for Python modules, copies them to a temporary directory, and then imports and initializes them. The loaded plugins are then made available to the application through the `commands` and `all_func` dictionaries.

The `load_plugins` function is the main entry point for this module, taking a `commands` dictionary as input and returning an updated version of it, along with the `all_func` dictionary containing all the loaded plugin functions.
"""
import os
import importlib
import shutil
import json
import sys
from ..logger import log
from settings import BASE_DIR
from app.buttons.commands import command_map as base_commands
from app.utils.languages import load_lang_file


SATISFIED_INSTALLS = "satisfied_installs.txt"

def load_plugins(app):
    plugins_path = "plugins"
    plugins_translation_keywords = {}

    if plugins_path not in sys.path:
        sys.path.append(plugins_path)

    global base_commands
    satisfied_plugins = set()

    # Cargar plugins ya instalados previamente
    if os.path.exists(SATISFIED_INSTALLS):
        with open(SATISFIED_INSTALLS, "r", encoding="utf-8") as f:
            satisfied_plugins = set(f.read().splitlines())

    try:
        with open("webdeck/commands.json", encoding="utf-8") as f:
            buttons = json.load(f)

        for root, dirs, files in os.walk(plugins_path):
            if root.endswith(".disabled"):
                log.info(f"Skipping disabled plugin folder: {root}")
                continue
            if root.endswith("assets"):                
                shutil.copytree(root, os.path.join(BASE_DIR, ".temp"), dirs_exist_ok=True)
                continue

            plugin_name = os.path.basename(root)

            if "requirements.txt" in files and plugin_name not in satisfied_plugins:
                try:
                    log.info(f"Installing requirements for plugin: {plugin_name}")
                    os.system(f"pip install -r \"{os.path.join(root, 'requirements.txt')}\"")
                    log.info(f"Installed requirements for plugin: {plugin_name}")

                    # Registrar el plugin como instalado
                    with open(SATISFIED_INSTALLS, "a", encoding="utf-8") as f:
                        f.write(plugin_name + "\n")

                except Exception as e:
                    log.exception(f"Failed to install requirements for plugin {plugin_name}: {e}")
                    continue

            if root.endswith("languages"):
                for file in os.listdir(root):
                    if file.endswith(".lang"):
                        plugin_langdict = load_lang_file(file[:-5], os.path.join(root, file))                        
                        plugins_translation_keywords.setdefault(file[:-5], {}).update(plugin_langdict)

                os.makedirs(os.path.join(BASE_DIR, ".temp", "languages"), exist_ok=True)
                for language, lang_dict in plugins_translation_keywords.items():
                    with open(os.path.join(BASE_DIR, ".temp", "languages", f"{language}.lang"), "w", encoding="utf-8") as f:
                        for key, value in lang_dict.items():
                            f.write(f"{key}={value}\n")
                    log.info(f"Loaded language file: {language}")

            for file in files:
                try:
                    if file.endswith(".py"):
                        module_name = file[:-3]  # Remover ".py"
                        module_path = os.path.join(root, file)

                        spec = importlib.util.spec_from_file_location(module_name, module_path)
                        plugin_module = importlib.util.module_from_spec(spec)
                        sys.modules[module_name] = plugin_module
                        spec.loader.exec_module(plugin_module)

                        # Si el módulo tiene un 'command_map', actualizar los comandos
                        if hasattr(plugin_module, 'command_map'):
                            for key, function in plugin_module.command_map.items():
                                base_commands[key] = function if key not in base_commands else base_commands[key]
                            log.info(f"Loaded plugin: {module_name}")

                        if hasattr(plugin_module, 'plugin_template_bp'):
                            app.register_blueprint(plugin_module.plugin_template_bp)

                    elif file == "buttons.json":
                        with open(os.path.join(root, file), "r") as buttons_file:                   
                            plugin_buttons = json.load(buttons_file)
                            for module_name, mod_buttons in plugin_buttons.items():
                                for button_name, button_data in mod_buttons.items():
                                    if "style" in button_data and "image" in button_data["style"]:
                                        button_data["style"]["image"] = f"/temp/{button_data['style']['image']}"
                            buttons.update(plugin_buttons)

                except Exception as e:
                    log.warning(f"Error loading {file}: {e}")

        return buttons

    except Exception as e:
        log.warning(f"Unexpected error loading plugins: {e}")
        return {}