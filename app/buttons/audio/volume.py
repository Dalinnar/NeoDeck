from comtypes import CoInitializeEx, CoUninitialize, COINIT_MULTITHREADED
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from flask import jsonify

class VolumeManager:
    """Singleton volume manager to handle COM objects properly"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VolumeManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.volume_interface = None
            self.audio_interface = None
            self._initialized = True
    
    def _ensure_initialized(self):
        """Initialize COM and audio interfaces if not already done"""
        if self.volume_interface is None:
            try:
                CoInitializeEx(COINIT_MULTITHREADED)
            except OSError as e:
                if e.winerror != -2147417850:  # Not RPC_E_CHANGED_MODE
                    raise
            
            devices = AudioUtilities.GetSpeakers()
            self.audio_interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            self.volume_interface = cast(self.audio_interface, POINTER(IAudioEndpointVolume))
    
    def get_volume(self):
        """Get current volume level"""
        self._ensure_initialized()
        return int(self.volume_interface.GetMasterVolumeLevelScalar() * 100)
    
    def set_volume_level(self, level):
        """Set volume level (0-100)"""
        self._ensure_initialized()
        level = max(0, min(100, level))
        volume_level = level / 100.0
        
        if self.volume_interface.GetMute():
            self.volume_interface.SetMute(0, None)
        self.volume_interface.SetMasterVolumeLevelScalar(volume_level, None)
        return level
    
    def cleanup(self):
        """Clean up COM objects"""
        if self.volume_interface is not None:
            try:
                self.volume_interface.Release()
            except:
                pass
            self.volume_interface = None
        
        if self.audio_interface is not None:
            try:
                self.audio_interface.Release()
            except:
                pass
            self.audio_interface = None
        
        try:
            CoUninitialize()
        except:
            pass

# Global volume manager instance
volume_manager = VolumeManager()

def set_volume(message):
    """Volume control function using VolumeManager"""
    try:
        if message.endswith("get"):
            current_volume = volume_manager.get_volume()
            return jsonify({"data": current_volume})
        
        parts = message.split()
        if len(parts) >= 2:
            value = int(parts[1])
            set_level = volume_manager.set_volume_level(value)
            return jsonify({"success": True, "set_to": set_level})
        else:
            return jsonify({"success": False, "message": "Formato incorrecto. Usa '!volume 50'"})
            
    except (IndexError, ValueError):
        return jsonify({"success": False, "message": "⚠ Error: Usa el formato '!volume 50'"})
    except Exception as e:
        return jsonify({"success": False, "message": f"⚠ Error de audio: {e}"})

# Optional: Add this to your Flask app for proper cleanup on shutdown
import atexit
atexit.register(volume_manager.cleanup)