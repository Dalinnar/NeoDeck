from cx_Freeze import setup, Executable
import sys
import os

# GUI base: avoids showing a console
base = "Console"

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
        #".logs",
    ],
    "zip_include_packages": [],
    "zip_exclude_packages": ["*"],
    "include_msvcr": True,
}

executables = [
    Executable(
        script="launcher.py",
        base=base,
        target_name="WebDeckLauncher.exe",
        icon="static/icons/icon.ico",
    )
]

setup(
    name="WebDeckLauncher",
    version="0.1.0",
    description="WebDeck launcher using user Python",
    options={"build_exe": build_exe_options},
    executables=executables,
)
