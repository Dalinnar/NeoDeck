import subprocess
import re
from pynput.keyboard import Key, Controller
import ctypes
import os
import time
import psutil
from PIL import ImageGrab
import pyperclip
from GPUtil import getGPUs
import win32api

import comtypes
import keyboard
import pyautogui
import pyperclip
import win32gui
from pycaw.pycaw import (AudioUtilities, IAudioEndpointVolume,
                         ISimpleAudioVolume)


from app.utils.logger import log

from . import window
from settings import loaded_settings


def restart_explorer():
    subprocess.Popen("taskkill /f /im explorer.exe", shell=True)
    time.sleep(0.5)
    subprocess.Popen("explorer.exe", shell=True)
    hwnd = window.get_by_name("explorer.exe")
    if hwnd:
        window.close(hwnd)




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


def get_color_under_cursor():
    x, y = win32api.GetCursorPos()  # Obtiene posición del mouse sin pyautogui
    image = ImageGrab.grab()
    color = image.getpixel((x, y))
    hex_color = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}".upper()
    pyperclip.copy(hex_color)
    return {
        "rgb": f"{color[0]}, {color[1]}, {color[2]}",
        "hex": hex_color
    }


def get_gpus_info():
    try:
        gpus = {}
        for gpu in getGPUs():
            name = gpu.name
            used_mb = gpu.memoryUsed
            total_mb = gpu.memoryTotal
            usage_percent = round((gpu.load * 100), 1)
            
            key = name if name not in gpus else f"{name} #{len([k for k in gpus if k.startswith(name)]) + 1}"

            gpus[key] = {
                "used_mb": used_mb,
                "total_mb": total_mb,
                "usage_percent": f"{usage_percent:.1f}%"
            }
        return gpus
    except Exception as e:
        print("GPU detection error:", e)
        return {}
    

def open_file(message):
    try:
        direction = message.split(" ", 1)[1].strip().strip('"')  # remove quotes

        if not os.path.exists(direction):
            raise FileNotFoundError(f"Path does not exist: {direction}")

        # Use ShellExecuteEx with 'runas' to ensure admin prompt if required
        if direction.lower().endswith(".exe"):
            # ShellExecuteW params: hwnd, operation, file, parameters, directory, show_cmd
            ctypes.windll.shell32.ShellExecuteW(
                None, "runas", direction, None, os.path.dirname(direction), 1
            )
        else:
            os.startfile(direction)

    except Exception as e:
        log.error(f"Error al abrir el archivo: {e}")





keyboard = Controller()

# Mapa de teclas especiales
SPECIAL_KEYS = {
    f"@{key}": value
    for key, value in Key.__dict__.items()
    if not key.startswith('_') and not callable(value)
}

def parse_macro_and_execute(macro_text):
    tokens = parse_macro(macro_text)
    execute_macro(tokens)

def parse_macro(macro_text):
    print(f"Parsing macro: {macro_text}")
    # Divide por partes (simultáneas, comandos o texto normal)
    tokens = re.findall(r'\{.*?\}|@\w+(?:_\d+ms)?|[^\{@]+', macro_text)
    return tokens

def execute_macro(tokens):
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        if token.startswith("{") and token.endswith("}"):
            # Teclas simultáneas
            keys = re.findall(r'@[\w\d_]+|.', token[1:-1])
            _press_simultaneously(keys)
        elif token.startswith("@wait_"):
            delay = int(re.findall(r'\d+', token)[0]) / 1000
            time.sleep(delay)
        elif token.startswith("@"):
            key = SPECIAL_KEYS.get(token)
            if key:
                keyboard.press(key)
                keyboard.release(key)
            else:
                print(f"Unknown special key: {token}")
        else:
            for char in token:
                keyboard.press(char)
                keyboard.release(char)

def _press_simultaneously(keys):
    key_objs = []
    for k in keys:
        if k.startswith("@"):
            key_objs.append(SPECIAL_KEYS.get(k))
        else:
            key_objs.append(k)

    # Press all
    for k in key_objs:
        keyboard.press(k)
    # Release all
    for k in reversed(key_objs):
        keyboard.release(k)