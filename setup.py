import os
import sys
import zipfile
from cx_Freeze import setup, Executable

gui_base = "Win32GUI"
console_base = None

build_exe_options = {
    "excludes": [
        "unittest", "test", "pydoc", "doctest",
        "distutils", "setuptools", "pkg_resources",
        "email", "mailbox", "imaplib", "poplib", "smtplib",
        "ftplib", "socketserver",
        "sqlite3", "dbm", "pickle", "shelve",
        "xml", "html", "csv",
        "asyncio", "concurrent",
        "turtle", "curses", "pty", "tty",
        "multiprocessing", "queue",
        "mimetypes", "uu",
        "ensurepip", "venv", "zipimport",
    ],
    "include_files": [
        "requirements.txt",
        "run.py",
        "static",
        "app",
        "settings.py",
        "updater.py",
        "neodeck",
        "version.txt",
        "templates",
    ],
    "zip_include_packages": [],
    "zip_exclude_packages": ["*"],
    "optimize": 2,
    "include_msvcr": True,
    "build_exe": "build/NeodeckLauncher",
}

executables = [
    Executable(
        script="launcher.py",
        base=gui_base,
        target_name="NeodeckLauncher.exe",
        icon="static/icons/icon.ico",
    ),
    Executable(
        script="launcher.py",
        base=console_base,
        target_name="NeodeckLauncherConsole.exe",
        icon="static/icons/icon.ico",
    ),
]


def zip_build():
    build_dir = "build/NeodeckLauncher"
    zip_path = "build/NeodeckLauncher.zip"

    if not os.path.exists(build_dir):
        print("Build directory not found, skipping zip.")
        sys.exit(1)

    print(f"Zipping {build_dir} -> {zip_path} ...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                abs_path = os.path.join(root, file)
                arcname = os.path.relpath(abs_path, "build")
                zf.write(abs_path, arcname)

    print(f"Created: {zip_path}")


if __name__ == "__main__":
    setup(
        name="NeodeckLauncher",
        version="0.1.0",
        description="Neodeck launcher",
        options={"build_exe": build_exe_options},
        executables=executables,
    )

    if "build_exe" in sys.argv:
        zip_build()