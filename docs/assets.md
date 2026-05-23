# assets.md

## Assets System

NeoDeck plugins can include custom assets such as:

* images
* icons
* frontend scripts
* helper files
* language files

During plugin loading, NeoDeck automatically copies and remaps these assets into the temporary runtime directory.

* * *

# Supported Asset Folders

## assets/

Used for static files such as:

* png
* jpg
* svg
* gif
* json
* css
* fonts
* audio
* etc

Example:

```
my_plugin/
├── assets/
│   ├── logo.png
│   ├── background.jpg
│   └── icons/
│       └── play.png
```

* * *

## scripts/

Primarily used for frontend JavaScript files loaded by the NeoDeck web interface.

Typical usage:

* custom UI logic
* button interactions
* frontend helpers
* websocket handlers
* dialogs
* dynamic components

Example:

```
my_plugin/
├── scripts/
│   ├── ui.js
│   ├── websocket.js
│   └── dialog.js
```

Currently, NeoDeck automatically detects `.js` files from the temp directory:

```Python
def get_temp_scripts():
    scripts = []
    for root, dirs, files in os.walk(os.path.join(get_base_dir(), ".temp")):
        for file in files:
            if file.endswith(".js"):
                scripts.append(file)
    return scripts
```

Other script types may also be stored in this folder for plugin usage, such as:

* py
* bat
* ps1
* sh
* json

but they are not automatically injected into the frontend.

* * *

# Asset Copying

When a plugin loads:

1. NeoDeck scans:
    * `assets/`
    * `scripts/`
2. Every file is copied into:

```
.temp/
```

3. File names are automatically namespaced using the plugin name.

Example:

```
scripts/ui/dialog.js
```

becomes:

```
.temp/myplugin__ui__dialog.js
```

This prevents conflicts between plugins.

* * *

# Automatic Image Remapping

If a plugin contains a `buttons.json`, NeoDeck automatically rewrites image paths.

Example input:

```JSON
{
  "style": {
    "image": "icons/play.png"
  }
}
```

Automatically becomes:

```JSON
{
  "style": {
    "image": "/temp/myplugin__icons__play.png"
  }
}
```

You do not need to manually rewrite paths.

* * *

# Runtime Asset URLs

Copied assets become available through:

```
/temp/<generated_name>
```

Example:

```
/temp/myplugin__logo.png
```

* * *

# Folder Example

```
my_plugin/
├── __init__.py
├── buttons.json
├── assets/
│   ├── logo.png
│   └── icons/
│       └── play.png
├── scripts/
│   ├── ui.js
│   └── helper.py
└── languages/
    └── en.lang
```

* * *

# Language Assets

Language files must be inside:

```
languages/
```

Supported format:

```
en.lang
es.lang
fr.lang
```

Example:

```
hello=Hello
bye=Goodbye
```

NeoDeck merges all plugin language files automatically at runtime.

* * *

# Notes

* Asset names are automatically isolated per plugin
* Original folder structure is preserved internally
* Assets are re-copied every startup
* Plugins should always reference local relative asset paths
* Absolute paths should not be used

* * *

# Best Practices

## Recommended Structure

```
assets/icons/
assets/images/
assets/backgrounds/
scripts/
languages/
```

* * *

## Keep Assets Organized

Large plugins should separate:

* icons
* previews
* UI textures
* scripts

instead of putting everything in one folder.

* * *

# Example buttons.json

```JSON
{
  "media": {
    "play_button": {
      "text": "Play",
      "style": {
        "image": "icons/play.png"
      }
    }
  }
}
```

NeoDeck handles the remapping automatically.