from ctypes import cast, POINTER
from comtypes import CoInitialize
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from comtypes import CLSCTX_ALL
from flask import jsonify

def set_volume(message):
    try:
        # Inicializar COM
        CoInitialize()

        # Obtener el dispositivo de audio predeterminado
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))

        # Si el mensaje contiene "get", solo devolvemos el volumen actual
        if message.endswith("get"):
            current_volume = int(volume.GetMasterVolumeLevelScalar() * 100)
            return jsonify({"data": current_volume})

        # Si no contiene "get", asumimos que es para establecer volumen
        parts = message.split()
        if len(parts) >= 2:
            value = int(parts[1])
            value = max(0, min(100, value))  # Limitar entre 0 y 100
            volume_level = value / 100.0

            # Desmutear si está muteado
            if volume.GetMute():
                volume.SetMute(0, None)

            volume.SetMasterVolumeLevelScalar(volume_level, None)

            return jsonify({"success": True, "set_to": value})
        else:
            return jsonify({"success": False, "message": "Formato incorrecto. Usa '!volume 50'"})

    except (IndexError, ValueError):
        return jsonify({"success": False, "message": "⚠ Error: Usa el formato '!volume 50'"})
    except Exception as e:
        return jsonify({"success": False, "message": f"⚠ Error de audio: {e}"})