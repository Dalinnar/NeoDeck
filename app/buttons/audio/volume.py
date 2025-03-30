from comtypes import CLSCTX_ALL
import comtypes
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume, ISimpleAudioVolume




def set_volume(message):
    try:
        # Inicializar COM
        comtypes.CoInitialize()
        
        # Obtener el valor del volumen desde el mensaje
        delta = int(message.split(" ")[1])  

        # Asegurar que el valor esté entre 1 y 100
        delta = max(0, min(100, delta))

        # Convertir a rango de 0.01 - 1.0
        volume_level = delta / 100  

        # Obtener el dispositivo de audio predeterminado (altavoces)
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(
            IAudioEndpointVolume._iid_, CLSCTX_ALL, None
        )
        volume = interface.QueryInterface(IAudioEndpointVolume)
        volume.SetMasterVolumeLevelScalar(volume_level, None)        

    except (IndexError, ValueError):
        print("⚠ Error: Usa el formato 'set 50' (donde 50 es el porcentaje)")
    finally:
        # Liberar COM al finalizar
        comtypes.CoUninitialize()