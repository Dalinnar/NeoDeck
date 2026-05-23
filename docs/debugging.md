# Debugging

NeoDeck plugins are loaded dynamically at runtime, which means debugging usually involves:

* plugin loading
* dependency installation
* import errors
* asset loading
* command registration
* settings registration
* frontend/backend communication

This document explains the most common debugging workflows and issues.

* * *

# Recommended Development Mode

During development, enable root plugin loading:

```JSON
{
  "neodeck": {
    "use_root_plugins": true
  }
}
```

When enabled, NeoDeck loads plugin folders directly from `plugins/` instead of extracting `.deck` files.

This provides several advantages:

* faster iteration
* easier debugging
* no repackaging required
* direct file editing
* cleaner stack traces

* * *

# Root Plugin Loading

With `use_root_plugins=true`:

```
plugins/
└── my_plugin/
    ├── __init__.py
    ├── buttons.json
    └── assets/
```

NeoDeck loads the folder directly.

Without it:

```
plugins/
└── my_plugin.deck
```

NeoDeck extracts the `.deck` file into a temporary directory before loading.

* * *

# Recommended Debug Workflow

Typical workflow:

1. Enable `use_root_plugins`
2. Place plugin folder inside `plugins/`
3. Restart NeoDeck
4. Check console logs
5. Fix errors
6. Repeat

This is significantly easier than rebuilding `.deck` packages during development.

* * *

# Console Logs

NeoDeck logs most plugin operations.

Common logs include:

```
Loaded plugin blueprint: my_plugin
Registered plugin: my_plugin v1.0.0
Copied assets/scripts for plugin my_plugin
Loaded language file: en_US
```

If a plugin fails to load, NeoDeck usually logs the exception.

* * *

# Common Plugin Loading Errors

## Missing `__init__.py`

Problem:

```
Plugin entrypoint not found
```

Cause:

* plugin folder does not contain `__init__.py`

Fix:

```
my_plugin/
└── __init__.py
```

* * *

## Invalid `plugin_version`

Problem:

```
Version mismatch
```

Cause:

* `.deck` filename version does not match `plugin_version`

Example:

```
my_plugin-v1.2.0.deck
```

```Python
plugin_version = "1.1.0"
```

Fix:

Ensure both versions match.

* * *

## Import Errors

Problem:

```
ModuleNotFoundError
```

Cause:

* missing dependency
* invalid import
* wrong Python environment

Fix:

Add the package to `requirements.txt`.

Example:

```
requests
psutil
```

* * *

# Dependency Installation Issues

NeoDeck installs plugin dependencies automatically using:

```Python
python -m pip install -r requirements.txt
```

Installed versions are tracked in:

```
satisfied_installs.txt
```

If dependencies are not updating:

1. bump `plugin_version`
2. restart NeoDeck

NeoDeck only reinstalls requirements when the plugin version changes.

* * *

# Asset Debugging

NeoDeck copies plugin assets into `.temp`.

Assets are renamed automatically to avoid conflicts.

Example:

```
my_plugin/assets/icon.png
```

Becomes:

```
.temp/my_plugin__icon.png
```

Buttons referencing assets are automatically rewritten:

```JSON
{
  "style": {
    "image": "/temp/my_plugin__icon.png"
  }
}
```

* * *

# Frontend Script Debugging

Frontend scripts are copied into `.temp` during loading.

Common issues:

* wrong asset path
* browser cache
* script syntax errors

Use browser DevTools to inspect:

* console errors
* failed requests
* missing assets

* * *

# Language Debugging

Plugin `.lang` files are merged dynamically into:

```
.temp/languages/
```

If translations are missing:

* ensure files end with `.lang`
* ensure syntax is valid
* restart NeoDeck

Example:

```
hello=Hello World
```

* * *

# Buttons Not Appearing

Possible causes:

* invalid `buttons.json`
* JSON syntax error
* duplicate button IDs
* invalid command references

Check logs for:

```
Error loading buttons.json
```

Validate JSON formatting carefully.

* * *

# Commands Not Registering

Commands are registered from:

```Python
plugin.command_map
```

Example:

```Python
plugin.command_map = {
    "hello_world": hello_world
}
```

Common issues:

* typo in command name
* function not imported
* command map missing

* * *

# Monitors Not Updating

Monitors are registered from:

```Python
plugin.monitors
```

Example:

```Python
plugin.monitors = {
    "spotify_status": spotify_monitor
}
```

If monitors do not update:

* ensure monitor exists
* ensure frontend requests updates
* ensure returned data is valid

* * *

# Settings Debugging

Plugin settings are registered dynamically.

Example:

```Python
plugin.settings = {
    "enabled": {
        "type": "boolean",
        "default": True
    }
}
```

NeoDeck merges plugin settings into the global schema at runtime.

If settings are not appearing:

* ensure `plugin.settings` exists
* ensure every setting has a valid `"type"`
* restart NeoDeck

* * *

# Flask Debugging

NeoDeck exposes Flask debug settings:

```JSON
{
  "neodeck": {
    "flask_debug": true,
    "flask_reloader": true
  }
}
```

Useful during backend development.

Be aware:

* Flask reloader may load plugins twice
* some monitors may initialize twice

* * *

# Plugin Isolation

Plugins are isolated by namespace, not by process.

This means plugins can still:

* overwrite globals
* conflict with imports
* modify shared runtime state

Be careful when:

* monkeypatching
* modifying globals
* using shared filenames

* * *

# Temporary Files

NeoDeck uses `.temp/` during runtime.

This includes:

* extracted plugins
* copied assets
* generated language files

If something behaves unexpectedly:

1. close NeoDeck
2. delete `.temp`
3. restart

* * *

# Useful Debugging Tips

## Print Early

Inside `init()`:

```Python
def init():
    print("Plugin initialized")
```

* * *

## Verify Paths

Use:

```Python
print(__file__)
```

To verify runtime paths.

* * *

## Log Registered Commands

```Python
print(plugin.command_map.keys())
```

* * *

## Validate JSON

Always validate:

* `buttons.json`
* settings schemas
* manifests

Invalid JSON is one of the most common plugin issues.

* * *

# Safe Testing Strategy

Recommended testing order:

1. metadata
2. commands
3. buttons
4. assets
5. settings
6. monitors
7. routes
8. packaging

This makes debugging significantly easier.

* * *

# Production Testing

Before publishing:

* disable `use_root_plugins`
* package as `.deck`
* test extraction/loading
* test dependency installation
* test updates
* test clean install

Some issues only appear outside development mode.

* * *

# Typical Debug Checklist

Before reporting a bug:

* Does `__init__.py` exist?
* Does the plugin load in logs?
* Does `plugin_version` match the `.deck` filename?
* Are dependencies installed?
* Is JSON valid?
* Are asset paths correct?
* Is `use_root_plugins` enabled?
* Did you restart NeoDeck?
* Did you clear `.temp/`?

Most plugin issues come from one of these.