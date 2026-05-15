from comtypes import CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED, CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, ISimpleAudioVolume, IAudioEndpointVolume
from ctypes import cast, POINTER
from flask import jsonify


def _resolve_com_device(speakers):
    """Unwrap whatever GetSpeakers() returns into a raw COM device."""
    # Newer pycaw: AudioDevice wrapper
    if hasattr(speakers, '_dev'):
        return speakers._dev
    # Older pycaw: raw COM device with Activate directly
    if hasattr(speakers, 'Activate'):
        return speakers
    raise RuntimeError(
        f"Unsupported GetSpeakers() type: {type(speakers).__name__}. "
        f"Attrs: {[a for a in dir(speakers) if not a.startswith('__')]}"
    )


def _get_volume_interface():
    try:
        CoInitializeEx(COINIT_APARTMENTTHREADED)
        device = _resolve_com_device(AudioUtilities.GetSpeakers())
        interface = device.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        return cast(interface, POINTER(IAudioEndpointVolume))
    except Exception as e:
        print(f"Error al obtener interfaz de volumen: {e}")
        raise
    finally:
        try:
            CoUninitialize()
        except:
            pass


def get_volume():
    """Get current volume level (0-100)"""
    try:
        volume = _get_volume_interface()
        vol = int(volume.GetMasterVolumeLevelScalar() * 100)
        return jsonify({"data": vol})
    except Exception as e:
        print(f"Error en get_volume: {e}")
        return jsonify({"success": False, "message": f"Error obteniendo volumen: {e}"})


def get_mute():
    """Get current mute state"""
    try:
        volume = _get_volume_interface()
        muted = bool(volume.GetMute())
        return jsonify({"data": muted})
    except Exception as e:
        print(f"Error en get_mute: {e}")
        return jsonify({"success": False, "message": f"Error obteniendo mute: {e}"})


def set_volume(message):
    """Set volume using message format '!volume 50'"""
    try:
        parts = message.split()
        if len(parts) < 2:
            return jsonify({"success": False, "message": "Formato incorrecto. Usa '!volume 50'"})
        try:
            level = int(parts[1])
            level = max(0, min(100, level))
        except ValueError:
            return jsonify({"success": False, "message": "Valor inválido. Usa '!volume 50'"})

        volume = _get_volume_interface()
        if volume.GetMute():
            volume.SetMute(0, None)
        volume.SetMasterVolumeLevelScalar(level / 100, None)
        return jsonify({"success": True, "set_to": level})
    except Exception as e:
        print(f"Error en set_volume: {e}")
        return jsonify({"success": False, "message": f"⚠ Error de audio: {e}"})


def get_audio_sessions():
    """Get all active audio sessions (excludes System Sounds)"""
    try:
        CoInitializeEx(COINIT_APARTMENTTHREADED)
        sessions = AudioUtilities.GetAllSessions()
        apps = []

        for session in sessions:
            process = session.Process
            if process is None:
                continue  # ignorar System Sounds

            volume = session._ctl.QueryInterface(ISimpleAudioVolume)

            apps.append({
                "name": process.name(),
                "pid": process.pid,
                "volume": int(volume.GetMasterVolume() * 100),
                "muted": bool(volume.GetMute()),
                "_volume_ctrl": volume,
            })

        return apps
    except Exception as e:
        print(f"Error en get_audio_sessions: {e}")
        raise
    finally:
        try:
            CoUninitialize()
        except:
            pass


def set_app_volume(pid_or_name, level: int):
    """
    Set volume for a specific app by PID or name.
    Accepts: PID (int or str) or app name (with or without .exe)
    """
    try:
        CoInitializeEx(COINIT_APARTMENTTHREADED)
        level = max(0, min(100, level))
        sessions = AudioUtilities.GetAllSessions()

        for session in sessions:
            process = session.Process
            if process is None:
                continue

            match = (
                str(process.pid) == str(pid_or_name) or
                process.name().lower().replace(".exe", "") == str(pid_or_name).lower().replace(".exe", "")
            )

            if match:
                volume = session._ctl.QueryInterface(ISimpleAudioVolume)
                volume.SetMasterVolume(level / 100, None)
                return {"success": True, "target": pid_or_name, "set_to": level}

        return {"success": False, "message": f"No session found for '{pid_or_name}'"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        try:
            CoUninitialize()
        except:
            pass


def set_app_mute(pid_or_name, mute: bool):
    """Mute/unmute a specific app by PID or name."""
    try:
        CoInitializeEx(COINIT_APARTMENTTHREADED)
        sessions = AudioUtilities.GetAllSessions()

        for session in sessions:
            process = session.Process
            if process is None:
                continue

            match = (
                str(process.pid) == str(pid_or_name) or
                process.name().lower().replace(".exe", "") == str(pid_or_name).lower().replace(".exe", "")
            )

            if match:
                volume = session._ctl.QueryInterface(ISimpleAudioVolume)
                volume.SetMute(mute, None)
                return {"success": True, "target": pid_or_name, "muted": mute}

        return {"success": False, "message": f"No session found for '{pid_or_name}'"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        try:
            CoUninitialize()
        except:
            pass


def generate_audio_mixer_folder(sessions):

    def grid_dim(n):
        cols = 4
        rows = (n + cols - 1) // cols
        return cols, rows

    def clamp(x):
        return max(0, min(255, x))

    # Filtro extra por si acaso llega alguno sin PID
    sessions = [s for s in sessions if s["pid"] is not None]

    total_buttons = len(sessions) + 1
    cols, rows = grid_dim(total_buttons)

    buttons = []
    base_color = "#003d1f"

    for index, session in enumerate(sessions):
        col = (index % cols) + 1
        row = (index // cols) + 1

        name = session["name"].replace(".exe", "")
        pid = session["pid"]
        volume = session["volume"]
        muted = session["muted"]

        color_offset = min(index * 10, 80)
        r = clamp(int(base_color[1:3], 16) + color_offset)
        g = clamp(int(base_color[3:5], 16) + color_offset)
        b = clamp(int(base_color[5:7], 16) + color_offset)
        bg_color = f"#{r:02x}{g:02x}{b:02x}"

        buttons.append({
            "background_color": bg_color,
            "column": col,
            "row": row,
            "endcolumn": col,
            "endrow": row,
            "command": f"!app_volume {pid}",
            "image": "",
            "image_size": "0",
            "text_color": "#ffffff",
            "btn_text": f"{name}",
        })

    back_index = len(sessions)
    back_col = (back_index % cols) + 1
    back_row = (back_index // cols) + 1

    buttons.append({
        "background_color": base_color,
        "command": "$folder()",
        "column": back_col,
        "row": back_row,
        "endcolumn": back_col,
        "endrow": back_row,
        "image": "/static/img/back11.svg",
        "image_size": "95",
        "text_color": "#000000"
    })

    return {
        "background": "#1a1a1a",
        "buttons": buttons,
        "columns": cols,
        "rows": rows
    }


def get_mixer():
    """Return all mixer apps as JSON"""
    try:
        apps = get_audio_sessions()
        serializable = [
            {k: v for k, v in app.items() if k != "_volume_ctrl"}
            for app in apps
        ]
        return jsonify({"data": serializable})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


def set_mixer_volume(message):
    """
    Handles: '!app_volume <pid_or_name> <0-100>'
    Examples:
        !app_volume 1234 75
        !app_volume spotify 50
        !app_volume chrome.exe 80
    """
    try:
        parts = message.split()
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Format: '!app_volume <pid_or_name> <0-100>'"})

        target = parts[1]
        level = int(parts[2])
        result = set_app_volume(target, level)
        return jsonify(result)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid volume value"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    

def get_app_volume(message):
    """
    Get volume for a specific app by PID or name.
    Format: '!app_volume <pid_or_name>'
    """
    try:
        parts = message.split()
        if len(parts) < 2:
            return jsonify({"success": False, "message": "Format: '!app_volume <pid_or_name>'"})

        target = parts[1]

        CoInitializeEx(COINIT_APARTMENTTHREADED)
        sessions = AudioUtilities.GetAllSessions()

        for session in sessions:
            process = session.Process
            if process is None:
                continue

            match = (
                str(process.pid) == str(target) or
                process.name().lower().replace(".exe", "") == target.lower().replace(".exe", "")
            )

            if match:
                volume = session._ctl.QueryInterface(ISimpleAudioVolume)
                print({
                    "data": int(volume.GetMasterVolume() * 100),
                    "muted": bool(volume.GetMute()),
                    "target": target
                })
                return jsonify({
                    "data": int(volume.GetMasterVolume() * 100),
                    "muted": bool(volume.GetMute()),
                    "target": target
                })

        return jsonify({"success": False, "message": f"No session found for '{target}'"})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        try:
            CoUninitialize()
        except:
            pass