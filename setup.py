#setup.py
from cx_Freeze import setup, Executable

gui_base = "Win32GUI"
console_base = None

build_exe_options = {
    "excludes": [
        "unittest", "xml", "distutils", "setuptools", "pkg_resources"
    ],
    "include_files": [
        "satisfied_installs.txt",
        "requirements.txt",
        "run.py",
        "plugins",
        ".temp",
        "static",
        "app",
        "settings.py",
        "neodeck",
        "version.txt",
        "templates",
    ],
    "zip_include_packages": [],
    "zip_exclude_packages": ["*"],
    "optimize": 2,
    "include_msvcr": True,
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
    Executable(
        script="updater.py",
        base="Console",
        target_name="NeodeckUpdater.exe",
    ),
]

setup(
    name="NeodeckLauncher",
    version="0.1.0",
    description="Neodeck launcher",
    options={"build_exe": build_exe_options},
    executables=executables,
)