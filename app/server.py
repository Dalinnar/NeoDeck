
import ipaddress
import json
import logging
import os
import re
import sys
import psutil
import tkinter as tk
from tkinter import filedialog
from flask import ( Flask, abort, jsonify, make_response,render_template, request, send_file, send_from_directory, )
from flask_socketio import SocketIO
from flask.wrappers import Response

import time
from pynput.mouse import Controller, Button
import pyautogui
mouse = Controller()

from app.tray import change_server_state,restart_program
from app.utils.args import get_arg
from app.utils.languages import text
from app.utils.logger import log
from app.utils.plugins.load_plugins import load_plugins,update_plugin
from app.utils.plugins.plugin_fetcher import *
from app.utils.settings.audio_devices import get_audio_devices
#from app.utils.settings.get_config import get_port
from app.utils.working_dir import get_base_dir
from app.utils.firewall import check_firewall_permission, fix_firewall_permission
from urllib import parse

from settings import (get_settings,save_settings,get_port,get_default_settings)
from .buttons.commands import get_monitors, process_command
from .functions import *
from .on_start import on_start

class CustomFlask(Flask):
    def run(self, *args, **kwargs):
        # Activar el contexto de la aplicación antes de inicializar los blueprints
        with self.app_context():
            for name, bp in self.blueprints.items():
                if hasattr(bp, "init") and callable(bp.init):                    
                    bp.init()

        super().run(*args, **kwargs)
    
change_server_state(0)

local_ip = on_start()
base_dir = get_base_dir()
template_folder = os.path.join(base_dir, 'templates')
static_folder = os.path.join(base_dir, 'static')


loaded_settings = get_settings()

app = CustomFlask(__name__, template_folder=template_folder, static_folder=static_folder)
commands = load_plugins(app)
# app custon functions
app.get_settings = get_settings
app.save_settings = save_settings
app.BASE_DIR = base_dir
app.local_ip = local_ip
app.url_path = f"{get_arg('host') or local_ip}:{get_port()}"

socketio = SocketIO(app, cors_allowed_origins="*",async_mode="threading")
PORT = int(get_port())


logging.getLogger("werkzeug").disabled = True
app.jinja_env.globals.update(
    get_audio_devices=get_audio_devices,
    mdebug=log.debug
)

app.config["SECRET_KEY"] = get_settings("neodeck").get("secret_key","secret_key")

@app.route("/monitors", methods=["POST"])
def usage():
    return get_monitors(request.get_json()["track"])


@app.route("/folder_data/<folder>", )   
def get_folder_data(folder):
    with open(os.path.join(base_dir ,".config/pages.json") , "r+") as f:
        pages = json.load(f) 
        return jsonify({"success": True, "folder":pages[folder]})



@app.before_request
def check_local_network():
    remote_ip = ipaddress.ip_address(request.remote_addr)

    # Permitir localhost explícitamente
    if remote_ip.is_loopback:
        return None  # OK

    # Verificar si está dentro de la red local
    netmask = loaded_settings["neodeck"].get("netmask", 16)
    local_net = ipaddress.ip_network(f"{local_ip}/{netmask}", strict=False)
    if remote_ip in local_net:
        return None  # OK

    # Verificar redes permitidas manualmente
    for network_str in loaded_settings["neodeck"].get("allowed_networks", []):
        try:
            network = ipaddress.ip_network(network_str, strict=False)
            if remote_ip in network:
                return None  # OK
        except ValueError:
            pass  # Ignorar errores de formato

    return jsonify({"success": False, "message": "Access denied: IP not in local network"}), 403


@app.after_request
def after_request(response):
    if request.path != "/monitors":
        log.httprequest(request, response)
    return response

   

DEFAULT_PAGES = {
    "first page": {
        "background": "#3f3f3f",
        "columns": 8,
        "rows": 3,
        "buttons": []
    }
}




scrollpad_state = {}

# Timing protection constants
CLICK_COOLDOWN   = 0.1    # avoids double-click spam
DRAG_END_COOLDOWN = 0.15  # prevents click right after drag
MOVE_THRESHOLD   = 2      # movement below this = still a tap
STOP_DEBOUNCE    = 0.05   # protects against SocketIO async duplicate events
SCREEN_W, SCREEN_H = pyautogui.size()
SENSITIVITY = 3.0


def get_state(scrollpad_id):
    if scrollpad_id not in scrollpad_state:
        scrollpad_state[scrollpad_id] = {
            "moved":       False,
            "last_click":  0,
            "drag_ended":  0,
            "last_stop":   0,
            "last_hold":   0,
        }
    return scrollpad_state[scrollpad_id]


@socketio.on("scrollpad_move")
def handle_scrollpad_move(data):
    try:
        scrollpad_id = data.get("id", "unknown")
        payload      = data.get("payload", {})
        mode         = payload.get("mode")

        st  = get_state(scrollpad_id)
        now = time.time()

        # ─────────────────────────────────
        # RELATIVE MODE
        # ─────────────────────────────────
        if mode == "relative":
            dx = payload.get("dx", 0) * SENSITIVITY
            dy = payload.get("dy", 0) * SENSITIVITY

            print(f"[{now:.4f}] REL {scrollpad_id} dx={dx:.1f} dy={dy:.1f}")

            if abs(dx) > MOVE_THRESHOLD or abs(dy) > MOVE_THRESHOLD:
                st["moved"] = True

            mouse.move(dx, dy)

        # ─────────────────────────────────
        # ABSOLUTE MODE
        # ─────────────────────────────────
        elif mode == "absolute":
            abs_x = int(SCREEN_W * payload.get("x", 0))
            abs_y = int(SCREEN_H * payload.get("y", 0))

            print(f"[{now:.4f}] ABS {scrollpad_id} -> ({abs_x}, {abs_y})")

            st["moved"] = True
            mouse.position = (abs_x, abs_y)

        # ─────────────────────────────────
        # TWO-FINGER WHEEL MODE
        # ─────────────────────────────────
        elif mode == "wheel":
            dy = payload.get("dy", 0)

            print(f"[{now:.4f}] WHEEL {scrollpad_id} dy={dy:.2f}")

            # pynput scroll: positive = up, negative = down
            # dy from client is already sign-corrected (finger-down → positive dy = scroll down)
            mouse.scroll(0, -dy)

        # ─────────────────────────────────
        # DRAG START  → press and hold left button
        # ─────────────────────────────────
        elif mode == "drag_start":
            print(f"[{now:.4f}] DRAG START {scrollpad_id}")
            mouse.press(Button.left)
            st["moved"] = True  # prevent stop from firing a click on release

        # ─────────────────────────────────
        # DRAG END  → release left button
        # ─────────────────────────────────
        elif mode == "drag_end":
            print(f"[{now:.4f}] DRAG END {scrollpad_id}")
            mouse.release(Button.left)
            st["drag_ended"] = now
            st["moved"] = True

        # ─────────────────────────────────
        # HOLD MODE  → right-click
        # ─────────────────────────────────
        elif mode == "hold":
            print(f"[{now:.4f}] HOLD {scrollpad_id} → RIGHT CLICK")

            # Debounce to avoid firing twice on shaky release
            if now - st["last_hold"] >= CLICK_COOLDOWN:
                mouse.click(Button.right, 1)
                st["last_hold"] = now
                # Mark as moved so the subsequent "stop" event won't fire a left-click
                st["moved"] = True

        # ─────────────────────────────────
        # STOP MODE  → left-click (tap) or end drag
        # ─────────────────────────────────
        elif mode == "stop":
            print(f"[{now:.4f}] STOP {scrollpad_id} moved={st['moved']}")

            if now - st["last_stop"] < STOP_DEBOUNCE:
                print("   - ignored: STOP debounce")
                return
            st["last_stop"] = now

            if now - st["drag_ended"] < DRAG_END_COOLDOWN:
                st["moved"] = False
                return

            if not st["moved"]:
                if now - st["last_click"] >= CLICK_COOLDOWN:
                    print("   - TAP → LEFT CLICK")
                    mouse.click(Button.left, 1)
                    st["last_click"] = now
            else:
                st["drag_ended"] = now

            st["moved"] = False

    except Exception as e:
        print(f"[ScrollPad Error] {e}")


@socketio.on("connect")
def handle_connect():
    print(f"Client connected! SID: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected! SID: {request.sid}")

@app.route('/')
def home():
    context = {}
    context["image_list"] = get_image_list()
    context["temp_scripts"] = get_temp_scripts()

    pages_path = os.path.join(base_dir, ".config/pages.json")
    os.makedirs(os.path.dirname(pages_path), exist_ok=True)

    # Intentar cargar el JSON
    try:
        with open(pages_path, "r") as f:
            pages = json.load(f)

        # Si el archivo existe pero está vacío o no es un dict
        if not isinstance(pages, dict) or len(pages) == 0:
            pages = DEFAULT_PAGES
            with open(pages_path, "w") as f:
                json.dump(pages, f, indent=4)

    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        # Si no existe o está corrupto → recrearlo con default
        pages = DEFAULT_PAGES
        with open(pages_path, "w") as f:
            json.dump(pages, f, indent=4)

    # Obtener primera página de forma segura
    first_key = next(iter(pages))

    context["pages"] = list(pages.keys())
    context["deck_folder"] = pages[first_key]
    context["folder_name"] = str(first_key)
    context["text"] = text()
    context["commands"] = commands

    return render_template("index_new.jinja", context=context)

#add method get and post to settings
@app.route("/settings", methods=["GET", "POST"])
def settings_page():
    context = {}
    context["text"] = text()
    context["default_settings"] = get_default_settings()
    context["saved_settings"] = loaded_settings
    return render_template("settings.jinja", context=context)


@app.route("/plugins")
def plugins_page():
    context = {}
    
    return render_template("plugins.jinja", context=context)

@app.route("/restart_app", methods=["POST"])
def restart_app():
    restart_program(True)
    return None



@app.route("/plugin/<plugin_name>")
def plugin_solo(plugin_name):
    context = {}
    context["plugin_name"] = plugin_name
    context["plugin_version"] = app.plugins["installed"].get(plugin_name, "unknown")
    print(context["plugin_name"])
    print(context["plugin_version"])
    
    return render_template("plugin_solo.jinja", context=context)

@app.route('/download_mod', methods=['GET', 'POST'])
def download_mod():
    """Download and install/update a plugin from a .deck file URL"""
    from urllib import parse

    def fully_decode_url(url):
        prev = None
        while prev != url:
            prev = url
            url = parse.unquote(url)
        return url

    # Get the link from query parameters
    link = request.args.get('link')

    if not link:
        return jsonify({'error': 'No link provided'}), 400

    try:
        decoded_link = fully_decode_url(link)
    except Exception as e:
        return jsonify({'error': f'Invalid link format: {str(e)}'}), 400

    log.info(f"Received download request for: {decoded_link}")

    if not isinstance(decoded_link, str) or not decoded_link.startswith(('http://', 'https://')):
        return jsonify({'error': 'Invalid URL format'}), 400

    if not decoded_link.endswith('.deck'):
        return jsonify({'error': 'URL must point to a .deck file'}), 400

    result = update_plugin(decoded_link)
    log.info(f"update_plugin result: {result}")

    if result['success']:
        return jsonify({
            'status': 'success',
            'message': result['message'],
            'plugin_name': result['plugin_name'],
            'version': result['version'],
            'old_version': result.get('old_version')
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': result['message'],
            'plugin_name': result.get('plugin_name', 'unknown')
        }), 400


@app.route("/api/<value>")
def api(value):
    
    value_map = {
        "disks": [p.device[0] for p in psutil.disk_partitions()],
        "deck_folders" : load_deck_folders()
    }
    return jsonify(value_map[value])

@app.route("/save_settings", methods=["POST"])
def save_settings_view():
    global loaded_settings
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    new_merge = deep_merge(deep_merge(get_default_settings(), loaded_settings), data)
    save_settings(new_merge)
    loaded_settings = get_settings()
    return jsonify({"success": True})

@app.route("/upload_file", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        log.error("No files were found in the request.")
        return jsonify({"success": False, "message": text("no_files_found_error")})

    uploaded_file = request.files["file"]

    # Normalizar el nombre del archivo
    file_name = re.sub(r'[^\w\-_\.]', '_', os.path.splitext(uploaded_file.filename)[0]).lower()

    save_dir = ".config/user_uploads"
    os.makedirs(save_dir, exist_ok=True)  # Crear directorio si no existe

    # Crear la ruta y guardar el archivo
    save_path = os.path.join(save_dir, f"{file_name}{os.path.splitext(uploaded_file.filename)[1]}")
    uploaded_file.save(save_path)


    log.success(f"File '{uploaded_file.filename}' uploaded successfully as '{file_name}'")
    return jsonify({"success": True, "message": text("downloaded_successfully"), "file_path": save_path, "file_name": file_name})


@app.route("/delete_file", methods=["POST"])
def delete_file():
    data = request.get_json()
    file_path = data.get("file_path")

    full_path = os.path.join(base_dir, file_path)
    
    if not os.path.exists(full_path) or not os.path.isfile(full_path) or \
       not os.path.splitext(full_path)[1].lower() in ['.png', ".webp",'.jpg', '.jpeg', '.gif', '.bmp']:
        return jsonify({"success": False, "message": text("file_not_found_error")})

    print(f"File '{full_path}' deleted successfully.")
    os.remove(full_path)
    return jsonify({"success": True, "message": text("file_deleted_successfully")})


@app.route('/temp/<filename>')
@app.route('/.temp/<filename>')
def serve_temp_file(filename):
    temp_folder = os.path.join(base_dir, '.temp')
    return send_from_directory(temp_folder, filename)


# https://stackoverflow.com/a/70555525/17100464
@app.route("/.config/<string:directory>/<string:filename>", methods=["GET"])
def get_config_file(directory, filename):
    if not directory in ['user_uploads', 'themes']:
        return "Unauthorized", 401
    try:
        filename = os.path.basename(filename)  # Sanitize the filename
        file_path = os.path.join(app.root_path.replace('app',''), f".config/{directory}", filename)

        if os.path.isfile(file_path):
            return send_file(file_path, as_attachment=True)
        else:
            return make_response(f"File '{filename}' not found.", 404)
    except Exception as e:
        log.exception(e, f"An error occurred while trying to get the file '{file_path}'")
        return make_response(f"Error: {str(e)}", 500)

@app.route("/data/<action>", methods=["POST", "GET"])
def data_route(action):
    try:
        if request.method == "POST":
            message = request.get_json().get("message", "")
        else:
            message = request.headers.get("X-Message", "")

        if action == "send":
            result = process_command(message, command_type="command")
        elif action == "get":
            result = process_command(message, command_type="get")
        else:
            return jsonify({"success": False, "message": f"Unknown action: {action}"}), 400

    except Exception as e:
        log.exception(e, "An error occurred while handling a data request")
        return jsonify({"success": False, "message": str(e)})

    if result is False:
        return jsonify({"success": False})
    elif isinstance(result, Response):
        log.info("sending response from route")
        return result
    elif isinstance(result, dict):
        log.info("sending response from route")
        return jsonify(result)

    return jsonify({"success": True, "data": result})


@app.route("/update_folder_data/<folder_name>", methods=["POST"])
def update_folder_data(folder_name):
    data = request.get_json()
    
    #replace all double quotes with single quotes to avoid json errors
    data = replace_double_quotes(data)

    # Remover imagen si está marcada como "remove_image"
    if data.get("background_img") == "remove_image":
        data["background_img"] = ""

    with open(os.path.join(base_dir, ".config/pages.json"), "r+") as f:
        pages = json.load(f)
        pages[folder_name] = data

        f.seek(0)
        json.dump(pages, f, indent=4)
        f.truncate()

    return jsonify({"success": True,"message": "Folder data updated successfully","folder": pages[folder_name]})

#get_audio_sessions
@app.route("/retrive_audio_sessions", methods=["GET"])
def retrive_audio_sessions():
    from app.buttons.audio.volume import get_audio_sessions
    from app.buttons.audio.volume import generate_audio_mixer_folder
    
    sessions = get_audio_sessions()  # lista de dicts
    folder = generate_audio_mixer_folder(sessions)
    return jsonify(folder)

    


@app.route("/get_page/<folder_name>", methods=["GET"])
def get_page(folder_name):
    with open(os.path.join(base_dir ,".config/pages.json") , "r+") as f:
        pages = json.load(f) 
        return jsonify(pages[folder_name])


@app.route("/create_folder", methods=["POST"])
def create_folder():
    data = request.get_json()    
    folder_name = next(iter(data)) 

    # Obtener los valores de columns y rows y convertirlos a enteros
    folder_data = data[folder_name]
    folder_data["columns"] = int(folder_data["columns"]) 
    folder_data["rows"] = int(folder_data["rows"]) 


    with open(os.path.join(base_dir, ".config/pages.json"), "r+") as f:
        pages = json.load(f)
    
    if folder_name in pages:
        log.warning(f"Folder '{folder_name}' already exists")
        return jsonify({"success": False, "message": "Folder already exists"})

    pages[folder_name] = data[folder_name]

    with open(os.path.join(base_dir, ".config/pages.json"), "w") as f:
        json.dump(pages, f, indent=4)

    return jsonify({"success": True, "message": "Folder created successfully"})

def select_file():
    if sys.platform == "win32":
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        file_path = filedialog.askopenfilename()
        root.destroy()
        return file_path

def select_folder():
    if sys.platform == "win32":
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder_path = filedialog.askdirectory()
        root.destroy()
        return folder_path
    
@app.route("/get_sysfile", methods=["GET"])
def get_sysfile():
    file_path = select_file()
    if file_path:
        return jsonify({"path": file_path})
    return jsonify({"error": "No file selected"}), 400

@app.route("/get_sysfolder", methods=["GET"])
def get_sysfolder():
    folder_path = select_folder()
    if folder_path:
        return jsonify({"path": folder_path})
    return jsonify({"error": "No folder selected"}), 400
    
    
@app.route("/delete_folder/<folder_name>", methods=["DELETE"])
def delete_folder(folder_name):
    print("holas")
    with open(os.path.join(base_dir, ".config/pages.json"), "r+") as f:
        pages = json.load(f)
        #check if its only one folder left
        if len(pages) == 1:
            return jsonify({"success": False, "message": "You cannot delete the last folder"})
        if folder_name in pages:
            del pages[folder_name]
            with open(os.path.join(base_dir, ".config/pages.json"), "w") as f:
                json.dump(pages, f, indent=4)
            return jsonify({"success": True, "message": "Folder deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Folder not found"})
            

@app.route("/favicon.ico", methods=["GET"])
def favicon():
    return send_from_directory(os.path.join(base_dir, "static", "icons"), "icon.ico")

@app.errorhandler(Exception)
def handle_exception(e):
    if request.url:
        log.warning(f"An error occurred while handling a request to {request.url}")
    log.exception(e, "An error occurred during a request")    
    if not loaded_settings["neodeck"].get("flask_debug"):
        response = jsonify({"success": False, "message": str(e)})
        response.status_code = 500
        return response


if (    
    loaded_settings["neodeck"].get("automatic_firewall_bypass") == True
    and check_firewall_permission() == False
):
    fix_firewall_permission()

log.info(f"Local IP address detected: {local_ip}")

def run_server():
    change_server_state(1)

    is_exe = getattr(sys, "frozen", False)

    neodeck = get_settings("neodeck")

    use_werkzeug = neodeck.get("server") == "werkzeug"
    debug_enabled = neodeck.get("flask_debug")
    reloader_enabled = neodeck.get("flask_reloader", False)
    

    # -------------------------------------------------
    # DEVELOPMENT MODE
    # -------------------------------------------------
    if use_werkzeug and not is_exe:
        log.info(f"Running server (Werkzeug) on http://{local_ip}:{PORT}")
        socketio.run(
            app,
            host=local_ip,
            port=PORT,
            debug=debug_enabled,
            use_reloader=reloader_enabled
        )
        return

    # -------------------------------------------------
    # PRODUCTION MODE (EXE)
    # -------------------------------------------------
    log.info(f"Running production server on http://{local_ip}:{PORT}")
    socketio.run(
        app,
        host="0.0.0.0",
        port=PORT,
        debug=debug_enabled,
        use_reloader=False
    )


if __name__ == "__main__":
    run_server()

