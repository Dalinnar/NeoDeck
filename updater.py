# updater.py
import sys
import os
import json
import shutil
import zipfile
import tempfile
import subprocess
import urllib.request
from datetime import datetime

REPO_URL = "https://github.com/Dalinnar/NeoDeck"
PRESERVE_DIRS = {".config", "plugins"}


def log_file(base_dir):
    return os.path.join(base_dir, "updater.log")


def log(msg, base_dir, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] [{level}] {msg}"
    print(log_msg)
    
    try:
        with open(log_file(base_dir), "a", encoding="utf-8") as f:
            f.write(log_msg + "\n")
    except Exception as e:
        print(f"[ERROR] Could not write to log file: {e}")


def api():
    return "https://api.github.com/repos/Dalinnar/NeoDeck"


def req(url):
    return urllib.request.Request(
        url,
        headers={
            "User-Agent": "NeoDeck-Updater",
            "Accept": "application/vnd.github+json",
        },
    )


def get_release(base_dir):
    log("Fetching latest release from GitHub...", base_dir)
    try:
        with urllib.request.urlopen(req(api() + "/releases/latest")) as r:
            d = json.load(r)
        
        for a in d["assets"]:
            if a["name"].endswith(".zip"):
                version = d["tag_name"].lstrip("v")
                name = a["name"]
                # Use the browser_download_url — no auth needed for public repos
                download_url = a["browser_download_url"]
                log(f"Found release: v{version} (asset: {name})", base_dir)
                return version, download_url, name
        
        raise RuntimeError("No zip release found.")
    except Exception as e:
        log(f"Error fetching release: {e}", base_dir, "ERROR")
        raise


def extract(zip_path, base_dir):
    failed_files = []
    extracted_count = 0

    log(f"Starting extraction from {os.path.basename(zip_path)}...", base_dir)
    
    try:
        with zipfile.ZipFile(zip_path) as z:
            root = z.namelist()[0].split("/")[0] + "/"
            total_files = len([m for m in z.namelist() if not m.endswith("/")])
            log(f"Total files in archive: {total_files}", base_dir)
            
            for m in z.namelist():
                if m.endswith("/"):
                    continue
                rel = m[len(root):]
                if not rel:
                    continue
                if rel.split("/")[0] in PRESERVE_DIRS:
                    log(f"[SKIP] {rel} (preserved directory)", base_dir)
                    continue
                
                dst = os.path.join(base_dir, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                try:
                    with z.open(m) as s, open(dst, "wb") as d:
                        shutil.copyfileobj(s, d)
                    log(f"[EXTRACTED] {rel}", base_dir)
                    extracted_count += 1
                except PermissionError as e:
                    log(f"[PermissionError] Could not write: {dst} - {e}", base_dir, "ERROR")
                    failed_files.append(dst)
                except Exception as e:
                    log(f"[Error] Failed to extract {rel}: {e}", base_dir, "ERROR")
                    failed_files.append(dst)
        
        log(f"Extraction completed: {extracted_count} files extracted", base_dir)
        
    except Exception as e:
        log(f"Error during extraction: {e}", base_dir, "ERROR")
        raise

    if failed_files:
        log(f"Failed to extract {len(failed_files)} files", base_dir, "WARNING")
        failures_log = os.path.join(base_dir, "extract_failures.log")
        with open(failures_log, "w", encoding="utf-8") as f:
            for file in failed_files:
                f.write(file + "\n")
        log(f"Failed files list saved to: {failures_log}", base_dir, "WARNING")


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    log("=" * 60, base_dir)
    log("NeoDeck Updater Started", base_dir)
    log("=" * 60, base_dir)
    log(f"Base directory: {base_dir}", base_dir)

    try:
        version, download_url, name = get_release(base_dir)

        log(f"Downloading release asset ({name})...", base_dir)
        tmp = tempfile.mkdtemp()
        log(f"Created temp directory: {tmp}", base_dir)
        
        zip_path = os.path.join(tmp, name)

        try:
            # browser_download_url works directly with a plain request for public repos
            dl_req = urllib.request.Request(
                download_url,
                headers={"User-Agent": "NeoDeck-Updater"},
            )
            with urllib.request.urlopen(dl_req) as src, open(zip_path, "wb") as dst:
                shutil.copyfileobj(src, dst)
            log(f"Successfully downloaded: {name}", base_dir)
        except Exception as e:
            log(f"Error downloading release: {e}", base_dir, "ERROR")
            raise

        extract(zip_path, base_dir)
        
        log(f"Writing version file: {version}", base_dir)
        version_file = os.path.join(base_dir, "version.txt")
        with open(version_file, "w", encoding="utf-8") as f:
            f.write(version)
        log(f"Version updated to: {version}", base_dir)

        log(f"Cleaning up temp directory: {tmp}", base_dir)
        shutil.rmtree(tmp, ignore_errors=True)

        launcher_exe = os.path.join(base_dir, "NeodeckLauncher.exe")
        launcher_py = os.path.join(base_dir, "launcher.py")

        if os.path.exists(launcher_exe):
            log("Relaunching NeoDeck launcher (exe)...", base_dir)
            subprocess.Popen([launcher_exe])
            log("Launcher process started successfully", base_dir)
        elif os.path.exists(launcher_py):
            log("Relaunching NeoDeck launcher (python)...", base_dir)
            subprocess.Popen([sys.executable, launcher_py])
            log("Launcher process started successfully", base_dir)
        else:
            log("Error: NeodeckLauncher.exe or launcher.py not found!", base_dir, "ERROR")

        log("=" * 60, base_dir)
        log("Update completed successfully!", base_dir)
        log("=" * 60, base_dir)

    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {e}"
        log(error_msg, base_dir, "ERROR")
        log(traceback.format_exc(), base_dir, "ERROR")
        log("=" * 60, base_dir)
        log("Update FAILED!", base_dir, "ERROR")
        log("=" * 60, base_dir)
        sys.exit(1)


if __name__ == "__main__":
    main()