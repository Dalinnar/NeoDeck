import ctypes
import sys
import os.path
import threading
from settings import loaded_settings
from app.utils.logger import log
from app.functions import objetify
from app.utils.args import parse_args, get_arg
from app.utils.working_dir import chdir_base
from app.utils.welcome_popup import show_popup
from app.utils.show_error import show_error
from app.utils.is_opened import is_opened
import app.utils.languages as languages
# --- IMPORTS WINDOWS PARA OCULTAR CONSOLA ---
import win32gui
import win32con


# --- REDIRIGIR STDERR A ARCHIVO (EVITA VENTANA NEGRA DE ERRORES) ---
sys.stderr = open("err.txt", "w", encoding="utf-8")

# --- IMPORTS DEL PROYECTO ---



# --- CARGA DE SETTINGS ---
settings = objetify(loaded_settings["webdeck"])

# --- CONFIGURAR WORKDIR ---
chdir_base()

# --- PARSEAR ARGUMENTOS ---
parse_args()


# -----------------------------------------------
#  OCULTAR CONSOLA SI EL EXE NO DEBE MOSTRARLA
# -----------------------------------------------
def hide_console_window():
    try:
        hwnd = win32gui.GetForegroundWindow()
        ctypes.windll.user32.ShowWindow(hwnd, win32con.SW_HIDE)
    except Exception as e:
        log.debug(f"Could not hide window: {e}")


if getattr(sys, "frozen", False) and not settings.show_console:
    hide_console_window()


# -----------------------------------------------
#  RE-EJECUTAR COMO ADMIN SI ES NECESARIO
# -----------------------------------------------
if settings.app_admin and not get_arg('no_admin'):
    if not ctypes.windll.shell32.IsUserAnAdmin():
        params = " ".join([__file__] + sys.argv[1:])
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, params, None, 1
        )
        sys.exit()


# -----------------------------------------------
#  THREAD DEL SERVIDOR
# -----------------------------------------------
def run_server_thread():
    from app.server import run_server
    try:
        run_server()
    except Exception as e:
        log.exception(e)
        show_error(exception=e)


# -----------------------------------------------
#  ICONO DE BANDEJA (SYSTEM TRAY)
# -----------------------------------------------
def initialize_tray_icon():
    from app.tray import create_tray_icon
    try:
        create_tray_icon()
    except Exception as e:
        if os.name == 'nt':
            show_error(exception=e)
        else:
            log.exception(e, "Failed to initialize tray icon", expected=False)


# -----------------------------------------------
#  INICIO DEL PROGRAMA
# -----------------------------------------------
if not is_opened() or get_arg('force_start'):
    log.info("Starting WebDeck")

    # --- CARGAR TRADUCCIONES ---
    log.info("Loading translations")
    languages.init(
        lang_files_directory="webdeck/translations",
        misc_lang_files_directory="webdeck/translations/misc",
        default_language=settings.language,
    )

    # -------------------------------------------
    #  MODO DESARROLLO + Flask reloader = correr en MAIN THREAD
    # -------------------------------------------
    if not getattr(sys, "frozen", False) and loaded_settings["webdeck"].get("flask_reloader", False):
        from app.server import run_server
        run_server()

    # -------------------------------------------
    #  MODO EXE — servidor en thread
    # -------------------------------------------
    else:
        server_thread = threading.Thread(target=run_server_thread, daemon=True)
        server_thread.start()

        popup_thread = threading.Thread(target=show_popup, daemon=True)
        popup_thread.start()

        # --- CREAR ICONO DE BANDEJA ---
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
