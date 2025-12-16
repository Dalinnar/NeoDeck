import os
import requests
from settings import get_settings

#get token if exists
token = get_settings()["neodeck"].get("token", "")

def download_github_item(path, destination):
    """Descarga un archivo o carpeta desde un repositorio de GitHub (privado o público)."""
    global token
    repo = get_settings()["neodeck"]["plugins_repo"]


    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    headers = {"Authorization": f"token {token}"} if token else {}

    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Error al obtener {path}: {response.json().get('message', 'Desconocido')}")
        return

    os.makedirs(destination, exist_ok=True)
    item = response.json()

    if isinstance(item, dict):  # Si es un archivo
        download_file(item, destination, headers)
    elif isinstance(item, list):  # Si es una carpeta
        for file in item:
            local_path = os.path.join(destination, file["path"])
            
            if file["type"] == "file":
                download_file(file, destination, headers)
            elif file["type"] == "dir":
                download_github_item(repo, file["path"], destination, token)

def download_file(file, destination, headers):
    """Descarga un archivo desde GitHub."""
    local_path = os.path.join(destination, file["path"])
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    print(f"Descargando {file['path']}...")
    file_response = requests.get(file["download_url"], headers=headers)

    if file_response.status_code == 200:
        with open(local_path, "wb") as f:
            f.write(file_response.content)
    else:
        print(f"Error descargando {file['path']}: {file_response.status_code}")

def get_github_file_content(path):
    global token
    repo = get_settings()["neodeck"]["plugins_repo"]
    url = f"https://raw.githubusercontent.com/{repo}/main/{path}"
    headers = {"Authorization": f"token {token}"} if token else {}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.text
    else:
        print(f"Error al obtener {path}: {response.status_code} - {response.text}")
        return None



