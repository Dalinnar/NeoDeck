
import re
import random
import json
import os
import sys
import ipaddress
import ast
import logging
import psutil
from app.utils.plugins.plugin_fetcher import *
from settings import default_settings,loaded_settings, get_settings, load_settings

import tkinter as tk
from tkinter import filedialog

# Third-party library imports
from PIL import Image
from GPUtil import getGPUs
from werkzeug.serving import make_server
from flask import Flask, request, jsonify, render_template, send_file, make_response,send_from_directory, abort
from flask.wrappers import Response
from flask_minify import Minify

from engineio.async_drivers import gevent # DO NOT REMOVE
from win32com.client import Dispatch
from app.utils.plugins.load_plugins import load_plugins


# WebDeck imports
from .on_start import on_start



from app.tray import change_tray_language, change_server_state
from .utils.themes.parse_themes import parse_themes
from .utils.working_dir import get_base_dir
from .utils.settings.get_config import get_port, get_config
from .utils.settings.audio_devices import get_audio_devices


from .utils.firewall import fix_firewall_permission, check_firewall_permission
from .utils.languages import text, get_languages_info, get_language,get_new_text
from .utils.logger import log
from .utils.args import get_arg

from .functions import *
from .buttons.commands import get_monitors ,handle_command

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


app = CustomFlask(__name__, template_folder=template_folder, static_folder=static_folder)
commands = load_plugins(app)
# app custon functions
app.get_settings = get_settings
app.BASE_DIR = base_dir
app.local_ip = local_ip



logging.getLogger("werkzeug").disabled = True
app.jinja_env.globals.update(
    get_audio_devices=get_audio_devices,
    mdebug=log.debug
)
if getattr(sys, "frozen", False):
    Minify(app=app, html=True, js=True, cssless=True)
app.config["SECRET_KEY"] = loaded_settings["webdeck"].get("secret_key", "secret_key")



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
    
    netmask =  loaded_settings["webdeck"].get("netmask", 16)
    remote_ip = ipaddress.ip_address(request.remote_addr)
    local_ip_network = ipaddress.ip_network(f"{local_ip}/{netmask}", strict=False)
    
    if remote_ip not in local_ip_network:
        for network in loaded_settings["webdeck"].get("allowed_networks", []):
            if remote_ip in ipaddress.ip_address(network):
                print("Access granted: IP in allowed network")
                return None
        
        return jsonify({"success": False, "message": "Access denied: IP not in local network"}), 403


@app.after_request
def after_request(response):
    if request.path != "/monitors":
        log.httprequest(request, response)
    return response

   
@app.route('/')
def home():
    context = {}
    context["image_list"] = get_image_list()
    context["temp_scripts"] = get_temp_scripts()

    if not os.path.exists(os.path.join(base_dir ,".config/pages.json")):
        with open(os.path.join(base_dir ,".config/pages.json"), "w") as f:
            json.dump({}, f)
    with open(os.path.join(base_dir ,".config/pages.json") , "r+") as f:
        pages = json.load(f)
        context["pages"] = list(pages.keys())
        context["deck_folder"] = pages[next(iter(pages))]  
        context["folder_name"] = str(next(iter(pages)))
        textdir = get_new_text()
        context["text"] = textdir
        context["commands"] = commands
    return render_template("index_new.jinja",context=context)

#add method get and post to settings
@app.route("/settings", methods=["GET", "POST"])
def settings_page():
    context = {}
    context["text"] = get_new_text()
    context["default_settings"] = default_settings
    context["saved_settings"] = loaded_settings
    return render_template("settings.jinja", context=context)


@app.route("/plugins")
def plugins_page():
        context = {}
        #context installed blueprints
        context["installed_blueprints"] = list(app.blueprints.keys())
        data=  get_github_file_content("plugins.json")
        context["repo"] = loaded_settings["webdeck"].get("plugins_repo", "Dalinnar/NeoDeck-plugins")
        data = json.loads(data)
        context["plugins_data"] = data  
        
        return render_template("plugins.jinja", context=context)


GITHUB_RAW_URL = "https://raw.githubusercontent.com"
@app.route('/gitcontent/<user>/<repo>/<path:file_path>')
def get_github_image(user, repo, file_path):
    token = loaded_settings["webdeck"].get("token", "")
    branch = "main"  # Puedes hacerlo dinámico si necesitas
    github_url = f"{GITHUB_RAW_URL}/{user}/{repo}/refs/heads/{branch}/{file_path}"
    #headers with the api key
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3.raw"
    }
    response = requests.get(github_url,headers=headers)
    
    if response.status_code == 200:
        return Response(response.content, content_type=response.headers["Content-Type"])
    else:
        return abort(404)
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
    global loaded_settings
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    new_merge = deep_merge(deep_merge(default_settings, loaded_settings), data)
    load_settings(new_merge)
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
    return jsonify({"success": True, "message": text("downloaded_successfully"), "file_path": save_path})



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

@app.route("/send-data", methods=["POST"])
def send_data_route():
    try:
        result = handle_command(message=request.get_json().get("message", ""))        
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
    #if data background_img i sremove_image , remove it from the folder
    if "background_img" in data and data["background_img"] == "remove_image":
        data["background_img"] = ""
    with open(os.path.join(base_dir ,".config/pages.json") , "r+") as f:
        pages = json.load(f)  
        pages[folder_name] = data 

        f.seek(0)  
        json.dump(pages, f, indent=4)
        f.truncate()

    return jsonify({"success": True, "message": "Folder data updated successfully", "folder":pages[folder_name] })
    



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
    if not loaded_settings["webdeck"].get("flask_debug"):
        response = jsonify({"success": False, "message": str(e)})
        response.status_code = 500
        return response


if (    
    loaded_settings["webdeck"].get("automatic_firewall_bypass") == True
    and check_firewall_permission() == False
):
    fix_firewall_permission()

log.info(f"Local IP address detected: {local_ip}")

def run_server():

    change_server_state(1)    
    if default_settings["webdeck"].get("server") == "werkzeug" and not getattr(sys, "frozen", False):
        server = make_server(local_ip, get_port(), app)
        server.serve_forever()
    else:        
        app.run(
            host=get_arg("host") or local_ip,
            port=get_port(),
            debug=loaded_settings["webdeck"].get("flask_debug"),
            use_reloader=loaded_settings["webdeck"].get("flask_reloader", False),
        )