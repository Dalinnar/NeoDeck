from obswebsocket import requests as obsrequests
from app.utils.logger import log

def toggle(obs, source_name):
    source_name = source_name.lower().strip()
    scenes = obs.call(obsrequests.GetSceneList()).getScenes()

    for scene in scenes:
        scene_name = scene["sceneName"]
        scene_items = obs.call(obsrequests.GetSceneItemList(sceneName=scene_name)).getSceneItems()
        
        item = next((item for item in scene_items if item["sourceName"].lower().strip() == source_name), None)
        if item:
            current_visibility = item["sceneItemEnabled"]
            obs.call(obsrequests.SetSceneItemEnabled(
                sceneName=scene_name,
                sceneItemId=item["sceneItemId"],
                sceneItemEnabled=not current_visibility
            ))

            log.success(f"Toggled visibility of source '{source_name}' in scene '{scene_name}' to {'visible' if not current_visibility else 'hidden'}.")
            return
    log.warning(f"Source '{source_name}' not found in any scene.")
    raise ValueError(f"Source '{source_name}' not found in any scene.")