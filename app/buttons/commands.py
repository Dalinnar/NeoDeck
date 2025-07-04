
import json
import subprocess
import sys
import os
import keyboard
import pyautogui
import webbrowser
from flask import jsonify



from app.buttons.audio.volume import set_volume
from app.utils.firewall import fix_firewall_permission
from app.utils.kill_nircmd import kill_nircmd
from app.utils.logger import log

from . import (actions, audio, exec, soundboard,
               system, window)

def get_monitors(requested_monitors):
    global monitors_map
    result = {}
    for monitor in requested_monitors:
        if monitor in monitors_map:
            result[monitor] = monitors_map[monitor]()
    return json.dumps(result, indent=4)


def handle_command(message: str = None):
    """Executes a command from `command_map` based on the received message."""
    global command_map
    if not message:
        return jsonify({"success": False, "error": "No message provided"})

    message = message.replace("<|§|>", " ").replace("\n", "").replace("\r", "").strip()
    log.info(f"Received command: {message}")
    cmd, _, rest = message.partition(" ")

    func = command_map.get(cmd)
    if func:
        result = func(message) if 'message' in func.__code__.co_varnames else func()
        return result if result is not None else ""

    return jsonify({"success": True})


monitors_map = {
    "cpu":      lambda: actions.get_cpu_usage(),
    "memory":   lambda: actions.get_memory_usage(),
    "disks":    lambda: actions.get_disks_usage(),
    "network":  lambda: actions.get_network_usage(),
    "gpus":     lambda: actions.get_gpus_info(),
}

command_map ={
        "/debug-send":              lambda: log.info("Debug message sent"),
        "/bypass-windows-firewall": lambda: fix_firewall_permission(),
        "/exit" :                   lambda: sys.exit("/exit received"),
        "/stop_sound":              lambda: soundboard.stopsound(),
        "/PCshutdown":              lambda: subprocess.Popen("shutdown /s /f /t 0", shell=True),
        "/PCrestart":               lambda: subprocess.Popen("shutdown /r /f /t 0", shell=True),
        "/PCsleep":                 lambda: subprocess.Popen("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True),
        "/PChibernate":             lambda: subprocess.Popen("shutdown /h /t 0", shell=True),
        "/locksession":             lambda: subprocess.Popen("Rundll32.exe user32.dll,LockWorkStation", shell=True),
        "/screensaversettings" :    lambda: subprocess.Popen("rundll32.exe desk.cpl,InstallScreenSaver toasters.scr", shell=True),
        "/clearclipboard":          lambda: subprocess.Popen('cmd /c "echo off | clip"', shell=True),
        "/soundcontrol_mute":       lambda: pyautogui.press("volumemute"),
        "/mediacontrol_playpause":  lambda: pyautogui.press("playpause"),
        "/mediacontrol_previous":   lambda: pyautogui.press("prevtrack"),
        "/mediacontrol_next":       lambda: pyautogui.press("nexttrack"),
        "/speechrecognition":       lambda: pyautogui.hotkey("win", "h"),
        "/cut":                     lambda: pyautogui.hotkey("ctrl", "x"),
        "/clipboard":               lambda: pyautogui.hotkey("win", "v"),
        "/restartexplorer":         lambda: actions.restart_explorer(),

        "/key":                     lambda message: pyautogui.press(message.replace("/key", "", 1).strip()),
        "/delete_folder":           lambda message: actions.delete_folder(message.replace("/delete_folder ", "")),
        "/writeandsend":            lambda message: (keyboard.write(message.replace("/writeandsend ","")) or keyboard.press("ENTER")),
        "/write":                   lambda message: keyboard.write(message.replace("/write ", "")),
        "/setmicrophone":           lambda message: audio.set_microphone_by_name(message.replace("/setmicrophone", "").strip()),
        "/setoutputdevice":         lambda message: audio.set_speakers_by_name(message.replace("/setoutputdevice", "").strip()),
        "/restart":                 lambda message: actions.restarttask(message),
        "!volume":                  lambda message: set_volume(message),

        "/colorpicker":             lambda : actions.get_color_under_cursor(),
        "/exec":                    lambda message: exec.python(message),
        "/batch":                   lambda message: exec.batch(message),
        "/firstplan":               lambda message: actions.bring_window_to_foreground(message),
        "/start":                   lambda message: actions.open_file(message),        
        "/open_folder": lambda message: os.startfile(message.replace("/open_folder", "").strip()),
        #open the default browser to search the message url
        "/browse": lambda message: webbrowser.open(message.replace("/browse", "").strip()),

        ("/playsound", "/playlocalsound"):                      lambda message : soundboard.playsound(*soundboard.get_params(message)),
        ("/kill", "/taskill", "/taskkill", "/forceclose"):      lambda message: actions.killtask(message),
        ("/appvolume +", "/appvolume -", "/appvolume set"):     lambda message: actions.adjust_app_volume(message),
        ("/copy","/paste"):                                     lambda message: actions.clipboard_action(message),

        "/screensaver": lambda message: (
            subprocess.Popen("%windir%\system32\scrnsave.scr /s", shell=True) if message.endswith(("on", "/screensaver", "start")) else
            (subprocess.Popen('"lib/nircmd.exe" monitor off', shell=True) and kill_nircmd() if message.endswith(("hard", "full", "black")) else
            pyautogui.press("CTRL") if message.endswith(("off", "false")) else None)
        ),
        "/superAltF4":lambda:(
            window.close(window.get_focused()), 
            subprocess.Popen(f"taskkill /f /im {window.get_focused()}",shell=True),
            subprocess.Popen(f"taskkill /f /im {window.get_focused()}.exe", shell=True)) if window.get_focused() else None,
    }
