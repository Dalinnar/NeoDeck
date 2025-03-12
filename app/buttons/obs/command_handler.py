from obswebsocket import obsws
from obswebsocket import requests as obsrequests

from app.utils.global_variables import get_global_variables
from app.utils.languages import text
from app.utils.logger import log
from flask import jsonify   
import app.buttons.obs.scenes as scene
import app.buttons.obs.recording as recording
import app.buttons.obs.streaming as stream
import app.buttons.obs.virtualcam as virtualcam
import app.buttons.obs.sources as source


#    https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
#    https://github.com/Elektordi/obs-websocket-py



def handle_command(message: str = None):
    command_arguments = message
    message = message.replace("<|\u00a7|>", " ").replace("\n", "").replace("\r", "")
    if message:
        log.info(f"Command received: {message}")

    try:
        obs_host, obs_port, obs_password = get_global_variables(("obs_host", "obs_port", "obs_password"))
        obs = obsws(obs_host, obs_port, obs_password)
        obs.connect()
    except Exception as e:
        if "10061" in str(e):
            log.exception(e, "Failed connection to OBS: The websocket server cannot be found.", log_traceback=False)
            error = text("obs_error_10061")
        elif "password may be inco" in str(e):
            log.exception(e, "Failed connection to OBS: Password may be incorrect.", log_traceback=False)
            error = text("obs_error_incorrect_password")
        else:
            error = str(e)
        raise ConnectionError(f"{text('obs_failed_connection_error').replace('.','')}: {error}")

    command_map = {
        "/obs_toggle_rec": lambda: recording.toggle(obs),
        "/obs_start_rec": lambda: recording.start(obs),
        "/obs_stop_rec": lambda: recording.stop(obs),
        "/obs_toggle_rec_pause": lambda: recording.pause_toggle(obs),
        "/obs_pause_rec": lambda: recording.pause(obs),
        "/obs_resume_rec": lambda: recording.resume(obs),
        "/obs_toggle_stream": lambda: stream.toggle(obs),
        "/obs_start_stream": lambda: stream.start(obs),
        "/obs_stop_stream": lambda: stream.stop(obs),
        "/obs_toggle_virtualcam": lambda: virtualcam.toggle(obs),
        "/obs_start_virtualcam": lambda: virtualcam.start(obs),
        "/obs_stop_virtualcam": lambda: virtualcam.stop(obs),
        "/obs_scene": lambda message: scene.set(obs, message.replace("/obs_scene", "").strip()),
        "/obs_togglesource": lambda message: source.toggle(obs, message.replace("/obs_togglesource", "").strip()),
        "/obs_key": lambda message: handle_obs_key(obs, message)
    }

    for command, func in command_map.items():
        if message.startswith(command):
            return func(message) if "message" in func.__code__.co_varnames else func()
    
    obs.disconnect()
    return jsonify({"success": True})

def handle_obs_key(obs, message):
    hotkey = message.split(' ')[-1]
    result = obs.call(obsrequests.TriggerHotkeyByKeySequence(keyId=f"OBS_KEY_{hotkey}"))
    if "failed" in str(result):
        log.error(f"Failed to trigger hotkey '{hotkey}': {result}")
        raise RuntimeError(f"{text('failed')} :/")
    log.success(f"Hotkey triggered '{hotkey}' successfully.")