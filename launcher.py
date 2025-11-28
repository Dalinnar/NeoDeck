import sys
import os
import subprocess

# ============================================================
#  NEW PART — AUTO SWITCH TO CONSOLE EXE IF show_console = true
# ============================================================

def load_settings(base_dir):
    """Loads settings.json or settings.py depending on your project."""
    try:
        settings_path = os.path.join(base_dir, ".config", "settings.json")
        if os.path.exists(settings_path):
            import json
            with open(settings_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data["webdeck"]
        else:
            # fallback if using Python settings.py
            from settings import loaded_settings
            return loaded_settings["webdeck"]
    except Exception:
        return {"show_console": False}

def relaunch_with_console(base_dir):
    console_exe = os.path.join(base_dir, "WebDeckLauncherConsole.exe")
    if os.path.exists(console_exe):
        os.execv(console_exe, [console_exe] + sys.argv)


def check_console_mode(base_dir):
    settings = load_settings(base_dir)
    show_console = settings.get("show_console", False)

    # If user wants console but EXE is GUI build → relaunch
    if show_console and "Console" not in sys.executable:
        relaunch_with_console(base_dir)


# ============================================================
#  ORIGINAL CODE BELOW
# ============================================================

def install_python_with_winget():
    try:
        print("Python 3.12 not found. Installing via winget...\n")

        subprocess.run(
            ["winget", "install", "-e", "--id", "Python.Python.3.12"],
            check=True
        )
        return True
    except Exception:
        return False


def find_python_executable():
    try:
        subprocess.run(
            ["py", "-3.12", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        return ["py", "-3.12"]
    except Exception:
        if install_python_with_winget():
            try:
                subprocess.run(
                    ["py", "-3.12", "--version"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                return ["py", "-3.12"]
            except Exception:
                pass

    candidates = ["python", "python3", sys.executable]
    for py in candidates:
        try:
            subprocess.run(
                [py, "--version"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            return [py]
        except Exception:
            continue

    raise RuntimeError("No Python executable found in PATH or installed via winget")


def main():
    is_frozen = getattr(sys, "frozen", False)

    if is_frozen:
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    # Detect if we are running the Console EXE
    is_console_variant = (
        is_frozen and "Console" in os.path.basename(sys.executable)
    )

    # ---- SHOW CONSOLE LOGIC (your previous code) ----
    if is_frozen and not is_console_variant:
        check_console_mode(base_dir)

    req_file = os.path.join(base_dir, "requirements.txt")
    main_script = os.path.join(base_dir, "run.py")

    python_exe = find_python_executable()

    # ---------------------------------------------------------
    # INSTALL REQUIREMENTS
    # Console version → allow output
    # GUI version → hide output
    # ---------------------------------------------------------
    install_flags = 0 if is_console_variant else subprocess.CREATE_NO_WINDOW
    install_stdout = None if is_console_variant else subprocess.DEVNULL
    install_stderr = None if is_console_variant else subprocess.DEVNULL

    result = subprocess.run(
        python_exe + ["-m", "pip", "install", "-r", req_file],
        cwd=base_dir,
        stdout=install_stdout,
        stderr=install_stderr,
        creationflags=install_flags,
    )

    if result.returncode != 0:
        sys.exit(result.returncode)

    # ---------------------------------------------------------
    # RUN run.py
    # Console EXE → do NOT hide window
    # GUI EXE → hide window
    # ---------------------------------------------------------
    run_flags = 0 if is_console_variant else subprocess.CREATE_NO_WINDOW

    subprocess.run(
        python_exe + [main_script],
        cwd=base_dir,
        creationflags=run_flags
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))

        with open(os.path.join(base_dir, "error.log"), "a", encoding="utf-8") as f:
            f.write(f"Error inesperado: {e}\n")
