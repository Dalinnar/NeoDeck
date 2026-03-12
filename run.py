# ============================================================
# run.py
# ============================================================
import ctypes
import sys
import threading
import time

from settings import loaded_settings
from app.utils.logger import log
from app.functions import objetify
from app.utils.args import parse_args, get_arg
from app.utils.working_dir import chdir_base
from app.utils.welcome_popup import show_popup
from app.utils.is_opened import is_opened
import app.utils.languages as languages

import win32gui
import win32con

from app.server import run_server
from app.tray import generate_tray_icon


# Redirect stderr to file
sys.stderr = open("err.txt", "w", encoding="utf-8")

settings = objetify(loaded_settings["neodeck"])
chdir_base()
parse_args()


def hide_console_window():
    """Hide console window if not in debug mode"""
    if not settings.show_console:
        try:
            hwnd = win32gui.GetForegroundWindow()
            ctypes.windll.user32.ShowWindow(hwnd, win32con.SW_HIDE)
        except Exception as e:
            log.debug(f"Could not hide window: {e}")


def relaunch_as_admin():
    """Relaunch the application with admin privileges"""
    params = " ".join([__file__] + sys.argv[1:])
    ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable, params, None, 1
    )
    sys.exit()


# Prevent multiple instances
if is_opened() and not get_arg("force_start"):
    log.info("Application already running")
    sys.exit()


# Hide console window if needed
if getattr(sys, "frozen", False) and not settings.show_console:
    hide_console_window()


# Admin privileges
if settings.app_admin and not get_arg("no_admin"):
    if not ctypes.windll.shell32.IsUserAnAdmin():
        relaunch_as_admin()


log.info("Starting Neodeck")
log.info("Loading translations")

languages.init(
    lang_files_directory="neodeck/translations",
    misc_lang_files_directory="neodeck/translations/misc",
    default_language=settings.language,
)


# ============================================================
# Main Execution
# ============================================================
def main():
    log.info("Running application")

    # Flask server
    server_thread = threading.Thread(target=run_server, daemon=False)
    server_thread.start()
    log.info("Flask server started")

    # Welcome popup
    popup_thread = threading.Thread(target=show_popup, daemon=True)
    popup_thread.start()
    log.info("Popup thread started")

    # Tray icon MUST be in main thread
    if not get_arg("no_tray"):
        log.info("Starting tray icon")
        try:
            generate_tray_icon()
        except Exception as e:
            log.error(f"Error in tray icon: {e}")
    else:
        log.info("Running without tray icon")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log.exception(f"Fatal error: {e}")
    finally:
        log.info("Exiting Neodeck")
