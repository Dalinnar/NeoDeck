# Getting Started

Welcome to the NeoDeck plugin development guide.

NeoDeck is a customizable macro platform inspired by Stream Deck.  
The frontend runs on your phone as a web app, while the backend runs on your PC using Flask.  
Plugins allow developers to extend NeoDeck with custom commands, routes, monitors, buttons, integrations, and more.

This guide will help you create your first plugin.

---

# How Plugins Work

NeoDeck loads plugins dynamically during startup.

Each plugin is loaded as a Flask Blueprint and can register:

- Commands
- Routes
- Monitors
- Getters
- Settings
- Assets
- Buttons
- Language files

Plugins are distributed as `.deck` packages or loaded directly from folders in development mode.

---

# Plugin Folder Structure

A minimal plugin looks like this:

```txt
my_plugin/
│
├── __init__.py
├── functions.py
├── routes.py
├── requirements.txt
│
├── assets/
│   └── icon.jpg
│
├── languages/
│   └── en.lang
│
└── buttons.json
````

* * *

# Creating Your First Plugin

Create a new folder inside the `plugins/` directory.

Example:

```
plugins/my_plugin/
```

Inside it, create an `__init__.py` file.

* * *

# Basic Plugin Example

```Python
from flask import Blueprint

plugin_name = "my_plugin"
plugin_version = "1.0.0"

plugin = Blueprint(plugin_name, __name__)

plugin.metadata = {
    "name": plugin_name,
    "version": plugin_version,
    "creators": ["Your Name"],
    "description": "My first NeoDeck plugin",
    "icon": "assets/icon.jpg"
}

plugin.command_map = {}

plugin.monitors = {}

def init():
    print("Plugin initialized")

plugin.init = init
```

* * *

# Required Variables

Every plugin should define:

| Variable | Description |
| --- | --- |
| `plugin_name` | Unique plugin identifier |
| `plugin_version` | Current plugin version |
| `plugin` | Flask Blueprint instance |
| `plugin.metadata` | Plugin metadata |

* * *

# Metadata

NeoDeck uses metadata to display plugin information inside the application.

Example:

```Python
plugin.metadata = {
    "name": "my_plugin",
    "version": "1.0.0",
    "creators": ["Your Name"],
    "description": "Example plugin",
    "icon": "assets/icon.jpg"
}
```

* * *

# Development Mode

NeoDeck supports loading plugins directly from folders.

Enable:

```JSON
{
  "neodeck": {
    "use_root_plugins": true
  }
}
```

When enabled, NeoDeck loads plugin folders directly instead of `.deck` packages.

This is recommended during development.

* * *

# Requirements

If your plugin needs external Python packages, add a `requirements.txt` file.

Example:

```
requests
psutil
```

NeoDeck automatically installs dependencies when the plugin is loaded.

* * *

# Plugin Initialization

Plugins may define an optional `init()` function.

```Python
def init():
    print("Plugin loaded")
```

NeoDeck will call this function after loading the plugin.

* * *

# Loading Process

During startup NeoDeck will:

1. Scan the `plugins/` directory
2. Load `.deck` packages or folders
3. Install dependencies
4. Register blueprints
5. Register commands, monitors, getters, and settings
6. Load buttons and assets

* * *