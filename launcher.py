#launcher.py
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
repo_key = "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"


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
            "Authorization": f"Bearer {repo_key}",
        },
    )

def get_remote_version():
    with urllib.request.urlopen(github_request(github_api_url() + "/releases/latest")) as r:
        data = json.load(r)
    return data["tag_name"].lstrip("v")

# =========================
# PYTHON + DEPS
# =========================

def find_python():
    for py in (["py", "-3.11"], ["python"], ["python3"], [sys.executable]):
        try:
            subprocess.run(py + ["--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return py
        except Exception:
            pass
    raise RuntimeError("Python not found")

def hash_file(p):
    h = hashlib.sha256()
    h.update(open(p, "rb").read())
    return h.hexdigest()

def install_deps(python, base_dir, is_console, status):
    req = os.path.join(base_dir, "requirements.txt")
    if not os.path.exists(req):
        return

    hfile = os.path.join(base_dir, ".deps_hash")
    h = hash_file(req)

    if os.path.exists(hfile) and open(hfile).read() == h:
        return

    status("Installing dependencies...")
    subprocess.check_call(
        python + ["-m", "pip", "install", "-r", "requirements.txt"],
        cwd=base_dir,
        creationflags=0 if is_console else NO_WIN,
    )
    open(hfile, "w").write(h)

# =========================
# MAIN
# =========================

def main():
    is_frozen = getattr(sys, "frozen", False)
    base_dir = os.path.dirname(sys.executable) if is_frozen else os.path.dirname(__file__)
    is_console = is_frozen and "Console" in sys.executable

    ensure_single_instance("NeoDeckLauncherConsole" if is_console else "NeoDeckLauncherGUI")
    ui = None if is_console else StatusWindow()

    def status(m):
        print(m) if is_console else ui.set_text(m)

    def worker():
        try:
            status("Checking updates...")
            if parse(get_remote_version()) > parse(read_local_version(base_dir)):
                status("Update available, launching updater...")
                subprocess.Popen(
                   [os.path.join(base_dir, "NeodeckUpdater.exe")],
                    creationflags=subprocess.CREATE_NEW_CONSOLE,
                    )
 
                if ui:
                    ui.root.quit()
                return

            python = find_python()
            install_deps(python, base_dir, is_console, status)

            status("Starting NeoDeck...")
            subprocess.Popen(
                python + ["run.py"],
                cwd=base_dir,
                creationflags=subprocess.CREATE_NEW_CONSOLE if is_console else NO_WIN,
            )

            if ui:
                ui.root.after(300, ui.root.quit)

        except Exception as e:
            import traceback
            error_msg = f"{type(e).__name__}: {e}\n" + traceback.format_exc()
            if threading.main_thread().is_alive():
                print(error_msg) if is_console else status(f"Error: {str(e)}")
            log_error(error_msg, base_dir)
            if ui:
                ui.root.after(3000, ui.root.quit)

    threading.Thread(target=worker, daemon=True).start()
    if ui:
        ui.root.mainloop()

if __name__ == "__main__":
    main()