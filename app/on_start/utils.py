import os
import sys

import subprocess
import shutil
import json
import urllib.request

import threading
from math import sqrt
from win32com.client import Dispatch
from settings import *
from app.updater import check_files, check_for_updates
from app.utils.get_local_ip import get_local_ip
from settings import load_settings
from app.utils.args import get_arg
from app.utils.logger import log

def color_distance(color1, color2):
    r1, g1, b1 = [int(color1[i:i+2], 16) for i in range(1, 7, 2)]
    r2, g2, b2 = [int(color2[i:i+2], 16) for i in range(1, 7, 2)]
    return sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2)

def load_colors():
    path = "neodeck/colors.json"
    url = "https://gist.githubusercontent.com/Lenochxd/12a1927943a2ce151560e1b9585d4bfa/raw/41d5a0dc9336827cefb217c1728f0e9415b1c7b9/colors_db.json"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        try:
            with urllib.request.urlopen(url) as response:
                data = json.load(response)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
            return data
        except Exception as e:
            log.exception(e, "Failed to load colors.json")
            return []

def sort_colors():
    data = load_colors()
    if not data:
        return
    sorted_colors = [data.pop(0)]
    while data:
        nearest_color = min(data, key=lambda c: color_distance(sorted_colors[-1]["hex_code"], c["hex_code"]))
        sorted_colors.append(nearest_color)
        data.remove(nearest_color)
    with open("neodeck/colors.json", "w", encoding="utf-8") as f:
        json.dump(sorted_colors, f, indent=4)

def get_gpu_method():
    import pynvml
    if "gpu_method" not in loaded_settings["neodeck"]:
        loaded_settings["neodeck"]["gpu_method"] = "nvidia (pynvml)"
    if loaded_settings["neodeck"]["gpu_method"] == "nvidia (pynvml)":
        try:
            pynvml.nvmlInit()
        except pynvml.NVMLError:
            loaded_settings["neodeck"]["gpu_method"] = "AMD"
    load_settings(loaded_settings)

def fix_vlc_cache():
    if os.name != 'nt':
        return
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\VideoLAN\VLC")
        vlc_path, _ = winreg.QueryValueEx(key, "InstallDir")
        winreg.CloseKey(key)
        subprocess.run(f'"{vlc_path}/vlc-cache-gen.exe" "{vlc_path}/plugins"', shell=True, check=True)
    except Exception as e:
        log.exception(e, "Failed to execute VLC cache generation command")

def create_directories():
    for path in [".config/user_uploads", ".config/themes", "plugins"]:
        os.makedirs(path, exist_ok=True)
    if os.path.exists("static/files/uploaded"):
        for file in os.listdir("static/files/uploaded"):
            shutil.move(f"static/files/uploaded/{file}", f".config/user_uploads/{file}")
        shutil.rmtree("static/files/uploaded")

def handle_shortcut():
    if os.name != 'nt':
        return
    shortcut_path = os.path.join(os.getenv("APPDATA"), "Microsoft/Windows/Start Menu/Programs/Neodeck.lnk")
    if loaded_settings["neodeck"].get("windows_start_menu_shortcut", False):
        if not os.path.exists(shortcut_path) and getattr(sys, "frozen", False):
            shell = Dispatch("WScript.Shell")
            shortcut = shell.CreateShortCut(shortcut_path)
            shortcut.Targetpath = os.path.join(os.getcwd(), "Neodeck.exe")
            shortcut.WorkingDirectory = os.getcwd()
            shortcut.IconLocation = os.path.join(os.getcwd(), "Neodeck.exe")
            shortcut.save()

def on_start():
    create_directories()
    handle_shortcut()
    check_files()
    get_gpu_method()
    if (loaded_settings["neodeck"].get("auto_updates", True) or get_arg('force_update')) and not get_arg('no_auto_update'):
        check_for_updates()
    local_ip = get_local_ip()
    if loaded_settings["neodeck"].get("ip") == "local_ip":
        loaded_settings["neodeck"]["ip"] = local_ip
        load_settings(loaded_settings)
    threading.Thread(target=on_start_threaded, args=(loaded_settings["neodeck"].get("sort_colors_on_startup", False),)).start()
    return local_ip

def on_start_threaded(sort_colors_flag: bool):
    fix_vlc_cache()
    if sort_colors_flag:
        sort_colors()