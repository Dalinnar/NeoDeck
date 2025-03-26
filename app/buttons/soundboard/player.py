try:
    import vlc
except ImportError:
    vlc = None

import nava
from flask import jsonify

from app.utils.settings.get_config import get_config
from app.utils.languages import text
from app.utils.logger import log

from .devices import get_device
from .ffmpeg import silence_path, to_wav

player_vbcable, player_local = {}, {}


def get_params(msg):
    """Extrae el archivo de sonido, volumen y configuraciones del mensaje."""
    msg = msg.replace("C:\\fakepath\\", "").replace("/playsound ", "").replace("/playlocalsound ", "")
    parts = msg.rsplit(" ", 1)

    try:
        sound_volume = float(parts[-1]) / 100
        sound_file = parts[0]
    except ValueError:
        sound_volume = 0.5  # Volumen por defecto (50%)
        sound_file = msg

    if not any(sub in sound_file for sub in [":", ".config/user_uploads/", ".config\\user_uploads\\"]):
        sound_file = f".config/user_uploads/{sound_file}"

    localonly = msg.startswith("/playlocalsound")
    ear_soundboard = get_config()["settings"]["ear_soundboard"] if not localonly else True

    return sound_file, sound_volume, ear_soundboard, localonly


def playsound(file_path: str, sound_volume=0.5, ear_soundboard=True, localonly=False):
    """Reproduce un sonido con el método configurado."""
    config = get_config()
    audio_method = config["settings"]["soundboard"]["audio_method"]

    if audio_method == "vlc" and vlc:
        return playsound_vlc(file_path, sound_volume, ear_soundboard, localonly)
    elif audio_method == "nava":
        return playsound_nava(file_path, sound_volume)
    
    return jsonify({"success": False, "error": "Método de audio no soportado"})


def playsound_nava(file_path: str, sound_volume=0.5):
    """Reproduce sonido con nava (sin control de volumen)."""
    file_path = to_wav(file_path, volume=sound_volume)
    nava.play(file_path, async_mode=True)
    return jsonify({"success": True})


def playsound_vlc(file_path: str, sound_volume=0.5, ear_soundboard=True, localonly=False):
    """Reproduce sonido con VLC, soportando VB-Cable y múltiples instancias."""
    global player_vbcable, player_local
    config = get_config()
    cable_device = get_device(config["settings"]["soundboard"]["vbcable"])

    if cable_device:
        if config["settings"]["fix_stop_soundboard"]:
            file_path = silence_path(file_path)
            if not file_path:
                log.error("FFmpeg no está instalado!")
                raise RuntimeError(text("ffmpeg_not_installed_error"))

        p_id = max(len(player_vbcable), len(player_local))
        target_players = player_local if localonly else player_vbcable

        if p_id > 3:
            target_players[0].stop()
            target_players[0].set_time(0)
            target_players[0].play()
        else:
            target_players[p_id] = vlc.MediaPlayer(file_path)
            target_players[p_id].audio_set_volume(int(sound_volume * 100))
            if not localonly:
                target_players[p_id].audio_output_device_set(None, cable_device)
            target_players[p_id].play()
            target_players[p_id].event_manager().event_attach(
                vlc.EventType.MediaPlayerEndReached, lambda _: remove_player(target_players, p_id)
            )

        log.success(f"Reproduciendo: {file_path} a volumen: {sound_volume * 100}%")
        return jsonify({"success": True})


def stopsound():
    """Detiene todos los sonidos en reproducción."""
    nava.stop_all()
    config = get_config()

    if not get_device(config["settings"]["soundboard"]["vbcable"]):
        return jsonify({"success": True, "message": "No hay sonidos en reproducción"})

    global player_vbcable, player_local

    for players in (player_vbcable, player_local):
        for p_id, player in players.items():
            player.stop()
            player.release()
        players.clear()

    log.success("Todos los sonidos detenidos")
    return jsonify({"success": True})


def remove_player(players, p_id):
    """Elimina un reproductor VLC finalizado."""
    players.pop(p_id, None)
