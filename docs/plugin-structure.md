# Plugin Structure

NeoDeck plugins follow a modular structure designed to keep features organized and easy to maintain.

This page explains the recommended plugin layout and what each file or folder is used for.

---

# Standard Structure

```txt
my_plugin/
│
├── __init__.py
├── functions.py
├── routes.py
├── requirements.txt
├── buttons.json
│
├── assets/
│   ├── icon.jpg
│   └── example.png
│
├── scripts/
│   └── helper.js
│
└── languages/
    ├── en.lang
    └── es.lang
````

* * *

# Root Files

## `__init__.py`

Main plugin entrypoint.

NeoDeck searches for this file when loading plugins.

This file usually contains:

* Metadata
* Flask Blueprint
* Command registration
* Monitor registration
* Settings
* Routes
* Initialization logic

Example:

```Python
from flask import Blueprint

plugin_name = "my_plugin"
plugin_version = "1.0.0"

plugin = Blueprint(plugin_name, __name__)
```

* * *

## `functions.py`

Contains reusable plugin logic.

Usually used for:

* Command functions
* Utility functions
* External API communication
* Shared logic

Example:

```Python
def say_hello():
    print("Hello from NeoDeck")
```

* * *

## `routes.py`

Contains Flask routes used by the plugin.

Example:

```Python
from flask import jsonify

def status():
    return jsonify({
        "status": "ok"
    })
```

Routes are registered inside `__init__.py`.

Example:

```Python
plugin.add_url_rule(
    "/plugin/status",
    view_func=status
)
```

* * *

## `requirements.txt`

Optional dependency list.

NeoDeck automatically installs dependencies during plugin loading.

Example:

```
requests
psutil
```

* * *

## `buttons.json`

Defines buttons added by the plugin.

NeoDeck automatically loads and merges this file into the global button registry.

Example:

```JSON
{
  "my_plugin": {
    "hello_button": {
      "label": "Hello",
      "command": "/hello"
    }
  }
}
```

Button styling and advanced options are covered in `buttons.md`.

* * *

# Assets Folder

```
assets/
```

Used for static plugin resources.

Examples:

* Icons
* Images
* Audio files
* CSS
* HTML
* Fonts

NeoDeck automatically copies assets into the temporary asset directory during plugin loading.

Example usage:

```Python
plugin.metadata = {
    "icon": "assets/icon.jpg"
}
```

* * *

# Scripts Folder

```
scripts/
```

Optional folder for helper scripts or frontend-related files.

NeoDeck copies this folder into the temporary plugin asset directory.

Common uses:

* JavaScript helpers
* Batch scripts
* PowerShell scripts
* Shell scripts

* * *

# Languages Folder

```
languages/
```

Contains translation files.

Each file uses the `.lang` format.

Example:

```
hello=Hello
goodbye=Goodbye
```

Supported example:

```
languages/
├── en.lang
├── es.lang
└── fr.lang
```

NeoDeck merges all plugin language files into the global translation system.

Language handling is covered in `languages.md`.

* * *

# Optional Files

Plugins are not required to include every file or folder.

Minimal plugin:

```
my_plugin/
└── __init__.py
```

More advanced plugins may include:

* Assets
* Settings
* Routes
* Buttons
* Localization
* External dependencies

* * *

# Development Recommendations

Recommended practices:

* Keep routes separated from logic
* Store reusable code inside `functions.py`
* Keep assets organized
* Use clear plugin names
* Avoid global state when possible

Additional recommendations are covered in `best-practices.md`.

* * *