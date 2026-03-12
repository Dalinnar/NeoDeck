@echo off
setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

REM Create a temporary directory for the update process
set "TEMP_UPDATE=%TEMP%\neodeck_update_%RANDOM%"
mkdir "%TEMP_UPDATE%"

REM Python script content embedded as a here-string
set "PYTHON_SCRIPT=%TEMP_UPDATE%\update_script.py"

(
echo import sys
echo import os
echo import json
echo import shutil
echo import zipfile
echo import tempfile
echo import subprocess
echo import urllib.request
echo.
echo REPO_URL = "https://github.com/Dalinnar/NeoDeck"
echo repo_key = "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"
echo PRESERVE_DIRS = {".config", "plugins"}
echo.
echo def api():
echo     return "https://api.github.com/repos/Dalinnar/NeoDeck"
echo.
echo def req(url):
echo     return urllib.request.Request(
echo         url,
echo         headers={
echo             "User-Agent": "NeoDeck-Updater",
echo             "Accept": "application/vnd.github+json",
echo             "Authorization": f"Bearer {repo_key}",
echo         },
echo     )
echo.
echo def get_release():
echo     with urllib.request.urlopen(req(api() + "/releases/latest")) as r:
echo         d = json.load(r)
echo     for a in d["assets"]:
echo         if a["name"].endswith(".zip"):
echo             return d["tag_name"].lstrip("v"), a["id"], a["name"]
echo.
echo def extract(zip_path, base_dir):
echo     failed_files = []
echo.
echo     with zipfile.ZipFile(zip_path) as z:
echo         root = z.namelist()[0].split("/")[0] + "/"
echo         for m in z.namelist():
echo             if m.endswith("/"):
echo                 continue
echo             rel = m[len(root):]
echo             if not rel:
echo                 continue
echo             if rel.split("/")[0] in PRESERVE_DIRS:
echo                 continue
echo             dst = os.path.join(base_dir, rel)
echo             os.makedirs(os.path.dirname(dst), exist_ok=True)
echo             try:
echo                 with z.open(m) as s, open(dst, "wb") as d:
echo                     shutil.copyfileobj(s, d)
echo             except PermissionError:
echo                 print(f"[PermissionError] No se pudo escribir: {dst}")
echo                 failed_files.append(dst)
echo.
echo     if failed_files:
echo         log_path = os.path.join(base_dir, "extract_failures.log")
echo         with open(log_path, "w") as f:
echo             for file in failed_files:
echo                 f.write(file + "\n")
echo         print(f"Archivos que no se pudieron copiar guardados en: {log_path}")
echo.
echo def main():
echo     base_dir = r"%BASE_DIR:~0,-1%"
echo     print("Starting update...")
echo     try:
echo         version, asset_id, name = get_release()
echo         print(f"Downloading version {version}...")
echo.
echo         tmp = tempfile.mkdtemp()
echo         zip_path = os.path.join(tmp, name)
echo.
echo         asset_url = f"{api()}/releases/assets/{asset_id}"
echo         r = req(asset_url)
echo         r.add_header("Accept", "application/octet-stream")
echo.
echo         with urllib.request.urlopen(r) as src, open(zip_path, "wb") as dst:
echo             shutil.copyfileobj(src, dst)
echo.
echo         print("Extracting files...")
echo         extract(zip_path, base_dir)
echo         open(os.path.join(base_dir, "version.txt"), "w").write(version)
echo.
echo         shutil.rmtree(tmp, ignore_errors=True)
echo         print("Update completed successfully!")
echo.
echo     except Exception as e:
echo         print(f"Error during update: {e}")
echo         import traceback
echo         traceback.print_exc()
echo.
echo if __name__ == "__main__":
echo     main()
) > "%PYTHON_SCRIPT%"

REM Find Python
set "PYTHON_CMD="
for %%i in (py python python3) do (
    where %%i >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=%%i"
        goto :python_found
    )
)

:python_found
if "!PYTHON_CMD!"=="" (
    echo Error: Python not found on system
    pause
    exit /b 1
)

REM Run the update script
echo Executing update...
!PYTHON_CMD! "%PYTHON_SCRIPT%"
set "UPDATE_RESULT=%errorlevel%"

REM Clean up
rmdir /s /q "%TEMP_UPDATE%" 2>nul

REM Relaunch the launcher
if !UPDATE_RESULT! equ 0 (
    echo Update finished, relaunching launcher...
    timeout /t 2 /nobreak
    start "" "%BASE_DIR%NeodeckLauncher.exe"
) else (
    echo Update failed with error code !UPDATE_RESULT!
    pause
)

exit /b !UPDATE_RESULT!