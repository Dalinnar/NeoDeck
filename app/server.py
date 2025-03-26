# Standard library imports
import re
import random
import json
import os
import sys
import ipaddress
import ast
import logging
import psutil
from settings import default_settings,loaded_settings, get_settings, load_settings




# Third-party library imports
from PIL import Image
from GPUtil import getGPUs
from werkzeug.serving import make_server
from flask import Flask, request, jsonify, render_template, send_file, make_response,send_from_directory, redirect, url_for
from flask.wrappers import Response
from flask_socketio import SocketIO
from flask_minify import Minify
from engineio.async_drivers import gevent # DO NOT REMOVE
from win32com.client import Dispatch
import easygui
from app.utils.plugins.load_plugins import load_plugins


# WebDeck imports
from .on_start import on_start
from .utils.global_variables import set_global_variable, get_global_variable

config, local_ip = on_start()
folders_to_create = []
set_global_variable("config", config)

from app.tray import change_tray_language, change_server_state
from .utils.themes.parse_themes import parse_themes
from .utils.working_dir import get_base_dir
from .utils.settings.get_config import get_port, get_config
from .utils.settings.audio_devices import get_audio_devices


from .utils.firewall import fix_firewall_permission, check_firewall_permission
from .utils.languages import text, get_languages_info, get_language,get_new_text
from .utils.logger import log
from .utils.args import get_arg
from .buttons.usage import get_usage

from .functions import *
from .buttons import handle_command as command


change_server_state(0)


base_dir = get_base_dir()
template_folder = os.path.join(base_dir, 'templates')
static_folder = os.path.join(base_dir, 'static')


app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)


socketio = SocketIO(app)
commands = load_plugins(app)
#load all the settings now with all the plugins on
settings =get_settings()

logging.getLogger("werkzeug").disabled = True
app.jinja_env.globals.update(
    get_audio_devices=get_audio_devices,
    mdebug=log.debug
)
if getattr(sys, "frozen", False):
    Minify(app=app, html=True, js=True, cssless=True)
app.config["SECRET_KEY"] = get_config()["settings"]["flask_secret_key"]



@app.route("/monitors", methods=["POST"])
def usage():
    return jsonify(get_usage())
    


# Middleware to check request IP address
@app.before_request
def check_local_network():
    """
    Checks if the remote IP address of the incoming request is within the same local network
    as the server or within the allowed networks specified in the configuration.
    The function compares the remote IP address with the server's local IP address using a 
    specified netmask. If the remote IP is not within the same network, it checks if the 
    remote IP is within any of the allowed networks defined in the configuration settings.
    
    Returns:
        None: If the remote IP is within the same network or an allowed network.
        tuple: A tuple containing an error message and an HTTP status code 403 if the remote 
               IP is not authorized.
    """
    
    netmask = config["settings"].get("netmask", 16)
    remote_ip = ipaddress.ip_address(request.remote_addr)
    local_ip_network = ipaddress.ip_network(f"{local_ip}/{netmask}", strict=False)
    
    # log.debug(f"Remote IP address: {remote_ip}")
    # log.debug(f"Local IP network: {local_ip_network}")
    # log.debug(f"{remote_ip in local_ip_network = }")
    
    if remote_ip not in local_ip_network:
        
        for network in config["settings"].get("allowed_networks", []):
            if remote_ip in ipaddress.ip_address(network):
                return None
        
        return jsonify({"success": False, "message": "Access denied: IP not in local network"}), 403


@app.after_request
def after_request(response):
    if request.path != "/usage":
        log.httprequest(request, response)
    return response


# Function to get all the svgs from the theme file, so we can load them during the loading screen
def get_svgs():
    svgs = []

    with open("static/css/style.css", "r") as f:
        content = f.read()

        # url(...)
        matches = re.findall(r"url\(([^)]+)\)", content)

        for match in matches:
            if match.endswith(".svg"):
                svgs.append(match)

    return svgs


@app.route("/")
def home():
    
    return redirect("/home")
    config = get_config(save_updated_config=True)

    with open("webdeck/version.json", encoding="utf-8") as f:
        versions = json.load(f)

    is_exe = bool(getattr(sys, "frozen", False))

    random_bg = "//"
    while random_bg.startswith("//"):
        random_bg = random.choice(config["front"]["background"])
        if random_bg.startswith("**uploaded/"):
            random_bg_path = random_bg.replace("**uploaded/", ".config/user_uploads/")
            if os.path.exists(random_bg_path):
                file_name, extension = os.path.splitext(os.path.basename(random_bg_path))
                random_bg_90_path = f".config/user_uploads/{file_name}-90{extension}"
                if not os.path.exists(random_bg_90_path):
                    try:
                        img = Image.open(random_bg_path)
                        img_rotated = img.rotate(-90, expand=True)
                        img_rotated.save(random_bg_90_path)
                    except Exception as e:
                        log.exception(e, f"Failed to rotate image {random_bg_path}")
    log.debug(f"Selected random background image: {random_bg}")

    themes = [
        file_name for file_name in os.listdir(".config/themes/")
        if file_name.endswith(".css")
    ]

    return render_template(
        "index.jinja",
        config=config, themes=themes, parsed_themes=parse_themes(),
        commands=commands, versions=versions, random_bg=random_bg, usage_example=get_usage(True),
        langs=get_languages_info(), svgs=get_svgs(), is_exe=is_exe, portrait_rotate=config['front']['portrait_rotate'],
        int=int, str=str, dict=dict, json=json, type=type, eval=eval, open=open,
        isfile=os.path.isfile, text=text, get_language=get_language,
    )


@app.route('/home')
def new():
    context = {}
    config = get_config(save_updated_config=True)
    context["image_list"] = get_image_list()
    #open pages.json if not exist make it 
    with open(".config/pages.json", "r") as f:        
        pages = json.load(f)
        context["pages"] = list(pages.keys())
        context["deck_folder"] = pages[next(iter(pages))]  
        context["folder_name"] = str(next(iter(pages)))
        textdir = get_new_text()
        context["text"] = textdir
        context["commands"] = commands
        
    return render_template("index_new.jinja",config=config,context=context)

#add method get and post to settings
@app.route("/settings", methods=["GET", "POST"])
def settings_page():
    context = {}
    
    context["text"] = get_new_text()
    context["default_settings"] = default_settings
    context["saved_settings"] = settings
    return render_template("settings.jinja", context=context)

@app.route("/api/<value>")
def api(value):
    
    value_map = {
        "disks": [p.device[0] for p in psutil.disk_partitions()],
        "gpus" : [f"GPU{i+1}" for i in range(len(getGPUs()))],
        "deck_folders" : load_deck_folders()
    }    
    return jsonify(value_map[value])


@app.route("/save_settings", methods=["POST"])
def save_settings():
    global settings
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    new_merge = deep_merge(deep_merge(default_settings, settings), data)
    load_settings(new_merge)
    #update the settings
    settings = get_settings()
    
    return jsonify({"success": True})

@app.route("/upload_file", methods=["POST"])
def upload_file():
    log.debug(f"request: {request}")
    log.debug(f"request.files: {request.files}")
    if "file" not in request.files:
        log.error("No files were found in the request.")
        return jsonify({"success": False, "message": text("no_files_found_error")})

    uploaded_file = request.files["file"]

    save_path = os.path.join(".config/user_uploads", uploaded_file.filename)
    uploaded_file.save(save_path)

    if request.form.get("info") and request.form.get("info") == "background_image":
        try:
            img = Image.open(save_path)
            img_rotated = img.rotate(-90, expand=True)
            file_name, extension = os.path.splitext(os.path.basename(save_path))
            img_rotated.save(f".config/user_uploads/{file_name}-90{extension}")
        except Exception as e:
            log.exception(e, "Failed to rotate image during upload")

    log.success(f"File '{uploaded_file.filename}' uploaded successfully")
    return jsonify({"success": True, "message": text("downloaded_successfully"),"file_path": f"{save_path}"})





@app.route('/temp/<filename>')
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



@socketio.on("connect")
def socketio_connect():
    log.info("Socketio client connected")

@socketio.event
def send(data):
    socketio.emit("json_data", data)

@socketio.on("message_from_socket")
def send_data_socketio(message):
    try:
        result = command(message=message)
    except Exception as e:
        log.exception(e, "An error occurred while handling a command")
        return jsonify({"success": False, "message": str(e)})
    
    if result is False:
        socketio.emit("json_data", {"success": False})
    elif isinstance(result, Response):
        response_data = {
            "status_code": result.status_code,
            "headers": dict(result.headers),
            "data": result.get_json() if result.is_json else result.get_data(as_text=True)
        }
        socketio.emit("json_data", response_data)
    elif not isinstance(result, dict):
        socketio.emit("json_data", {"success": True})
    else:
        socketio.emit("json_data", result)

@app.route("/send-data", methods=["POST"])
def send_data_route():
    try:
        result = command(message=request.get_json().get("message", ""))        
    except Exception as e:
        log.exception(e, "An error occurred while handling a command")
        return jsonify({"success": False, "message": str(e)})
    
    if result is False:
        return jsonify({"success": False})
    
    elif isinstance(result, Response):
        log.info("sending response from route")
        return result
    
    elif isinstance(result, dict):
        log.info("sending response from route")
        return jsonify(result)
    
    # Si el resultado es algo que se puede representar como JSON (por ejemplo, un string o un número).
    return jsonify({"success": True, "data": result})


@app.route("/update_folder_data/<folder_name>", methods=["POST"])
def update_folder_data(folder_name):
    data = request.get_json()

    with open(os.path.join(base_dir ,".config/pages.json") , "r+") as f:
        pages = json.load(f)  # Leer el JSON
        pages[folder_name] = data  # Modificar datos

        f.seek(0)  # Volver al inicio del archivo
        json.dump(pages, f, indent=4)  # Escribir el JSON formateado
        f.truncate()  # Eliminar contenido sobrante si el nuevo JSON es más corto

    return jsonify({"success": True, "message": "Folder data updated successfully", "folder":pages[folder_name] })
    



@app.route("/get_page/<folder_name>", methods=["GET"])
def get_page(folder_name):
    with open(os.path.join(base_dir ,".config/pages.json") , "r+") as f:
        pages = json.load(f)  # Leer el JSON
        return jsonify(pages[folder_name])

@app.errorhandler(Exception)
def handle_exception(e):
    log.exception(e, "An error occurred during a request")
    if not config["settings"].get("flask_debug"):
        response = jsonify({"success": False, "message": str(e)})
        response.status_code = 500
        return response


if (
    config["settings"]["automatic_firewall_bypass"] == True
    and check_firewall_permission() == False
):
    fix_firewall_permission()

log.info(f"Local IP address detected: {local_ip}")

def run_server():
    
    change_server_state(1)
    if config["settings"].get("server") == "werkzeug" and not getattr(sys, "frozen", False):
        server = make_server(local_ip, get_port(), app)
        server.serve_forever()
    else:        
        app.run(
            host=get_arg("host") or local_ip,
            port=get_port(),
            debug=config["settings"].get("flask_debug"),
            use_reloader=config["settings"].get("flask_reloader", False),
        )