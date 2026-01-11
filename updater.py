#updater.py
import sys
import os
import json
import shutil
import zipfile
import tempfile
import subprocess
import urllib.request

REPO_URL = "https://github.com/Dalinnar/NeoDeck"
repo_key = "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"
PRESERVE_DIRS = {".config", "plugins"}

def api():
    return "https://api.github.com/repos/Dalinnar/NeoDeck"

def req(url):
    return urllib.request.Request(
        url,
        headers={
            "User-Agent": "NeoDeck-Updater",
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {repo_key}",
        },
    )

def get_release():
    with urllib.request.urlopen(req(api() + "/releases/latest")) as r:
        d = json.load(r)
    for a in d["assets"]:
        if a["name"].endswith(".zip"):
            return d["tag_name"].lstrip("v"), a["id"], a["name"]

def extract(zip_path, base_dir):
    failed_files = []

    with zipfile.ZipFile(zip_path) as z:
        root = z.namelist()[0].split("/")[0] + "/"
        for m in z.namelist():
            if m.endswith("/"):
                continue
            rel = m[len(root):]
            if not rel:
                continue
            if rel.split("/")[0] in PRESERVE_DIRS:
                continue
            dst = os.path.join(base_dir, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            try:
                with z.open(m) as s, open(dst, "wb") as d:
                    shutil.copyfileobj(s, d)
            except PermissionError:
                print(f"[PermissionError] No se pudo escribir: {dst}")
                failed_files.append(dst)

    if failed_files:
        log_path = os.path.join(base_dir, "extract_failures.log")
        with open(log_path, "w") as f:
            for file in failed_files:
                f.write(file + "\n")
        print(f"Archivos que no se pudieron copiar guardados en: {log_path}")

def main():
    base_dir = os.path.dirname(sys.executable)
    version, asset_id, name = get_release()

    tmp = tempfile.mkdtemp()
    zip_path = os.path.join(tmp, name)

    asset_url = f"{api()}/releases/assets/{asset_id}"
    r = req(asset_url)
    r.add_header("Accept", "application/octet-stream")

    with urllib.request.urlopen(r) as src, open(zip_path, "wb") as dst:
        shutil.copyfileobj(src, dst)

    extract(zip_path, base_dir)
    open(os.path.join(base_dir, "version.txt"), "w").write(version)

    shutil.rmtree(tmp, ignore_errors=True)

    subprocess.Popen([os.path.join(base_dir, "NeodeckLauncher.exe")])

if __name__ == "__main__":
    main()