# Loading Process

NeoDeck loads plugins dynamically during application startup.

This document explains how plugins are discovered, extracted, initialized, and registered internally.

Understanding the loading process is useful for:

* debugging plugins
* understanding runtime behavior
* asset handling
* dependency installation
* plugin updates
* advanced plugin development

* * *

# Plugin Discovery

NeoDeck scans the `plugins/` directory during startup.

Depending on the current configuration, plugins may be loaded from:

* `.deck` packages
* raw plugin folders (development mode)

Example:

```
plugins/
├── spotify.deck
├── obs.deck
└── my_plugin/
```

* * *

# Development Mode

NeoDeck supports loading plugins directly from folders.

Enable it inside settings:

```JSON
{
  "neodeck": {
    "use_root_plugins": true
  }
}
```

When enabled:

* folders are loaded directly
* `.deck` extraction is skipped
* requirements are not auto-installed repeatedly
* plugin iteration becomes much faster

Recommended during plugin development.

* * *

# `.deck` Packages

A `.deck` file is a ZIP-based plugin package.

During startup NeoDeck:

1. finds the `.deck`
2. extracts it into a temporary directory
3. scans the extracted files
4. loads the plugin dynamically

Internal extraction example:

```Python
extract_deck(deck_path)
```

Plugins are never executed directly from the `.deck` archive.

* * *

# Temporary Extraction

Extracted plugins are unpacked into temporary folders using Python's `tempfile` system.

Example:

```
C:/Users/User/AppData/Local/Temp/deck_xxxxx/
```

This extracted directory becomes the plugin runtime root.

* * *

# Plugin Detection

After extraction, NeoDeck recursively scans the plugin contents.

The loader searches for:

| File / Folder | Purpose |
| --- | --- |
| `__init__.py` | Plugin entrypoint |
| `requirements.txt` | Python dependencies |
| `buttons.json` | Button definitions |
| `languages/` | Translation files |
| `assets/` | Images and static files |
| `scripts/` | Frontend JavaScript |
| `.disabled` folders | Ignored completely |

Internal loader logic:

```Python
_find_plugin_files(temp_root)
```

* * *

# Python Module Loading

NeoDeck dynamically imports plugins using `importlib`.

Internal flow:

```Python
spec = importlib.util.spec_from_file_location(...)
plugin_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plugin_module)
```

Each plugin receives its own isolated module namespace.

Example generated module name:

```
spotify___init__
```

This helps prevent collisions between plugins.

* * *

# Blueprint Registration

NeoDeck plugins are Flask Blueprints.

If the module exposes a `plugin` variable:

```Python
plugin = Blueprint(plugin_name, __name__)
```

NeoDeck automatically registers it:

```Python
app.register_blueprint(plugin_module.plugin)
```

This enables:

* routes
* APIs
* backend handlers
* frontend communication

* * *

# Version Detection

NeoDeck extracts plugin versions directly from `__init__.py`.

Internal pattern:

```Python
plugin_version = "1.0.0"
```

Used for:

* dependency caching
* updates
* plugin manifests
* rollback support

Internal helper:

```Python
read_plugin_version(init_path)
```

* * *

# Dependency Installation

If a plugin contains:

```
requirements.txt
```

NeoDeck automatically installs dependencies using pip.

Internal flow:

```Python
python -m pip install -r requirements.txt
```

Requirements are installed using the same Python interpreter running NeoDeck.

* * *

# Dependency Cache

NeoDeck tracks installed plugin dependency versions using:

```
satisfied_installs.txt
```

Example:

```
spotify==1.2.0
obs_plugin==2.0.1
```

If the installed version matches the plugin version:

* requirements installation is skipped
* startup becomes faster

This prevents reinstalling dependencies every launch.

* * *

# Runtime Registration

After loading the plugin Blueprint, NeoDeck checks for additional plugin systems.

Supported runtime extensions:

| Property | Purpose |
| --- | --- |
| `plugin.command_map` | Custom commands |
| `plugin.monitors` | Real-time monitors |
| `plugin.getters` | Dynamic value providers |
| `plugin.settings` | Settings schema |

Example:

```Python
plugin.command_map = {
    "hello_world": hello_world
}
```

These systems are merged into NeoDeck's global registries.

* * *

# Button Loading

NeoDeck scans for:

```
buttons.json
```

Button definitions are merged into the global button system.

Internal process:

```Python
_process_buttons_json(...)
```

Buttons may reference:

* commands
* assets
* styles
* monitors
* getters

* * *

# Asset Loading

NeoDeck automatically copies plugin assets into the runtime temp directory.

Supported asset folders:

```
assets/
scripts/
```

Assets are renamed automatically to prevent conflicts.

Example:

```
my_plugin__icon.png
```

or:

```
my_plugin__assets__images__logo.png
```

This guarantees plugin asset isolation.

* * *

# Runtime Asset URLs

After remapping, assets become accessible through:

```
/temp/<generated_name>
```

Example:

```
/temp/my_plugin__icon.png
```

Button images are automatically rewritten during loading.

Original:

```JSON
{
  "image": "assets/icon.png"
}
```

Runtime result:

```JSON
{
  "image": "/temp/my_plugin__icon.png"
}
```

* * *

# Frontend Script Loading

JavaScript files inside:

```
scripts/
```

are copied into `.temp`.

NeoDeck injects these scripts dynamically into the frontend.

This allows plugins to extend:

* UI behavior
* frontend APIs
* websocket handlers
* custom interfaces

* * *

# Language Loading

NeoDeck supports plugin translation files.

Language folders:

```
languages/
```

Supported format:

```
en_US.lang
es_ES.lang
```

Translation files are merged at runtime.

* * *

# Language Merge Order

NeoDeck merges translations in this order:

1. Base `en_US`
2. Plugin `en_US`
3. Selected language
4. Plugin selected language
5. Temporary overrides

This guarantees fallback safety.

If a translation key is missing:

```
the_key_name
```

is returned directly.

* * *

# Plugin Initialization Order

Typical startup flow:

1. Discover plugins
2. Extract `.deck`
3. Setup Python paths
4. Detect plugin files
5. Install requirements
6. Load Python modules
7. Register blueprints
8. Load buttons
9. Copy assets/scripts
10. Merge languages
11. Register commands/monitors/getters/settings

* * *

# Update System

NeoDeck includes a built-in plugin update system.

Updates are installed from `.deck` URLs.

Expected filename format:

```
plugin-name-v1.2.0.deck
```

Internal version regex:

```Python
(?P<slug>.+)-v?(?P<version>[\d.]+)\.deck
```

* * *

# Update Flow

When updating a plugin:

1. Download `.deck`
2. Extract plugin
3. Validate version
4. Create backup
5. Replace current plugin
6. Install dependencies
7. Cleanup temporary files

Updates are performed atomically when possible.

* * *

# Plugin Backups

Before replacing an existing plugin, NeoDeck creates a backup.

Example:

```
spotify.backup.1.0.0
```

This allows rollback support.

* * *

# Rollback Support

NeoDeck can restore previous plugin versions automatically.

Internal helper:

```Python
rollback_plugin(plugin_name)
```

Rollback restores the previous `.deck` backup.

* * *

# Disabled Folders

Folders ending with:

```
.disabled
```

are skipped entirely by the loader.

Useful for:

* temporarily disabling features
* testing
* development
* archived plugin components

* * *

# Logging

NeoDeck logs plugin loading operations extensively.

Common logged events:

* plugin extraction
* dependency installation
* blueprint registration
* language loading
* asset copying
* update operations
* rollback operations

Useful for debugging plugin issues.

* * *

# Summary

NeoDeck's plugin loader provides:

* dynamic plugin discovery
* automatic dependency installation
* runtime asset isolation
* translation merging
* frontend script injection
* Flask Blueprint registration
* update + rollback support

Most plugin systems are loaded automatically without requiring manual registration steps from the user.