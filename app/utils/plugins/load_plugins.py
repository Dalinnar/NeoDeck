import os
import importlib.util
import shutil
import json
import sys
import re
import zipfile
import tempfile

from ..logger import log
from settings import BASE_DIR, load_settings, default_settings, get_settings, loaded_settings
from app.buttons.commands import command_map as base_commands
from app.buttons.commands import monitors_map as base_monitors
from app.buttons.commands import getter_map as base_getters

from app.utils.languages import load_lang_file
from app.functions import deep_merge


SATISFIED_INSTALLS = "satisfied_installs.txt"
PLUGINS_PATH = "plugins"                # now contains *.deck files
TEMP_PATH = os.path.join(BASE_DIR, ".temp")


# ---------------------------------------------------------------------------
# Install plugin requirements
# ---------------------------------------------------------------------------
def install_requirements(plugin_name, root):
    log.info(f"Installing requirements for plugin: {plugin_name}")
    try:
        os.system(f"pip install -r \"{os.path.join(root, 'requirements.txt')}\"")
        with open(SATISFIED_INSTALLS, "a", encoding="utf-8") as f:
            f.write(plugin_name + "\n")
    except Exception as e:
        log.exception(f"Failed to install requirements for plugin {plugin_name}: {e}")


# ---------------------------------------------------------------------------
# Extract .deck plugin (zip)
# ---------------------------------------------------------------------------
def extract_deck(deck_path):
    """Extracts a .deck file (zip) into a new temp folder."""
    extract_path = tempfile.mkdtemp(prefix="deck_")
    try:
        with zipfile.ZipFile(deck_path, "r") as z:
            z.extractall(extract_path)
        log.info(f"Extracted plugin: {deck_path} -> {extract_path}")
    except Exception as e:
        log.error(f"Failed to extract deck {deck_path}: {e}")
    return extract_path


# ---------------------------------------------------------------------------
# Load Python module from plugin
# ---------------------------------------------------------------------------
def load_plugin_module(app, root, file, plugin_name):
    module_name = f"{plugin_name}_{file[:-3]}"
    module_path = os.path.join(root, file)

    spec = importlib.util.spec_from_file_location(module_name, module_path)
    plugin_module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = plugin_module
    spec.loader.exec_module(plugin_module)

    if hasattr(plugin_module, "plugin"):
        app.register_blueprint(plugin_module.plugin)
        log.info(f"Loaded plugin: {plugin_name}")


# ---------------------------------------------------------------------------
# Main plugin loader
# ---------------------------------------------------------------------------
def load_plugins(app):
    global loaded_settings
    if PLUGINS_PATH not in sys.path:
        sys.path.append(PLUGINS_PATH)

    satisfied_plugins = set()
    if os.path.exists(SATISFIED_INSTALLS):
        with open(SATISFIED_INSTALLS, "r", encoding="utf-8") as f:
            satisfied_plugins = set(f.read().splitlines())

    # Load core command definitions
    plugins_translation_keywords = {}
    try:
        with open("webdeck/commands.json", encoding="utf-8") as f:
            buttons = json.load(f)
    except Exception as e:
        log.warning(f"Error loading commands.json: {e}")
        return {}

    # ----------------------------------------------------------------------
    # NEW: load .deck plugins instead of folders
    # ----------------------------------------------------------------------
    for file in os.listdir(PLUGINS_PATH):
        if not file.endswith(".deck"):
            continue

        deck_path = os.path.join(PLUGINS_PATH, file)
        plugin_name = re.sub(r"[^A-Za-z0-9_]", "_", file[:-5])

        # Extract .deck into temporary folder
        temp_root = extract_deck(deck_path)

        # Walk extracted structure just like original plugin folders
        for root, dirs, files in os.walk(temp_root):

            # Skip disabled plugins
            if root.endswith(".disabled"):
                continue

            # ----------------------------------------------------------------------
            # ASSETS / SCRIPTS → copy into .temp with renamed paths
            # ----------------------------------------------------------------------
            if os.path.basename(root) in ("assets", "scripts"):
                for dirpath, _, filenames in os.walk(root):
                    for filename in filenames:
                        source_file = os.path.join(dirpath, filename)
                        rel_file = os.path.relpath(source_file, root)
                        renamed = f"{plugin_name}__{rel_file.replace(os.sep, '__')}"
                        dest_file = os.path.join(TEMP_PATH, renamed)

                        os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                        shutil.copy2(source_file, dest_file)

                log.info(f"Copied assets/scripts for plugin {plugin_name}")
                continue

            # ----------------------------------------------------------------------
            # Install requirements if needed
            # ----------------------------------------------------------------------
            if "requirements.txt" in files and plugin_name not in satisfied_plugins:
                install_requirements(plugin_name, root)

            # ----------------------------------------------------------------------
            # LANGUAGE FILES
            # ----------------------------------------------------------------------
            if os.path.basename(root) == "languages":
                process_languages(root, plugins_translation_keywords)
                continue

            # ----------------------------------------------------------------------
            # PYTHON MODULES + buttons.json
            # ----------------------------------------------------------------------
            for file in files:
                try:
                    if file == "__init__.py":
                        load_plugin_module(app, root, file, plugin_name)

                    elif file == "buttons.json":
                        with open(os.path.join(root, file), "r") as bf:
                            plugin_buttons = json.load(bf)

                            # Rewrite image paths to /temp/
                            for mod_buttons in plugin_buttons.values():
                                for button_data in mod_buttons.values():
                                    if "style" in button_data and "image" in button_data["style"]:
                                        original_image = button_data["style"]["image"]
                                        renamed_image = f"{plugin_name}__{original_image.replace('/', '__')}"
                                        button_data["style"]["image"] = f"/temp/{renamed_image}"

                            buttons.update(plugin_buttons)

                except Exception as e:
                    log.warning(f"Error loading {file}: {e}")

        # Optional: delete extracted content
        # shutil.rmtree(temp_root)

    # ----------------------------------------------------------------------
    # Load all settings & commands from plugins
    # ----------------------------------------------------------------------
    for name, plugin in app.blueprints.items():
        if hasattr(plugin, "settings"):
            default_settings[name] = plugin.settings
        if hasattr(plugin, "command_map"):
            base_commands.update({k: v for k, v in plugin.command_map.items() if k not in base_commands})
        if hasattr(plugin, "monitors"):
            base_monitors.update({k: v for k, v in plugin.monitors.items() if k not in base_monitors})
        if hasattr(plugin, "getters"):
            base_getters.update({k: v for k, v in plugin.getters.items() if k not in base_getters})

    updated_default = deep_merge(default_settings, get_settings())
    loaded_settings = load_settings(updated_default)

    return buttons


# ---------------------------------------------------------------------------
# LANGUAGE PROCESSOR (unchanged)
# ---------------------------------------------------------------------------
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
