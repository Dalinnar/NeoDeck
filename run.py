import ctypes
import sys
import os.path
import threading
from settings import loaded_settings
from app.utils.logger import log
from app.functions import objetify
from app.utils.args import parse_args, get_arg
from app.utils.working_dir import chdir_base

import ctypes
import win32gui
import win32con

settings = objetify(loaded_settings["webdeck"])


chdir_base()

parse_args()

def hide_console_window():
    try:
        hwnd = win32gui.GetForegroundWindow()
        ctypes.windll.user32.ShowWindow(hwnd, win32con.SW_HIDE)
    except Exception as e:
        from app.utils.logger import log
        log.debug(f"Could not hide window: {e}")

# Solo si está congelado y no se desea mostrar consola
if getattr(sys, "frozen", False) and not settings.show_console:
    hide_console_window()




if settings.app_admin and not get_arg('no_admin'):
    if not ctypes.windll.shell32.IsUserAnAdmin():
        # Rebuild the command including all arguments
        params = " ".join([__file__] + sys.argv[1:])
        # Restart the program with admin privileges and include arguments
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
        sys.exit()

from app.utils.welcome_popup import show_popup
from app.utils.show_error import show_error
from app.utils.is_opened import is_opened
import app.utils.languages as languages


def run_server_thread():
    from app.server import run_server
    try:
        run_server()
    except Exception as e:
        show_error(exception=e)

def initialize_tray_icon():
    from app.tray import create_tray_icon
    try:
        create_tray_icon()
    except Exception as e:
        if os.name == 'nt':
            show_error(exception=e)
        else:
            log.exception(e, "Failed to initialize tray icon", expected=False)


if not is_opened() or get_arg('force_start'):
    log.info("Starting WebDeck")

    log.info("Loading translations")
    languages.init(
        lang_files_directory="webdeck/translations",
        misc_lang_files_directory="webdeck/translations/misc",
        default_language=settings.language,
    )

    # ✅ Si no está congelado y se quiere usar el reloader, correr directamente el server en main thread
    if not getattr(sys, "frozen", False) and loaded_settings["webdeck"].get("flask_reloader", False):
        from app.server import run_server
        run_server()  # esto evitará el error con signal
    else:
        server_thread = threading.Thread(target=run_server_thread, daemon=True)
        server_thread.start()

        popup_thread = threading.Thread(target=show_popup, daemon=True)
        popup_thread.start()

        if not get_arg('no_tray'):
            log.info("Initializing tray icon")
            initialize_tray_icon()
        else:
            log.info("Running without tray icon")
            try:
                while True:
                    pass
            except KeyboardInterrupt:
                log.info("Exiting WebDeck... (Ctrl+C)")