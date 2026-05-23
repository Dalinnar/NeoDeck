import os
import subprocess
import importlib.util
import shutil
import json
import sys
import re
import zipfile
import tempfile
from pathlib import Path

from ..logger import log
from settings import BASE_DIR, get_settings, save_settings, get_default_settings,register_plugin_settings
from app.buttons.commands import command_map as base_commands
from app.buttons.commands import monitors_map as base_monitors
from app.buttons.commands import getter_map as base_getters
from app.utils.languages import load_lang_file
from app.functions import deep_merge
import customtkinter as ctk
from PIL import Image

SATISFIED_INSTALLS = "satisfied_installs.txt"
PLUGINS_PATH = "plugins"
TEMP_PATH = os.path.join(BASE_DIR, ".temp")


def get_user_python():
    log.info(f"installing plugin dependencies on : {sys.executable}")
    return [sys.executable]


def update_satisfied_installs(plugin_name, plugin_version):
    path = Path(SATISFIED_INSTALLS)
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    lines = [l for l in lines if not l.startswith(f"{plugin_name}==")]
    lines.append(f"{plugin_name}=={plugin_version}")
    path.write_text("\n".join(lines), encoding="utf-8")


def install_requirements(plugin_name, root, plugin_version):
    log.info(f"Installing requirements for plugin: {plugin_name} ({plugin_version})")
    try:
        req_path = os.path.join(root, "requirements.txt")
        subprocess.run(
            get_user_python() + ["-m", "pip", "install", "-r", req_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        update_satisfied_installs(plugin_name, plugin_version)
    except Exception as e:
        log.exception(f"Failed to install requirements for plugin {plugin_name}: {e}")


def extract_deck(deck_path):
    extract_path = tempfile.mkdtemp(prefix="deck_")
    try:
        with zipfile.ZipFile(deck_path, "r") as z:
            z.extractall(extract_path)
        log.info(f"Extracted plugin: {deck_path} -> {extract_path}")
    except Exception as e:
        log.error(f"Failed to extract deck {deck_path}: {e}")
    return extract_path


def read_plugin_version(init_path):
    try:
        content = Path(init_path).read_text(encoding="utf-8")
        match = re.search(r"plugin_version\s*=\s*['\"](.+?)['\"]", content)
        return match.group(1) if match else None
    except Exception:
        return None


def load_plugin_module(app, root, filename, plugin_name):
    module_name = f"{plugin_name}_{filename[:-3]}"
    spec = importlib.util.spec_from_file_location(module_name, os.path.join(root, filename))
    plugin_module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = plugin_module
    spec.loader.exec_module(plugin_module)

    if hasattr(plugin_module, "plugin"):
        app.register_blueprint(plugin_module.plugin)
        log.info(f"Loaded plugin blueprint: {plugin_name}")

    return getattr(plugin_module, "plugin_version", None)

def _get_satisfied_plugins():
    satisfied = {}
    path = Path(SATISFIED_INSTALLS)
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "==" in line:
                name, version = line.split("==", 1)
                satisfied[name] = version
    return satisfied


def _load_base_buttons():
    try:
        with open("neodeck/commands.json", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        log.warning(f"Error loading commands.json: {e}")
        return {}


def _setup_plugin_paths(plugin_name, temp_root):
    if temp_root not in sys.path:
        sys.path.append(temp_root)
    if plugin_name not in sys.modules:
        package = type(sys)(plugin_name)
        package.__path__ = [temp_root]
        sys.modules[plugin_name] = package


def _find_plugin_files(temp_root):
    init_path, req_root = None, None
    for root, dirs, files in os.walk(temp_root):
        if root.endswith(".disabled"):
            continue
        if "__init__.py" in files and not init_path:
            init_path = os.path.join(root, "__init__.py")
        if "requirements.txt" in files and not req_root:
            req_root = root
        if init_path and req_root:
            break
    return init_path, req_root


def _copy_assets(root, plugin_name):
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            source = os.path.join(dirpath, filename)
            rel = os.path.relpath(source, root)
            renamed = f"{plugin_name}__{rel.replace(os.sep, '__')}"
            dest = os.path.join(TEMP_PATH, renamed)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(source, dest)
    log.info(f"Copied assets/scripts for plugin {plugin_name}")


def _process_buttons_json(root, filename, plugin_name, buttons):
    try:
        with open(os.path.join(root, filename), "r", encoding="utf-8") as bf:
            plugin_buttons = json.load(bf)
        for mod_buttons in plugin_buttons.values():
            for btn in mod_buttons.values():
                if "image" in (style := btn.get("style", {})):
                    original = style["image"]
                    renamed = f"{plugin_name}__{original.replace('/', '__')}"
                    style["image"] = f"/temp/{renamed}"
        buttons.update(plugin_buttons)
    except Exception as e:
        log.warning(f"Error loading buttons.json: {e}")


def _load_plugin_content(app, temp_root, plugin_name, buttons, plugins_translation_keywords):
    for root, dirs, files in os.walk(temp_root):
        if root.endswith(".disabled"):
            continue

        base_name = os.path.basename(root)

        if base_name in ("assets", "scripts"):
            _copy_assets(root, plugin_name)
            continue

        if "__init__.py" in files:
            try:
                load_plugin_module(app, root, "__init__.py", plugin_name)
            except Exception as e:
                log.warning(f"Error loading __init__.py: {e}")

        if base_name == "languages":
            process_languages(root, plugins_translation_keywords)
            continue

        if "buttons.json" in files:
            _process_buttons_json(root, "buttons.json", plugin_name, buttons)


def show_plugin_upload_progress(total_plugins):
    """
    Display a progress popup while installing plugins.
    
    Args:
        total_plugins: Total number of plugins to install
    
    Returns:
        A dictionary with methods to update progress
    """
    progress_popup = ctk.CTk()
    progress_popup.wm_title("Plugin Installation")
    progress_popup.configure(bg='#1a1a1a')
    try:
        progress_popup.iconbitmap('static/icons/icon.ico')
    except:
        pass  # Icon file not found, continue without it
    
    progress_popup.geometry("500x250")
    progress_popup.resizable(False, False)
    
    # Position in bottom right corner
    screen_width = progress_popup.winfo_screenwidth()
    screen_height = progress_popup.winfo_screenheight()
    x = screen_width - (500 + 50)
    y = screen_height - (250 + 100)
    progress_popup.geometry(f"500x250+{x}+{y}")
    
    # Title
    title_label = ctk.CTkLabel(
        progress_popup,
        text="Installing Plugins",
        text_color='white',
        font=("Arial", 14, "bold")
    )
    title_label.pack(side="top", pady=(20, 10))
    
    # Progress label (plugin count)
    progress_label = ctk.CTkLabel(
        progress_popup,
        text="",
        text_color='white',
        font=("Arial", 12)
    )
    progress_label.pack(side="top", pady=5)
    
    # Status label (current action)
    status_label = ctk.CTkLabel(
        progress_popup,
        text="",
        text_color='#CCCCCC',
        font=("Arial", 10)
    )
    status_label.pack(side="top", pady=5)
    
    # Progress bar
    progress_bar = ctk.CTkProgressBar(progress_popup)
    progress_bar.set(0)
    progress_bar.pack(side="top", fill="x", padx=20, pady=10)
    
    # Info label
    info_label = ctk.CTkLabel(
        progress_popup,
        text="",
        text_color='#999999',
        font=("Arial", 9)
    )
    info_label.pack(side="top", pady=5)
    
    state = {
        "current_plugin": 0,
        "total_plugins": total_plugins,
        "is_closed": False
    }
    
    def update_progress(plugin_index, plugin_name, status_text, info_text=""):
        """Update the progress display."""
        if state["is_closed"]:
            return
        
        state["current_plugin"] = plugin_index
        progress_label.configure(text=f"Installing plugin {plugin_index}/{total_plugins}")
        status_label.configure(text=status_text)
        info_label.configure(text=info_text)
        
        progress = plugin_index / total_plugins
        progress_bar.set(progress)
        
        progress_popup.update()
    
    def close_popup():
        """Close the popup."""
        state["is_closed"] = True
        progress_popup.destroy()
    
    return {
        "update": update_progress,
        "close": close_popup,
        "window": progress_popup
    }


def load_plugins(app):
    """Load plugins from the plugins directory with progress tracking."""
    app.plugins = {"installed": {}}

    settings = get_settings()
    use_root_plugins = settings.get("neodeck", {}).get("use_root_plugins", False)
    if use_root_plugins:
        log.info("Using root plugins")

    if PLUGINS_PATH not in sys.path:
        sys.path.append(PLUGINS_PATH)

    satisfied_plugins = _get_satisfied_plugins()
    buttons = _load_base_buttons()
    plugins_translation_keywords = {}

    # Get list of plugins to load
    plugin_entries = [
        entry for entry in os.listdir(PLUGINS_PATH)
        if (use_root_plugins and os.path.isdir(os.path.join(PLUGINS_PATH, entry)))
        or (not use_root_plugins and entry.endswith(".deck"))
    ]

    # Show progress popup if there are plugins to load
    progress = None
    if plugin_entries:
        progress = show_plugin_upload_progress(len(plugin_entries))

    try:
        for idx, entry in enumerate(plugin_entries, 1):
            full_path = os.path.join(PLUGINS_PATH, entry)

            if use_root_plugins:
                plugin_name = re.sub(r"[^A-Za-z0-9_]", "_", entry)
                temp_root = full_path
            else:
                plugin_name = re.sub(r"[^A-Za-z0-9_]", "_", entry[:-5])
                temp_root = extract_deck(full_path)

            if progress:
                progress["update"](idx, plugin_name, f"Setting up {plugin_name}...", "Preparing files...")

            _setup_plugin_paths(plugin_name, temp_root)

            init_path, req_root = _find_plugin_files(temp_root)
            plugin_version = read_plugin_version(init_path) if init_path else None

            if progress:
                progress["update"](idx, plugin_name, f"Installing {plugin_name}...", "Installing dependencies...")

            if plugin_version and req_root and not use_root_plugins:
                if satisfied_plugins.get(plugin_name) != plugin_version:
                    install_requirements(plugin_name, req_root, plugin_version)

            if progress:
                progress["update"](idx, plugin_name, f"Loading {plugin_name}...", "Registering plugin...")

            if plugin_version:
                _load_plugin_content(app, temp_root, plugin_name, buttons, plugins_translation_keywords)
                app.plugins["installed"][plugin_name] = plugin_version
                log.info(f"Registered plugin: {plugin_name} v{plugin_version}")

        # Register plugin data
        
 
        for name, plugin in app.blueprints.items():
            if hasattr(plugin, "settings"):
                register_plugin_settings(name, plugin.settings)   # same call, new shape
            if hasattr(plugin, "command_map"):
                base_commands.update({k: v for k, v in plugin.command_map.items() if k not in base_commands})
            if hasattr(plugin, "monitors"):
                base_monitors.update({k: v for k, v in plugin.monitors.items() if k not in base_monitors})
            if hasattr(plugin, "getters"):
                base_getters.update({k: v for k, v in plugin.getters.items() if k not in base_getters})

    finally:
        # Close progress popup when done
        if progress:
            progress["close"]()

    return buttons


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
        output = "\n".join(f"{key}={value}" for key, value in lang_dict.items())
        Path(os.path.join(lang_path, f"{language}.lang")).write_text(output, encoding="utf-8")
        log.info(f"Loaded language file: {language}")


DECK_REGEX = re.compile(r"(?P<slug>.+)-v?(?P<version>[\d.]+)\.deck")

def update_plugin(dot_deck_url):
    """
    Install or update a plugin from a .deck URL.

    - New plugin → install
    - Existing plugin → update + backup
    """

    import urllib.request
    import urllib.error
    import tempfile

    try:
        # -----------------------------
        # Parse filename & identity
        # -----------------------------
        filename = dot_deck_url.split("/")[-1]
        log.info(f"Matching filename: {filename!r} against DECK_REGEX")
        match = DECK_REGEX.match(filename)
        log.info(f"Match result: {match}")

        if not match:
            return {
                "success": False,
                "message": "Invalid deck filename format (expected slug-vX.Y.Z.deck)"
            }

        plugin_slug = match.group("slug")
        new_version = match.group("version")

        plugin_name = re.sub(r"[^A-Za-z0-9_]", "_", plugin_slug)
        target_deck = os.path.join(PLUGINS_PATH, f"{plugin_name}.deck")

        os.makedirs(PLUGINS_PATH, exist_ok=True)
        os.makedirs(TEMP_PATH, exist_ok=True)

        # -----------------------------
        # Download deck to temp
        # -----------------------------
        with tempfile.NamedTemporaryFile(
            suffix=".deck", delete=False, dir=TEMP_PATH
        ) as tmp:
            temp_deck = tmp.name

        log.info(f"Downloading {plugin_name} v{new_version}")
        urllib.request.urlretrieve(dot_deck_url, temp_deck)

        # -----------------------------
        # Extract & inspect
        # -----------------------------
        extract_path = extract_deck(temp_deck)
        init_path, req_root = _find_plugin_files(extract_path)

        if not init_path:
            raise RuntimeError("Plugin entrypoint not found")

        detected_version = read_plugin_version(init_path)
        if detected_version and detected_version != new_version:
            raise RuntimeError(
                f"Version mismatch: filename={new_version}, plugin={detected_version}"
            )

        # -----------------------------
        # Existing plugin?
        # -----------------------------
        old_version = None
        backup_path = None

        if os.path.exists(target_deck):
            old_extract = extract_deck(target_deck)
            old_init, _ = _find_plugin_files(old_extract)
            old_version = read_plugin_version(old_init) if old_init else "unknown"
            shutil.rmtree(old_extract, ignore_errors=True)

            backup_path = os.path.join(
                PLUGINS_PATH, f"{plugin_name}.backup.{old_version}"
            )
            shutil.copy2(target_deck, backup_path)
            log.info(f"Backup created: {backup_path}")

        # -----------------------------
        # Atomic replace
        # -----------------------------
        tmp_target = f"{target_deck}.tmp"
        shutil.copy2(temp_deck, tmp_target)
        os.replace(tmp_target, target_deck)

        # -----------------------------
        # Install requirements
        # -----------------------------
        if req_root:
            install_requirements(plugin_name, req_root, new_version)

        # -----------------------------
        # Cleanup
        # -----------------------------
        shutil.rmtree(extract_path, ignore_errors=True)
        os.remove(temp_deck)

        action = "updated" if old_version else "installed"

        return {
            "success": True,
            "plugin_name": plugin_name,
            "version": new_version,
            "old_version": old_version,
            "action": action,
            "message": f"Plugin {plugin_name} {action} to v{new_version}",
            "backup_path": backup_path
        }

    except Exception as e:
        log.exception("Plugin install/update failed")
        return {
            "success": False,
            "plugin_name": plugin_name if "plugin_name" in locals() else "unknown",
            "message": str(e)
        }


def rollback_plugin(plugin_name):
    """
    Rollback a plugin to its previous backup version.
    
    Args:
        plugin_name: Name of the plugin to rollback
    
    Returns:
        dict: Status with keys 'success' (bool), 'message' (str)
    """
    try:
        # Find the backup file
        plugins = os.listdir(PLUGINS_PATH)
        deck_file = None
        
        for entry in plugins:
            entry_name = re.sub(r"[^A-Za-z0-9_]", "_", entry[:-5] if entry.endswith('.deck') else entry)
            if entry_name == plugin_name:
                deck_file = entry
                break
        
        if not deck_file:
            return {
                'success': False,
                'message': f'Plugin {plugin_name} not found'
            }
        
        backup_path = os.path.join(PLUGINS_PATH, f"{deck_file}.backup")
        current_path = os.path.join(PLUGINS_PATH, deck_file)
        
        if not os.path.exists(backup_path):
            return {
                'success': False,
                'message': f'No backup found for {plugin_name}'
            }
        
        # Restore from backup
        shutil.copy2(backup_path, current_path)
        log.info(f"Rolled back {plugin_name} to previous version")
        
        return {
            'success': True,
            'message': f'Successfully rolled back {plugin_name}'
        }
    
    except Exception as e:
        log.exception(f"Error rolling back plugin: {e}")
        return {
            'success': False,
            'message': f'Rollback failed: {str(e)}'
        }
    
def uninstall_plugin(plugin_name):
    try:
        removed_files = []

        # -----------------------------
        # Remove .deck files + backups
        # -----------------------------
        for entry in os.listdir(PLUGINS_PATH):
            sanitized = re.sub(
                r"[^A-Za-z0-9_]",
                "_",
                entry[:-5] if entry.endswith(".deck") else entry
            )

            if sanitized != plugin_name:
                continue

            full_path = os.path.join(PLUGINS_PATH, entry)

            try:
                if os.path.isfile(full_path):
                    os.remove(full_path)
                else:
                    shutil.rmtree(full_path, ignore_errors=True)

                removed_files.append(full_path)
                log.info(f"Removed plugin file: {full_path}")

            except Exception as e:
                log.warning(f"Failed removing {full_path}: {e}")

        # -----------------------------
        # Remove backups
        # -----------------------------
        for entry in os.listdir(PLUGINS_PATH):
            if entry.startswith(plugin_name) and ".backup" in entry:
                backup_path = os.path.join(PLUGINS_PATH, entry)

                try:
                    os.remove(backup_path)
                    removed_files.append(backup_path)
                    log.info(f"Removed backup: {backup_path}")
                except Exception as e:
                    log.warning(f"Failed removing backup {backup_path}: {e}")

        # -----------------------------
        # Remove temp assets/scripts
        # -----------------------------
        if os.path.exists(TEMP_PATH):
            for entry in os.listdir(TEMP_PATH):
                if entry.startswith(f"{plugin_name}__"):
                    path = os.path.join(TEMP_PATH, entry)

                    try:
                        if os.path.isfile(path):
                            os.remove(path)
                        else:
                            shutil.rmtree(path, ignore_errors=True)

                        removed_files.append(path)

                    except Exception as e:
                        log.warning(f"Failed removing temp asset {path}: {e}")

        # -----------------------------
        # Remove satisfied install entry
        # -----------------------------
        satisfied_path = Path(SATISFIED_INSTALLS)

        if satisfied_path.exists():
            lines = satisfied_path.read_text(
                encoding="utf-8"
            ).splitlines()

            lines = [
                l for l in lines
                if not l.startswith(f"{plugin_name}==")
            ]

            satisfied_path.write_text(
                "\n".join(lines),
                encoding="utf-8"
            )

            log.info(f"Removed satisfied install for {plugin_name}")

        # -----------------------------
        # Unload python modules
        # -----------------------------
        modules_to_remove = [
            name for name in sys.modules
            if name == plugin_name or name.startswith(f"{plugin_name}_")
        ]

        for module_name in modules_to_remove:
            try:
                del sys.modules[module_name]
                log.info(f"Unloaded module: {module_name}")
            except Exception as e:
                log.warning(f"Failed unloading module {module_name}: {e}")

        # -----------------------------
        # Remove settings
        # -----------------------------
        settings = get_settings()

        if plugin_name in settings:
            del settings[plugin_name]
            save_settings(settings)
            log.info(f"Removed settings for {plugin_name}")

        return {
            "success": True,
            "plugin_name": plugin_name,
            "removed_files": removed_files,
            "message": f"Plugin {plugin_name} uninstalled successfully"
        }

    except Exception as e:
        log.exception(f"Failed uninstalling plugin {plugin_name}")

        return {
            "success": False,
            "plugin_name": plugin_name,
            "message": str(e)
        }