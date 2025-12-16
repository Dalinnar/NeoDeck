# launcher.py
import sys
import os
import subprocess
import threading

NO_WIN = subprocess.CREATE_NO_WINDOW
from launcher_ui import StatusWindow


def load_settings(base_dir):
    try:
        settings_path = os.path.join(base_dir, ".config", "settings.json")
        if os.path.exists(settings_path):
            import json
            with open(settings_path, encoding="utf-8") as f:
                return json.load(f)["neodeck"]
        from settings import loaded_settings
        return loaded_settings["neodeck"]
    except Exception:
        return {"show_console": False}


def relaunch_with_console(base_dir):
    exe = os.path.join(base_dir, "NeodeckLauncherConsole.exe")
    if os.path.exists(exe):
        os.execv(exe, [exe] + sys.argv)


def check_console_mode(base_dir):
    if load_settings(base_dir).get("show_console") and "Console" not in sys.executable:
        relaunch_with_console(base_dir)


def run_silent(cmd):
    subprocess.run(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
        creationflags=NO_WIN,
    )


def install_python_with_winget():
    try:
        subprocess.run(
            ["winget", "install", "-e", "--id", "Python.Python.3.12"],
            check=True,
        )
        return True
    except Exception:
        return False


def find_python_executable():
    for py in (["py", "-3.12"],):
        try:
            run_silent(py + ["--version"])
            return py
        except Exception:
            if install_python_with_winget():
                run_silent(py + ["--version"])
                return py

    for py in ("python", "python3", sys.executable):
        try:
            run_silent([py, "--version"])
            return [py]
        except Exception:
            pass

    raise RuntimeError("No Python executable found")


def main():
    is_frozen = getattr(sys, "frozen", False)
    base_dir = (
        os.path.dirname(sys.executable)
        if is_frozen
        else os.path.dirname(os.path.abspath(__file__))
    )

    is_console = is_frozen and "Console" in os.path.basename(sys.executable)

    ui = None
    if not is_console:
        ui = StatusWindow()

    def status(msg):
        if ui:
            ui.set_text(msg)

    def worker():
        try:
            if is_frozen and not is_console:
                check_console_mode(base_dir)

            status("Buscando Python 3.12...")
            python = find_python_executable()

            status("Instalando dependencias...")
            subprocess.run(
                python + ["-m", "pip", "install", "-r", "requirements.txt"],
                cwd=base_dir,
                stdout=None if is_console else subprocess.DEVNULL,
                stderr=None if is_console else subprocess.DEVNULL,
                creationflags=0 if is_console else NO_WIN,
                check=True,
            )

            status("Iniciando NeoDeck...")

            # IMPORTANT FIX: do NOT block here
            subprocess.Popen(
                python + ["run.py"],
                cwd=base_dir,
                creationflags=0 if is_console else NO_WIN,
            )

            # Close launcher UI immediately after successful launch
            if ui:
                ui.root.after(0, ui.close)

        except Exception as e:
            with open(os.path.join(base_dir, "error.log"), "a", encoding="utf-8") as f:
                f.write(f"Error: {e}\n")
            if ui:
                ui.root.after(0, ui.close)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()

    if ui:
        ui.root.protocol("WM_DELETE_WINDOW", ui.close)
        ui.root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        base_dir = (
            os.path.dirname(sys.executable)
            if getattr(sys, "frozen", False)
            else os.path.dirname(os.path.abspath(__file__))
        )
        with open(os.path.join(base_dir, "error.log"), "a", encoding="utf-8") as f:
            f.write(f"Error: {e}\n")
