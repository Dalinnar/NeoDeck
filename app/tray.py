import os
import sys
import random
import threading
import webbrowser
from io import BytesIO
import winshell
from win32com.client import Dispatch

import pystray
import qrcode
import tkinter as tk
import webview
from PIL import Image, ImageTk
import win32gui, win32con
import subprocess
from .utils.exit import exit_program
from .utils.firewall import fix_firewall_permission
from .utils.get_local_ip import get_local_ip
from .utils.languages import text, get_languages_info, get_language, set_default_language
from .utils.logger import log
from settings import *
from .functions import *

SERVER_STATE = 0  # 0=loading, 1=online, 2=offline

# ----------------- CONFIG -----------------
def reload_config():
    cfg = objetify(get_settings()["neodeck"])
    return cfg.port, cfg.language, cfg.open_settings_in_integrated_browser

port, language, open_in_integrated_browser = reload_config()
local_ip = get_local_ip()

# ----------------- CONSOLE -----------------
def toggle_console():
    """Toggles console visibility and restarts the entire application."""
    try:
        # Toggle the console setting
        loaded_settings["neodeck"]["show_console"] = not loaded_settings["neodeck"]["show_console"]
        save_settings(loaded_settings)
        
        # Choose launcher based on show_console setting
        show_console = loaded_settings["neodeck"]["show_console"]
        launcher_name = "NeodeckLauncherConsole.exe" if show_console else "NeodeckLauncher.exe"
        launcher_path = os.path.join(BASE_DIR, launcher_name)
        
        # Launch the appropriate launcher
        subprocess.Popen(launcher_path)
        
        # Exit the current application
        exit_program()
    except Exception as e:
        log.exception(e, "Error while toggling console")


def restart_program(skip_update=False):
    show_console = loaded_settings["neodeck"]["show_console"]

    launcher_name = ("NeodeckLauncherConsole.exe" if show_console else "NeodeckLauncher.exe")

    launcher_path = os.path.join(BASE_DIR, launcher_name)
    args = ["--skip_update"] if skip_update else []

    subprocess.Popen(
        [launcher_path, *args],
        close_fds=True,
        creationflags=subprocess.DETACHED_PROCESS
    )

    os._exit(0)  # 🔥 mata el proceso sin cleanup

# ----------------- CONFIG UI -----------------
def open_config():
    _, _, open_browser = reload_config()
    url = f"http://{local_ip}:{get_port()}/settings"
    if open_browser:
        webview.create_window('Neodeck Config', url=url, background_color='#141414')
        webview.start()
        hwnd = win32gui.GetForegroundWindow()
        if "neodeck" in win32gui.GetWindowText(hwnd).lower():
            win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
    else:
        webbrowser.open(url)

def open_plugins_folder():
    plugins_path = os.path.join(BASE_DIR, "plugins")
    subprocess.Popen(f'explorer "{plugins_path}"')
# ----------------- QR CODE -----------------

def generate_qr_code(dark_theme=False):
    url = f"http://{get_local_ip()}:{get_port()}/"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(
        fill_color="white" if dark_theme else "black",
        back_color="black" if dark_theme else "white"
    )

    stream = BytesIO()
    img.save(stream, format="PNG")
    stream.seek(0)
    return Image.open(stream)


def show_qrcode():
    if getattr(show_qrcode, "window", None):
        show_qrcode.window.lift()
        show_qrcode.window.focus_force()
        return

    window = tk.Tk()
    show_qrcode.window = window
    window.title(text('qr_code'))
    window.iconbitmap("static/icons/icon.ico")

    url = f"http://{get_local_ip()}:{get_port()}/"

    # QR
    img = ImageTk.PhotoImage(generate_qr_code())
    qr_label = tk.Label(window, image=img)
    qr_label.image = img  # evitar garbage collection
    qr_label.pack(pady=5)

    # URL copiable
    url_var = tk.StringVar(value=url)

    entry = tk.Entry(
        window,
        textvariable=url_var,
        font=("Helvetica", 13),
        justify="center",
        width=len(url) + 2,
        state="readonly",
        readonlybackground=window.cget("bg"),
        relief="flat",
        cursor="hand2"
    )
    entry.pack(pady=5)

    def copy_url(event=None):
        window.clipboard_clear()
        window.clipboard_append(url)

    # Copiar al hacer click
    entry.bind("<Button-1>", copy_url)

    def close(event=None):
        window.destroy()
        show_qrcode.window = None

    for key in ("<Escape>", "<Return>", "<space>"):
        window.bind(key, close)

    window.resizable(False, False)
    window.protocol("WM_DELETE_WINDOW", close)
    window.mainloop()
# ----------------- TRAY -----------------
def create_language_items():
    langs = get_languages_info()
    normal = [l for l in langs if not l.get('misc')]
    misc = [l for l in langs if l.get('misc')]

    def mk_item(lang):
        label = f"{lang['native_name']} ({lang['code']})" if lang['native_name'] != lang['code'] else lang['code']
        return pystray.MenuItem(label, lambda: update_language(lang['code']),
                                radio=True, checked=lambda item: lang['code'] == get_language(language))

    items = [mk_item(l) for l in normal]
    if misc:
        items.append(pystray.Menu.SEPARATOR)
        items.extend(mk_item(l) for l in misc)
    return items


icon = None
def generate_tray_icon():
    global icon
    if icon is None:
        icon = pystray.Icon("Neodeck", Image.open("static/icons/icon.ico"), "Neodeck", generate_menu(SERVER_STATE))
        icon.run()

def generate_menu(server_status=1):
    log.info(f"Server status updated: {server_status}")
    status_text = {0: text('server_loading'), 1: text('server_online'), 2: text('server_offline')}
    console_enabled= loaded_settings["neodeck"]["show_console"]

    return pystray.Menu(
        pystray.MenuItem(text('qr_code'), show_qrcode, default=True),
        pystray.MenuItem(text('options'), pystray.Menu(
            pystray.MenuItem(text('open_config'), open_config),
            pystray.MenuItem(text('open_plugins_folder'), open_plugins_folder),
            pystray.MenuItem(text('language'), pystray.Menu(*create_language_items())),
            pystray.MenuItem(text('restart_application'), restart_program),
            pystray.MenuItem(text('edit_port'), lambda: change_port_prompt()),
            pystray.MenuItem(text('fix_firewall'), fix_firewall_permission),
            pystray.MenuItem(text('startup_enabled' if is_startup_enabled() else 'startup_disabled'),toggle_startup),
        )),
        pystray.MenuItem(f"{text('server_status')} {status_text.get(server_status)}", open_config),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(text('report_issue'), lambda: webbrowser.open('https://github.com/Dalinnar/Neodeck/issues')),

        pystray.MenuItem(text('TOGGLE_CONSOLE_1' if console_enabled else "TOGGLE_CONSOLE_0"), toggle_console),
        pystray.MenuItem(text('exit'), exit_program),
    )

# ----------------- LANGUAGE -----------------
def update_language(new_lang):
    set_default_language(new_lang)
    loaded_settings["neodeck"]["language"] = new_lang
    save_settings(loaded_settings)
    if icon:
        icon.menu = generate_menu(SERVER_STATE)
        icon.update_menu()

# ----------------- PORT CHANGE -----------------
def change_port_prompt():
    prompt = tk.Tk()
    prompt.title(text('change_server_port'))
    prompt.geometry("300x160")
    prompt.resizable(False, False)
    prompt.iconbitmap("static/icons/icon_black.ico")

    frame = tk.Frame(prompt, padx=10, pady=10)
    frame.pack(expand=True)

    tk.Label(frame, text=text('enter_new_port')).grid(row=0, column=0, pady=5, sticky="w")
    port_entry = tk.Entry(frame)
    port_entry.insert(0, get_port())
    port_entry.grid(row=1, column=0, pady=5, sticky="ew")

    def save_port():
        val = port_entry.get()
        if val.isdigit() and 1 <= int(val) <= 65535 and val != str(get_port()):
            loaded_settings["neodeck"]["port"] = int(val)
            save_settings(loaded_settings)
            prompt.destroy()
            restart_program()

    def randomize_port():
        port_entry.delete(0, tk.END)
        port_entry.insert(0, str(random.randint(1024, 65535)))

    tk.Button(frame, text=text("randomize"), command=randomize_port).grid(row=2, column=0, pady=5, sticky="ew")
    tk.Button(frame, text=text("save"), command=save_port).grid(row=3, column=0, pady=5, sticky="ew")

    prompt.bind("<Return>", lambda e: save_port())
    prompt.bind("<Escape>", lambda e: prompt.destroy())
    port_entry.focus()
    prompt.mainloop()

# ----------------- SERVER STATE -----------------
def change_server_state(new_state):
    global SERVER_STATE
    SERVER_STATE = new_state
    if icon:
        icon.menu = generate_menu(SERVER_STATE)
        icon.update_menu()


# ----------------- STARTUP -----------------

def get_startup_shortcut_path():
    return os.path.join(
        winshell.startup(),
        "Neodeck.lnk"
    )

def is_startup_enabled():
    return os.path.exists(get_startup_shortcut_path())

def toggle_startup():
    try:
        shortcut_path = get_startup_shortcut_path()

        if os.path.exists(shortcut_path):
            os.remove(shortcut_path)
            log.info("Startup disabled")
        else:
            target = os.path.join(
                BASE_DIR,
                "NeodeckLauncherConsole.exe"
                if loaded_settings["neodeck"]["show_console"]
                else "NeodeckLauncher.exe"
            )

            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(shortcut_path)

            shortcut.Targetpath = target
            shortcut.WorkingDirectory = BASE_DIR
            shortcut.IconLocation = target
            shortcut.save()

            log.info("Startup enabled")

        # refrescar menú
        if icon:
            icon.menu = generate_menu(SERVER_STATE)
            icon.update_menu()

    except Exception as e:
        log.exception(e, "Failed toggling startup")