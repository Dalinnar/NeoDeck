from comtypes import CLSCTX_ALL, CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from ctypes import cast, POINTER
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

class VolumeManager:
    """Singleton volume manager compatible with Windows 11"""
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
            self._current_device_id = None
            self._initialized = True
    
    def _ensure_initialized(self):
        """Initialize COM and audio interfaces - Windows 11 compatible"""
        try:
            # Windows 11 Fix: Use COINIT_APARTMENTTHREADED instead of MULTITHREADED
            # This is more stable with audio APIs across Windows versions
            try:
                CoInitializeEx(COINIT_APARTMENTTHREADED)
            except OSError as e:
                # Handle case where COM is already initialized
                if e.winerror != -2147417850:  # Not RPC_E_CHANGED_MODE
                    logger.debug(f"COM already initialized: {e}")
                else:
                    raise
        except Exception as e:
            logger.warning(f"COM initialization warning: {e}")
        
        try:
            # Windows 11 Fix: Handle device enumeration more robustly
            devices = AudioUtilities.GetSpeakers()
            if devices is None:
                raise Exception("No audio devices found")
            
            device_id = devices.GetId()
            
            # Cleanup if device changed
            if self.volume_interface is None or device_id != self._current_device_id:
                self.cleanup(silent=True)
                
                # Windows 11 Fix: Add error handling for device activation
                try:
                    self.audio_interface = devices.Activate(
                        IAudioEndpointVolume._iid_, 
                        CLSCTX_ALL, 
                        None
                    )
                    if self.audio_interface is None:
                        raise Exception("Failed to activate audio interface")
                    
                    self.volume_interface = cast(
                        self.audio_interface, 
                        POINTER(IAudioEndpointVolume)
                    )
                    self._current_device_id = device_id
                    logger.debug("Audio interface activated successfully")
                    
                except Exception as e:
                    logger.error(f"Error activating audio interface: {e}")
                    self.cleanup(silent=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Error in _ensure_initialized: {e}")
            self.cleanup(silent=True)
            raise
    
    def get_volume(self):
        """Get current volume level (0-100)"""
        try:
            self._ensure_initialized()
            if self.volume_interface is None:
                raise Exception("Volume interface not initialized")
            volume_scalar = self.volume_interface.GetMasterVolumeLevelScalar()
            return int(volume_scalar * 100)
        except Exception as e:
            logger.error(f"Error getting volume: {e}")
            return 0
    
    def get_mute(self):
        """Return True if muted, False otherwise"""
        try:
            self._ensure_initialized()
            if self.volume_interface is None:
                raise Exception("Volume interface not initialized")
            return bool(self.volume_interface.GetMute())
        except Exception as e:
            logger.error(f"Error getting mute state: {e}")
            return False
    
    def set_volume_level(self, level):
        """Set volume level (0-100)"""
        try:
            self._ensure_initialized()
            if self.volume_interface is None:
                raise Exception("Volume interface not initialized")
            
            level = max(0, min(100, level))
            volume_level = level / 100.0
            
            # Unmute if volume is being set
            try:
                if self.volume_interface.GetMute():
                    self.volume_interface.SetMute(0, None)
            except:
                pass
            
            self.volume_interface.SetMasterVolumeLevelScalar(volume_level, None)
            logger.debug(f"Volume set to {level}%")
            return level
        except Exception as e:
            logger.error(f"Error setting volume: {e}")
            raise
    
    def cleanup(self, silent=False):
        """Clean up COM objects safely"""
        try:
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
                
            logger.debug("COM cleanup completed")
        except Exception as e:
            if not silent:
                logger.error(f"Error during cleanup: {e}")


# Global volume manager instance
volume_manager = VolumeManager()


def get_mute():
    """Get current mute state"""
    try:
        muted = volume_manager.get_mute()
        return jsonify({"data": muted})
    except Exception as e:
        logger.error(f"Error in get_mute endpoint: {e}")
        return jsonify({"success": False, "message": f"Error getting mute state: {e}"})


def get_volume():
    """Get current volume level"""
    try:
        vol = volume_manager.get_volume()
        return jsonify({"data": vol})
    except Exception as e:
        logger.error(f"Error in get_volume endpoint: {e}")
        return jsonify({"success": False, "message": f"Error getting volume: {e}"})


def set_volume(message):
    """Volume control function using VolumeManager"""
    try:
        parts = message.split()
        if len(parts) >= 2:
            try:
                value = int(parts[1])
                set_level = volume_manager.set_volume_level(value)
                return jsonify({"success": True, "set_to": set_level})
            except ValueError:
                return jsonify({"success": False, "message": "Valor inválido. Usa '!volume 50'"})
        else:
            return jsonify({"success": False, "message": "Formato incorrecto. Usa '!volume 50'"})
            
    except Exception as e:
        logger.error(f"Error in set_volume endpoint: {e}")
        return jsonify({"success": False, "message": f"⚠ Error de audio: {e}"})


# Cleanup on shutdown
import atexit
atexit.register(volume_manager.cleanup)