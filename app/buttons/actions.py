import subprocess
import sys
import time
import psutil
import json


import comtypes
import keyboard
import pyautogui
import pyperclip
import win32gui
from flask import jsonify
from pycaw.pycaw import (AudioUtilities, IAudioEndpointVolume,
                         ISimpleAudioVolume)


from ..utils.settings.get_config import get_port, get_config
from ..utils.settings.save_config import save_config

from app.utils.logger import log

from . import window
from settings import loaded_settings
from .usage import extract_asked_device, get_usage


def restart_explorer():
    subprocess.Popen("taskkill /f /im explorer.exe", shell=True)
    time.sleep(0.5)
    subprocess.Popen("explorer.exe", shell=True)
    hwnd = window.get_by_name("explorer.exe")
    if hwnd:
        window.close(hwnd)

def handle_device_usage(message):
    asked_device = []

    device = extract_asked_device(message)
    if device is not None:
        asked_device.append(device)

    log.debug(f"Asked device: {asked_device}")
    usage = get_usage(False, asked_device)
    log.debug(f"Usage data: {usage}")
    
    return jsonify(usage)


def killtask(message):
    window_name = message.split(maxsplit=1)[-1]
    hwnd = window.get_by_name(window_name)

    if hwnd:
        log.debug(f"Window '{window_name}' found with handle: {hwnd}")
        try:
            window.close(hwnd)
            return
        except:
            pass  # Si falla, continúa con el método alternativo

    log.debug(f"Window '{window_name}' not found, trying taskkill")
    if "." not in window_name:
        window_name += ".exe"    
    subprocess.Popen(f"taskkill /f /im {window_name}", shell=True)

def restarttask(message):
        exe = message.replace("/restart", "")
        if not "." in exe:
            exe += ".exe"
            subprocess.Popen(f"taskkill /f /im {exe}", shell=True)
            subprocess.Popen(f"start {exe}", shell=True)

def adjust_app_volume(message):
    comtypes.CoInitialize()
    command = message.replace("/appvolume ", "").replace("set ", "set").split()
    sessions = AudioUtilities.GetAllSessions()
    for session in sessions:
        volume = session._ctl.QueryInterface(ISimpleAudioVolume)
        if session.Process and session.Process.name().lower() == command[1].lower():
            log.debug("Current volume: %s" % volume.GetMasterVolume())
            old_volume = volume.GetMasterVolume()
            old_volume_percent = round(old_volume * 100)

            if command[0].startswith("set"):
                target_volume = int(command[0].replace("set", ""))
                if target_volume > 100:
                    target_volume = 100
                if target_volume < 0:
                    target_volume = 0
            elif command[0].startswith("+"):
                if command[0].replace("+", "") == "":
                    target_volume = old_volume_percent + 1
                else:
                    target_volume = old_volume_percent + int(
                        command[0].replace("+", "")
                    )
            elif command[0].startswith("-"):
                if command[0].replace("-", "") == "":
                    target_volume = old_volume_percent - 1
                else:
                    target_volume = old_volume_percent - int(
                        command[0].replace("-", "")
                    )
            target_volume_float = target_volume / 100.0

            volume.SetMasterVolume(target_volume_float, None)
            log.debug("New volume: %s" % volume.GetMasterVolume())

    comtypes.CoUninitialize()


def clipboard_action(message):
    if message.startswith("/copy") or message.startswith("/paste"):
        action = message.split(" ")[0][1:]  
        msg = message[len(f"/{action}"):].strip()        
        if not msg:
            pyautogui.hotkey("ctrl", "c" if action == "copy" else "v")  
        else:
            if msg.startswith(f"/{action}"):
                msg = msg[len(f"/{action}"):]  
            pyperclip.copy(msg)  
            pyautogui.hotkey("ctrl", "c" if action == "copy" else "v")


def bring_window_to_foreground(message):
    window_name = message.replace("/firstplan", "").strip()

    hwnd = window.get_by_name(window_name)
    if hwnd:
        win32gui.SetForegroundWindow(hwnd)
        keyboard.press("ENTER")
        log.success(f"Window '{window_name}' has been brought to the foreground")
    else:
        log.error(f"Window '{window_name}' not found")
        raise RuntimeError(f"Window '{window_name}' not found")


# Definir funciones específicas para cada monitor
def get_cpu_usage():
    return {"usage_percent": psutil.cpu_percent(interval=1)}

def get_memory_usage():
    memory = psutil.virtual_memory()
    return {
        "total_gb": round(memory.total / 1024**3, 2),
        "used_gb": round((memory.total - memory.available) / 1024**3, 2),
        "available_gb": round(memory.available / 1024**3, 2),
        "usage_percent": memory.percent
    }

def get_disks_usage():
    disks_info = {}
    for disk in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(disk.device)
            disk_name = disk.device.replace("\\", "").replace(":", "")
            disks_info[disk_name] = {
                "total_gb": round(usage.total / 1024**3, 2),
                "used_gb": round(usage.used / 1024**3, 2),
                "free_gb": round(usage.free / 1024**3, 2),
                "usage_percent": usage.percent
            }
        except Exception:
            pass
    return disks_info

def get_network_usage():
    network = psutil.net_io_counters()
    return {"bytes_sent": network.bytes_sent, "bytes_recv": network.bytes_recv}