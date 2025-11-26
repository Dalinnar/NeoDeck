import os
import json
from app.utils.working_dir import get_base_dir
from types import SimpleNamespace
#returns a list of the names of all the folders
def load_deck_folders():
    folder_list = []
    with open(os.path.join(get_base_dir(), ".config","pages.json"), "r") as f:
        data = json.load(f)
        for folder in data:
            folder_list.append(folder)
    return folder_list

def get_image_list():
    folders = [".config/user_uploads", ".temp", "static/img"]
    image_list = []
    for folder in folders:
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp','.webp','.svg')):
                    
                    normalized_path = os.path.join(root, file).replace("\\", "/")
                    image_list.append(normalized_path)
    return image_list

def objetify(json_data):
    if isinstance(json_data, dict):
        return SimpleNamespace(**json_data)
    return json.loads(json_data, object_hook=lambda d: SimpleNamespace(**d))


def to_json(obj):
    return json.dumps(obj, default=lambda o: o.__dict__)

def clean_key(key, prefixes):
    if isinstance(key, str):
        for prefix in prefixes:
            if key.startswith(prefix):
                return None if prefix == "#" else key[len(prefix):]
    return key

def clean_dict(d, prefixes):
    result = {}
    for key, value in d.items():
        new_key = clean_key(key, prefixes)
        if new_key is None:
            continue
        if isinstance(value, dict):
            value = clean_dict(value, prefixes)
            if not value:
                continue
        result[new_key] = value
    return result

def deep_merge(defaults, saved, prefixes=["#", "_"]):
    defaults = clean_dict(defaults, prefixes)
    saved = clean_dict(saved, prefixes)

    merged = {}
    for key in set(defaults) | set(saved):
        if isinstance(defaults.get(key), dict) and isinstance(saved.get(key), dict):
            merged[key] = deep_merge(defaults[key], saved[key], prefixes)
        else:
            merged[key] = saved.get(key, defaults.get(key))
    return merged

def get_temp_scripts():
    scripts = []
    for root, dirs, files in os.walk(os.path.join(get_base_dir(), ".temp")):
        for file in files:
            if file.endswith(".js"):
                scripts.append(file)
    return scripts


def replace_double_quotes(obj):
    if isinstance(obj, dict):
        return {k: replace_double_quotes(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_double_quotes(item) for item in obj]
    elif isinstance(obj, str):
        #also replace line jumps
        return obj.replace('"', "'").replace("\n", "")
    else:
        return obj