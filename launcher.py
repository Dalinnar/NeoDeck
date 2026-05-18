import sys
import os
import subprocess
import threading
import ctypes
import json
import urllib.request
import hashlib

from launcher_ui import StatusWindow

NO_WIN = subprocess.CREATE_NO_WINDOW

REPO_URL = "https://github.com/Dalinnar/NeoDeck"

# =========================
# LOG ERROR
# =========================

def log_error(msg, base_dir):
    log_path = os.path.join(base_dir, "error.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# =========================
# SINGLE INSTANCE
# =========================

def ensure_single_instance(name):
    kernel32 = ctypes.windll.kernel32
    mutex = kernel32.CreateMutexW(None, False, name)
    if kernel32.GetLastError() == 183:
        sys.exit(0)

# =========================
# VERSION
# =========================

def read_local_version(base_dir):
    path = os.path.join(base_dir, "version.txt")
    if not os.path.exists(path):
        return "0.0.0"
    return open(path).read().strip()

def parse(v):
    return tuple(map(int, v.split(".")))

def github_api_url():
    return "https://api.github.com/repos/Dalinnar/NeoDeck"

def github_request(url):
    return urllib.request.Request(
        url,
        headers={
            "User-Agent": "NeoDeck",
            "Accept": "application/vnd.github+json",
        },
    )

def get_remote_version():
    with urllib.request.urlopen(github_request(github_api_url() + "/releases/latest")) as r:
        data = json.load(r)
    return data["tag_name"].lstrip("v")

# =========================
# WINDOWS MESSAGEBOX
# =========================

def ask_update(version):
    MB_YESNO = 0x04
    MB_ICONQUESTION = 0x20
    IDYES = 6

    msg = f"A new version ({version}) is available.\nDo you want to update now?"
    result = ctypes.windll.user32.MessageBoxW(0, msg, "Update NeoDeck", MB_YESNO | MB_ICONQUESTION)
    return result == IDYES

def show_python_install_error():
    """Shows error dialog when Python 3.11 installation fails and prompts manual install."""
    MB_OKCANCEL = 0x01
    MB_ICONERROR = 0x10
    IDOK = 1

    msg = (
        "Failed to automatically install Python 3.11.\n\n"
        "Please install Python 3.11 manually from:\n"
        "https://www.python.org/downloads/release/python-3119/\n\n"
        "Make sure to check 'Add Python to PATH' during installation.\n\n"
        "Click OK to open the download page in your browser."
    )
    result = ctypes.windll.user32.MessageBoxW(0, msg, "Python Installation Required", MB_OKCANCEL | MB_ICONERROR)

    if result == IDOK:
        import webbrowser
        webbrowser.open("https://www.python.org/downloads/release/python-3119/")

    return False

# =========================
# ADMIN ELEVATION
# =========================

def is_admin():
    """Returns True if the current process has administrator privileges."""
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False

def relaunch_as_admin(base_dir):
    """
    Re-launches the current executable requesting UAC elevation.
    Returns True if ShellExecuteW succeeded (user accepted UAC prompt),
    False if the user cancelled or an error occurred.
    """
    executable = sys.executable
    # Rebuild argument list, skipping the executable itself
    params = " ".join(f'"{a}"' if " " in a else a for a in sys.argv)

    try:
        result = ctypes.windll.shell32.ShellExecuteW(
            None,       # hwnd
            "runas",    # verb — triggers UAC prompt
            executable, # program to run
            params,     # arguments
            base_dir,   # working directory
            1,          # SW_SHOWNORMAL
        )
        # ShellExecuteW returns a value > 32 on success
        return result > 32
    except Exception as e:
        log_error(f"[ADMIN] ShellExecuteW failed: {e}", base_dir)
        return False

def read_launch_as_admin(base_dir):
    """
    Reads the app_admin setting from settings.json (or whichever
    config file your project uses). Returns True/False.
    Adapt the path/key to match your actual settings file.
    """
    settings_path = os.path.join(base_dir, "settings.json")
    if not os.path.exists(settings_path):
        return False
    try:
        with open(settings_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return bool(data.get("app_admin", False))
    except Exception:
        return False

# =========================
# PYTHON FINDER
# =========================

def install_python_311(base_dir):
    url = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    installer = os.path.join(base_dir, "python_installer.exe")
    urllib.request.urlretrieve(url, installer)
    subprocess.run([
        installer,
        "/quiet",
        "InstallAllUsers=0",
        "PrependPath=1",
        "Include_launcher=1"
    ], check=True)
    os.remove(installer)

def find_python(is_console=False, base_dir=""):
    """Find a system-level Python 3.11 to use for creating the venv."""
    log_error("[FIND_PYTHON] Starting Python 3.11 search...", base_dir)

    try:
        log_error("[FIND_PYTHON] Attempting: py -3.11 --version", base_dir)
        subprocess.run(
            ["py", "-3.11", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        log_error("[FIND_PYTHON] ✓ Found py -3.11", base_dir)
        return ["py", "-3.11"]
    except Exception as e:
        log_error(f"[FIND_PYTHON] ✗ py -3.11 not found: {e}", base_dir)

    log_error("[FIND_PYTHON] Python 3.11 not found, attempting installation...", base_dir)
    try:
        install_python_311(base_dir)
    except Exception as e:
        log_error(f"[FIND_PYTHON] ✗ Installation failed: {e}", base_dir)
        show_python_install_error()
        raise RuntimeError("Python 3.11 installation failed. Please install manually.")

    log_error("[FIND_PYTHON] Verifying installation: py -3.11 --version", base_dir)
    try:
        subprocess.run(
            ["py", "-3.11", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        log_error("[FIND_PYTHON] ✓ Python 3.11 verified and ready", base_dir)
        return ["py", "-3.11"]
    except Exception as e:
        log_error(f"[FIND_PYTHON] ✗ Verification failed: {e}", base_dir)
        show_python_install_error()
        raise RuntimeError("Python 3.11 installation failed. Please install manually.")

# =========================
# VENV
# =========================

def get_venv_python(base_dir):
    """Returns the path to the venv Python executable."""
    if sys.platform == "win32":
        return os.path.join(base_dir, ".venv", "Scripts", "python.exe")
    return os.path.join(base_dir, ".venv", "bin", "python")


def ensure_venv(base_dir, is_console, status):
    """
    Ensures a .venv exists in base_dir, creating it if necessary.
    Returns a list suitable for use as the python prefix in subprocess calls,
    e.g. ['/path/to/.venv/Scripts/python.exe'].
    """
    venv_python = get_venv_python(base_dir)
    venv_dir = os.path.join(base_dir, ".venv")

    if not os.path.exists(venv_python):
        log_error("[VENV] No venv found, creating one...", base_dir)
        status("Creating virtual environment...")

        base_python = find_python(is_console=is_console, base_dir=base_dir)

        try:
            subprocess.run(
                base_python + ["-m", "venv", venv_dir],
                check=True,
                creationflags=0 if is_console else NO_WIN,
            )
            log_error(f"[VENV] ✓ Created venv at: {venv_dir}", base_dir)
        except subprocess.CalledProcessError as e:
            log_error(f"[VENV] ✗ Failed to create venv: {e}", base_dir)
            raise RuntimeError(f"Failed to create virtual environment: {e}")
    else:
        log_error(f"[VENV] ✓ Existing venv found at: {venv_dir}", base_dir)

    return [venv_python]

# =========================
# DEPS
# =========================

def hash_file(p):
    h = hashlib.sha256()
    h.update(open(p, "rb").read())
    return h.hexdigest()

def install_deps(python, base_dir, is_console, status):
    log_error("[INSTALL_DEPS] Starting dependency installation...", base_dir)
    log_error(f"[INSTALL_DEPS] Python executable: {python}", base_dir)
    log_error(f"[INSTALL_DEPS] Working directory: {base_dir}", base_dir)

    req = os.path.join(base_dir, "requirements.txt")
    if not os.path.exists(req):
        log_error("[INSTALL_DEPS] ✓ requirements.txt not found, skipping", base_dir)
        return

    log_error(f"[INSTALL_DEPS] ✓ Found requirements.txt at: {req}", base_dir)

    hfile = os.path.join(base_dir, ".deps_hash")
    h = hash_file(req)
    log_error(f"[INSTALL_DEPS] Requirements hash: {h}", base_dir)

    if os.path.exists(hfile):
        old_hash = open(hfile).read()
        if old_hash == h:
            log_error("[INSTALL_DEPS] ✓ Dependencies already installed (hash match), skipping", base_dir)
            return
        else:
            log_error(f"[INSTALL_DEPS] Hash mismatch (old: {old_hash} → new: {h}), reinstalling...", base_dir)
    else:
        log_error("[INSTALL_DEPS] No hash file found, installing fresh...", base_dir)

    status("Installing dependencies...")

    try:
        log_error("[INSTALL_DEPS] Running: pip install -r requirements.txt", base_dir)
        result = subprocess.run(
            python + ["-m", "pip", "install", "-r", "requirements.txt"],
            cwd=base_dir,
            creationflags=0 if is_console else NO_WIN,
            check=False,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            error_output = result.stderr + result.stdout
            log_error(f"[INSTALL_DEPS] ✗ Pip install failed (code {result.returncode})", base_dir)
            log_error(f"[INSTALL_DEPS] STDOUT: {result.stdout}", base_dir)
            log_error(f"[INSTALL_DEPS] STDERR: {result.stderr}", base_dir)
            status(f"Pip error: {error_output[:200]}")
            raise subprocess.CalledProcessError(result.returncode, result.args, output=error_output)

        log_error("[INSTALL_DEPS] ✓ All dependencies installed successfully", base_dir)
        open(hfile, "w").write(h)
        log_error(f"[INSTALL_DEPS] ✓ Hash file saved: {hfile}", base_dir)

    except subprocess.CalledProcessError as e:
        log_error(f"[INSTALL_DEPS] ✗ Failed to install dependencies: {str(e)}", base_dir)
        status(f"Failed to install dependencies: {str(e)}")
        raise

# =========================
# MAIN
# =========================

import argparse

def parse_args():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--skip_update", action="store_true")
    return parser.parse_known_args()[0]

def main():
    is_frozen = getattr(sys, "frozen", False)
    base_dir = os.path.dirname(sys.executable) if is_frozen else os.path.dirname(__file__)
    is_console = is_frozen and "Console" in sys.executable

    # =========================
    # ADMIN ELEVATION CHECK
    # Must happen BEFORE ensure_single_instance so the elevated process
    # (which is a new PID) isn't blocked by the original mutex.
    # =========================
    if read_launch_as_admin(base_dir) and not is_admin():
        log_error("[MAIN] launch_as_admin is enabled and process is not elevated. Requesting UAC...", base_dir)
        success = relaunch_as_admin(base_dir)
        if success:
            log_error("[MAIN] UAC accepted. Elevated process launched. Exiting current process.", base_dir)
            sys.exit(0)
        else:
            # User cancelled UAC — log and continue without admin
            log_error("[MAIN] UAC cancelled or failed. Continuing without admin privileges.", base_dir)

    args = parse_args()

    ensure_single_instance("NeoDeckLauncherConsole" if is_console else "NeoDeckLauncherGUI")
    ui = None if is_console else StatusWindow()

    def status(m):
        print(m) if is_console else ui.set_text(m)

    def worker():
        try:
            log_error("[WORKER] ========== LAUNCHER STARTED ==========", base_dir)
            log_error(f"[WORKER] is_frozen: {is_frozen}", base_dir)
            log_error(f"[WORKER] base_dir: {base_dir}", base_dir)
            log_error(f"[WORKER] is_console: {is_console}", base_dir)
            log_error(f"[WORKER] skip_update: {args.skip_update}", base_dir)
            log_error(f"[WORKER] running_as_admin: {is_admin()}", base_dir)

            if not args.skip_update:
                try:
                    status("Checking updates...")
                    log_error("[WORKER] Fetching remote version from GitHub...", base_dir)

                    remote_ver = get_remote_version()
                    log_error(f"[WORKER] Remote version: {remote_ver}", base_dir)

                    local_ver = read_local_version(base_dir)
                    log_error(f"[WORKER] Local version: {local_ver}", base_dir)

                    if parse(remote_ver) > parse(local_ver):
                        log_error(f"[WORKER] Update available: {local_ver} → {remote_ver}", base_dir)

                        if ask_update(remote_ver):
                            log_error("[WORKER] User accepted update", base_dir)
                            status("Launching updater...")

                            # Use a bare system Python for the updater — the venv
                            # may be wiped/replaced during the update process itself.
                            base_python = find_python(is_console, base_dir)

                            subprocess.Popen(
                                base_python + [os.path.join(base_dir, "updater.py")],
                                cwd=base_dir,
                                creationflags=subprocess.CREATE_NEW_CONSOLE,
                            )

                            if ui:
                                ui.root.quit()
                            return

                        else:
                            log_error("[WORKER] User declined update", base_dir)
                            status("Update cancelled by user.")

                    else:
                        log_error("[WORKER] ✓ No update needed", base_dir)

                except Exception as e:
                    log_error(f"[WORKER] Update check failed, continuing normally: {e}", base_dir)
                    status("Update check failed, continuing...")
            else:
                log_error("[WORKER] ✓ Update check skipped (--skip_update flag set)", base_dir)

            log_error("[WORKER] Ensuring venv exists...", base_dir)
            python = ensure_venv(base_dir, is_console, status)
            log_error(f"[WORKER] ✓ Using venv Python: {python}", base_dir)

            log_error("[WORKER] Installing dependencies into venv...", base_dir)
            install_deps(python, base_dir, is_console, status)
            log_error("[WORKER] ✓ Dependencies ready", base_dir)

            status("Starting NeoDeck...")
            log_error("[WORKER] Launching NeoDeck with venv Python", base_dir)
            subprocess.Popen(
                python + ["run.py"],
                cwd=base_dir,
                creationflags=subprocess.CREATE_NEW_CONSOLE if is_console else NO_WIN,
            )
            log_error("[WORKER] ✓ NeoDeck launched successfully", base_dir)

            if ui:
                ui.root.after(300, ui.root.quit)

        except Exception as e:
            import traceback
            error_msg = f"{type(e).__name__}: {e}\n" + traceback.format_exc()
            log_error("[WORKER] ✗✗✗ CRITICAL ERROR ✗✗✗", base_dir)
            log_error(error_msg, base_dir)
            log_error("[WORKER] ========== ERROR LOGGED ==========", base_dir)
            if threading.main_thread().is_alive():
                print(error_msg) if is_console else status(f"Error: {str(e)}")
            if ui:
                ui.root.after(3000, ui.root.quit)

    worker_thread = threading.Thread(target=worker, daemon=False)
    worker_thread.start()

    if ui:
        ui.root.mainloop()
    else:
        worker_thread.join(timeout=60)

if __name__ == "__main__":
    main()