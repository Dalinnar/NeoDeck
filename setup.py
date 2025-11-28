from cx_Freeze import setup, Executable
import sys
import os

# Two executables:
# - WebDeckLauncher.exe        (GUI, no console)
# - WebDeckLauncherConsole.exe (Console visible)

gui_base = "Win32GUI"
console_base = None  # console-enabled executable

build_exe_options = {
    "excludes": [
        "tkinter", "unittest", "email", "http", "xml", "distutils", "setuptools", "pkg_resources"
    ],
    "include_files": [
        "satisfied_installs.txt",
        "requirements.txt",
        "run.py",
        "launcher.py",
        "plugins",
        ".temp",
        ".config",
        "static",
        "app",
        "settings.py",
        "webdeck",
        "templates",
    ],
    "zip_include_packages": [],
    "zip_exclude_packages": ["*"],
    "include_msvcr": True,
}

executables = [
    Executable(
        script="launcher.py",
        base=gui_base,
        target_name="WebDeckLauncher.exe",
        icon="static/icons/icon.ico",
    ),
    Executable(
        script="launcher.py",
        base=console_base,
        target_name="WebDeckLauncherConsole.exe",
        icon="static/icons/icon.ico",
    ),
]

setup(
    name="WebDeckLauncher",
    version="0.1.0",
    description="WebDeck launcher using user Python",
    options={"build_exe": build_exe_options},
    executables=executables,
)
