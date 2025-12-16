import os
import subprocess
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
# Utility: detect user Python
# ---------------------------------------------------------------------------
def get_user_python():
    try:
        subprocess.run(
            ["py", "-3.12", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        return ["py", "-3.12"]
    except:
        pass

    try:
        subprocess.run(
            ["python", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        return ["python"]
    except:
        pass

    raise RuntimeError("No Python 3.12 installation found.")


# ---------------------------------------------------------------------------
# Save or update installed plugin version
# ---------------------------------------------------------------------------
def update_satisfied_installs(plugin_name, plugin_version):
    lines = []
    if os.path.exists(SATISFIED_INSTALLS):
        with open(SATISFIED_INSTALLS, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()

    # Remove older versions for this plugin
    lines = [l for l in lines if not l.startswith(plugin_name + "==")]

    # Add new version
    lines.append(f"{plugin_name}=={plugin_version}")

    with open(SATISFIED_INSTALLS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# ---------------------------------------------------------------------------
# Install plugin requirements
# ---------------------------------------------------------------------------
def install_requirements(plugin_name, root, plugin_version):
    log.info(f"Installing requirements for plugin: {plugin_name} ({plugin_version})")

    try:
        python_exe = get_user_python()
        req_path = os.path.join(root, "requirements.txt")

        subprocess.run(
            python_exe + ["-m", "pip", "install", "-r", req_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )

        update_satisfied_installs(plugin_name, plugin_version)

    except Exception as e:
        log.exception(f"Failed to install requirements for plugin {plugin_name}: {e}")


# ---------------------------------------------------------------------------
# Extract .deck file
# ---------------------------------------------------------------------------
def extract_deck(deck_path):
    extract_path = tempfile.mkdtemp(prefix="deck_")
    try:
        with zipfile.ZipFile(deck_path, "r") as z:
            z.extractall(extract_path)
        log.info(f"Extracted plugin: {deck_path} -> {extract_path}")
    except Exception as e:
        log.error(f"Failed to extract deck {deck_path}: {e}")
    return extract_path


# ---------------------------------------------------------------------------
# Load Python module and return plugin_version
# ---------------------------------------------------------------------------
def load_plugin_module(app, root, filename, plugin_name):
    module_name = f"{plugin_name}_{filename[:-3]}"
    module_path = os.path.join(root, filename)

    spec = importlib.util.spec_from_file_location(module_name, module_path)
    plugin_module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = plugin_module
    spec.loader.exec_module(plugin_module)

    version = None

    if hasattr(plugin_module, "plugin"):
        app.register_blueprint(plugin_module.plugin)
        log.info(f"Loaded plugin blueprint: {plugin_name}")

    if hasattr(plugin_module, "plugin_version"):
        version = plugin_module.plugin_version

    return version


# ---------------------------------------------------------------------------
# Main plugin loader
# ---------------------------------------------------------------------------
def load_plugins(app):
    global loaded_settings

    if PLUGINS_PATH not in sys.path:
        sys.path.append(PLUGINS_PATH)

    # Load installed plugin versions
    satisfied_plugins = {}

    if os.path.exists(SATISFIED_INSTALLS):
        with open(SATISFIED_INSTALLS, "r", encoding="utf-8") as f:
            for line in f.read().splitlines():
                if "==" in line:
                    name, version = line.split("==", 1)
                    satisfied_plugins[name] = version

    # Load base button definitions
    plugins_translation_keywords = {}
    try:
        with open("neodeck/commands.json", encoding="utf-8") as f:
            buttons = json.load(f)
    except Exception as e:
        log.warning(f"Error loading commands.json: {e}")
        return {}

    # ----------------------------------------------------------
    # Load all plugins
    # ----------------------------------------------------------
    for file in os.listdir(PLUGINS_PATH):
        if not file.endswith(".deck"):
            continue

        deck_path = os.path.join(PLUGINS_PATH, file)
        plugin_name = re.sub(r"[^A-Za-z0-9_]", "_", file[:-5])

        # Extract plugin
        temp_root = extract_deck(deck_path)
        if temp_root not in sys.path:
            sys.path.append(temp_root)

        # Create virtual package
        if plugin_name not in sys.modules:
            package = type(sys)(plugin_name)
            package.__path__ = [temp_root]
            sys.modules[plugin_name] = package

        plugin_version = None

        # Walk extracted files
        for root, dirs, files in os.walk(temp_root):

            if root.endswith(".disabled"):
                continue

            base_name = os.path.basename(root)

            # Copy assets/scripts
            if base_name in ("assets", "scripts"):
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

            # Python init file ⇒ load module and get version
            if "__init__.py" in files:
                try:
                    plugin_version = load_plugin_module(app, root, "__init__.py", plugin_name)
                except Exception as e:
                    log.warning(f"Error loading __init__.py: {e}")

            # Requirements installation
            if plugin_version:
                installed_version = satisfied_plugins.get(plugin_name)
                needs_install = (installed_version != plugin_version)

                if "requirements.txt" in files and needs_install:
                    install_requirements(plugin_name, root, plugin_version)

            # Language files
            if base_name == "languages":
                process_languages(root, plugins_translation_keywords)
                continue

            # buttons.json merging
            for filename in files:
                if filename == "buttons.json":
                    try:
                        with open(os.path.join(root, filename), "r") as bf:
                            plugin_buttons = json.load(bf)

                            # Fix images to /temp/
                            for mod_buttons in plugin_buttons.values():
                                for btn in mod_buttons.values():
                                    style = btn.get("style", {})
                                    if "image" in style:
                                        original = style["image"]
                                        renamed = f"{plugin_name}__{original.replace('/', '__')}"
                                        style["image"] = f"/temp/{renamed}"

                            buttons.update(plugin_buttons)

                    except Exception as e:
                        log.warning(f"Error loading buttons.json: {e}")

    # ----------------------------------------------------------
    # Load plugin settings/commands/monitors
    # ----------------------------------------------------------
    for name, plugin in app.blueprints.items():
        if hasattr(plugin, "settings"):
            default_settings[name] = plugin.settings

        if hasattr(plugin, "command_map"):
            base_commands.update({k: v for k, v in plugin.command_map.items()
                                  if k not in base_commands})

        if hasattr(plugin, "monitors"):
            base_monitors.update({k: v for k, v in plugin.monitors.items()
                                  if k not in base_monitors})

        if hasattr(plugin, "getters"):
            base_getters.update({k: v for k, v in plugin.getters.items()
                                 if k not in base_getters})

    # ----------------------------------------------------------
    # Merge user settings
    # ----------------------------------------------------------
    updated_default = deep_merge(default_settings, get_settings())
    loaded_settings = load_settings(updated_default)

    return buttons


# ---------------------------------------------------------------------------
# Language processor
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
