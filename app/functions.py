import os
import json
from app.utils.working_dir import get_base_dir
from types import SimpleNamespace
#returns a list of the names of all the folders
def load_deck_folders(return_data=""):
    folder_list = []
    with open(os.path.join(get_base_dir(), ".config","pages.json"), "r") as f:
        data = json.load(f)
        for folder in data:
            folder_list.append(folder)
    return folder_list

def get_image_list():
    folders = [".config/user_uploads", "temp", "static/img"]
    image_list = []
    
    for folder in folders:
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp','.webp','.svg')):
                    # Normalizar la ruta para usar "/"
                    normalized_path = os.path.join(root, file).replace("\\", "/")
                    image_list.append(normalized_path)
    return image_list

def objetify(json_data):
    # Verifica si json_data es un diccionario
    if isinstance(json_data, dict):
        return SimpleNamespace(**json_data)
    
    # Si json_data es una cadena (o bytes), procesa el JSON
    return json.loads(json_data, object_hook=lambda d: SimpleNamespace(**d))

def jsonify(obj):
    return json.dumps(obj, default=lambda o: o.__dict__)

def deep_merge(original, updates):
    """Devuelve un nuevo diccionario con la combinación de original y updates sin modificar los originales, sin duplicados de clave y valor y evitando duplicados en listas."""

    merged = json.loads(json.dumps(original))  # Copia profunda con JSON

    for key, value in updates.items():
        if isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
            merged[key] = deep_merge(merged[key], value)  # Recursión para diccionarios anidados
        elif isinstance(value, list) and key in merged and isinstance(merged[key], list):
            # Actualizar las listas con los elementos de updates, eliminando duplicados
            merged[key] = list(dict.fromkeys(value))  # Concatenar y eliminar duplicados en updates
            # Eliminar elementos que estén en el original pero no en updates
            merged[key] = [item for item in merged[key] if item in value]
            # Eliminar elementos vacíos en la lista
            merged[key] = [item for item in merged[key] if item]
        else:
            # No agregar la clave si el valor está vacío o es nulo
            if value not in [None, "", {}]:  # Evitar agregar claves vacías o nulas
                merged[key] = value

    return merged