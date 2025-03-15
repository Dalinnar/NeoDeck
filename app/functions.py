import os
import json
from app.utils.working_dir import get_base_dir
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
