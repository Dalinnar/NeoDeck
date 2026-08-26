# NeoDeck Plugin Settings System

## Overview

NeoDeck plugins can expose configurable settings through the `plugin.settings` object.

These settings are automatically rendered inside the NeoDeck settings UI using `settings.js`.

---

# Basic Structure

Example:

```python
plugin.settings = {
    "server_port": {
        "type": "number",
        "default": 4455,
    },

    "server_password": {
        "type": "text",
        "default": "",
        "secret": True,
    }
}
```

Each setting entry contains:

- setting id
- setting descriptor
- type definition
- optional metadata

---

# Settings Architecture

Flow:

```text
plugin.settings
    ↓
schema generation (register_plugin_settings, see "Registration Timing" below)
    ↓
settings.js
    ↓
dynamic UI rendering
    ↓
saveSettings()
    ↓
backend persistence (settings.json)
    ↓
current_app.get_settings() at runtime
```

When a plugin is loaded, NeoDeck automatically registers `plugin.settings`
under a category named after `plugin_name`. You do not need to call any
registration function yourself — just define `plugin.settings` and the
loader takes care of the rest.

> ⚠️ **Registration is not per-plugin, it's a second pass over ALL
> plugins.** See [Registration Timing](#registration-timing) before you
> read settings from any code that runs during plugin import (e.g. a
> module-level call, or anything started from `__init__.py` at load
> time). If your plugin reads its own settings before every plugin has
> finished loading, it may read an empty/default dict even though the
> user has real values saved.

---

# Registration Timing

`load_plugins()` runs in **two passes**:

1. **Pass 1** — every `.deck`/plugin directory is extracted, its
   `__init__.py` is executed (this is where `plugin = Blueprint(...)`,
   `plugin.settings = {...}`, `plugin.command_map = {...}`, etc. get
   defined), and its blueprint is registered on the Flask app.
2. **Pass 2** — *after every plugin has finished Pass 1*, NeoDeck loops
   over `app.blueprints` and calls `register_plugin_settings(name,
   plugin.settings)` for each one, plus wires up `command_map`,
   `monitors`, and `getters`.

The practical consequence: **your plugin's settings category is not
registered yet while your `__init__.py` module body is still
executing.** If your plugin does any of the following directly at
module level (i.e. not deferred to a later hook), it is running before
Pass 2:

- Starting a background thread or reconnect loop
- Making a network call that depends on saved credentials
- Reading settings for `your_plugin_name` and expecting real values

```python
# ❌ Do NOT do this at module level in __init__.py
functions.start_background_connection(_current_settings)
```

At the point this line runs, `register_plugin_settings("discord_control", ...)`
hasn't executed yet, so reading settings for `"discord_control"` can
return `{}` or stale defaults — intermittently, depending on plugin load
order.

**Defer startup work to `plugin.init`.** If your Blueprint defines an
`init` attribute (a zero-arg callable), NeoDeck calls it automatically
once *all* plugins are loaded and registered, inside
`with self.app_context():` (see `CustomFlask.run()`):

```python
# ✅ Correct — deferred until after all plugins (incl. yours) are registered,
# and called with an app context already active
def init():
    functions.start_background_connection(_current_settings)

plugin.init = init
```

This guarantees settings for `plugin_name` are registered and readable
the first time your background loop calls it — see below for how to
actually read them from a background thread.

---

# General Setting Properties

| Property | Description |
|---|---|
| `type` | Setting type |
| `default` | Default value. **Required for any setting that should be persisted.** Display-only types (`link`, `status`, `button`) must omit it — see [Display-Only Types](#display-only-types). |
| `secret` | Hides value visually |
| `placeholder` | Input placeholder |
| `min` | Minimum value |
| `max` | Maximum value |
| `step` | Numeric step |
| `rows` | Textarea/json height |

---

# Supported Setting Types

## text

```python
"username": {
    "type": "text",
    "default": "admin"
}
```

---

## password

```python
"password": {
    "type": "password",
    "default": ""
}
```

---

## number

```python
"volume": {
    "type": "number",
    "default": 0.5
}
```

---

## integer

```python
"retries": {
    "type": "integer",
    "default": 3,
    "min": 0,
    "max": 10
}
```

---

## boolean

```python
"enabled": {
    "type": "boolean",
    "default": True
}
```

---

## textarea

```python
"description": {
    "type": "textarea",
    "default": "",
    "rows": 6
}
```

---

## color

```python
"theme_color": {
    "type": "color",
    "default": "#ff0000"
}
```

---

## range

```python
"opacity": {
    "type": "range",
    "default": 50,
    "min": 0,
    "max": 100,
    "step": 1
}
```

---

## select

```python
"quality": {
    "type": "select",
    "default": "medium",
    "options": {
        "low": "Low",
        "medium": "Medium",
        "high": "High"
    }
}
```

---

## multiselect

```python
"devices": {
    "type": "multiselect",
    "default": ["Mic", "Speakers"]
}
```

---

## tags

```python
"allowed_users": {
    "type": "tags",
    "default": ["admin", "moderator"]
}
```

---

## keyvalue

```python
"headers": {
    "type": "keyvalue",
    "default": {
        "Authorization": "token"
    }
}
```

---

## json

```python
"config": {
    "type": "json",
    "default": {
        "enabled": True
    }
}
```

---

## button

```python
"clear_cache": {
    "type": "button",
    "action": "/clear_cache",
    "confirm": True
}
```

---

## info

```python
"plugin_version": {
    "type": "info",
    "default": "1.0.0"
}
```

---

## link

```python
"documentation": {
    "type": "link",
    "url": "https://example.com/docs"
}
```

---

## status

```python
"check_connection": {
    "type": "status",
    "endpoint": "/obs/check_connection"
}
```

---

# Display-Only Types

`link`, `status`, and `button` are **display-only**: they render UI
elements but do not hold a persisted value.

**Do not give them a `"default"` key.** NeoDeck's schema resolver only
extracts entries that have `"default"` into the persisted settings dict
— a descriptor without `"default"` is treated as display-only and
skipped when building defaults, overrides, and the resolved settings
dict. Adding `"default"` to a `link` or `status` entry will make it
behave like a real persisted setting (and show up in `settings.json`
overrides), which is almost never what you want.

```python
# Correct — display-only, no "default"
"check_connection": {
    "type": "status",
    "endpoint": "/obs/check_connection",
}

# Incorrect — this will be treated as a real persisted setting
"check_connection": {
    "type": "status",
    "endpoint": "/obs/check_connection",
    "default": "",
}
```

---

# Secret Fields

```python
"api_key": {
    "type": "text",
    "secret": True
}
```

---

# Save System

Settings are saved through:

```javascript
saveSettings()
```

Sent to:

```text
POST /save_settings
```

Only the **delta** against the schema defaults is written to
`settings.json` (under `.config/`), not the full resolved dict. If a
saved value matches the default exactly, it will not appear in that
file — this is expected, not a bug. If you're debugging by inspecting
`settings.json` directly, keep in mind an "empty" or missing key there
can simply mean "using the default", not "never saved".

---

# Reading Settings at Runtime

Defining `plugin.settings` gives you the schema and the settings UI,
but plugin code that needs the **current, saved** values (for example,
to connect to an external service using user-provided credentials)
reads them off the Flask app object via `current_app`:

```python
from flask import current_app

# Full resolved dict for your plugin's category (defaults + overrides)
my_settings = current_app.get_settings(plugin_name)

# A single value
port = current_app.get_settings("my_plugin", "server_port")
```

`app.get_settings` is attached to the Flask app instance once, in
NeoDeck's bootstrap (`app.get_settings = get_settings`, pointing at the
core `get_settings` function from the top-level `settings.py` module).
`current_app` is how plugin code — which is dynamically loaded via
`exec_module` and does **not** sit inside a conventional importable
`app` package — gets a handle back to that same function.

## ⚠️ Do NOT `import` settings helpers directly in plugin code

You may be tempted to write:

```python
# ❌ Will fail — there is no importable `app.utils.settings` module
from app.utils.settings import get_settings
```

**This import does not resolve in NeoDeck plugin code**, and the
failure is easy to miss. Plugins are loaded via
`importlib.util.spec_from_file_location` + `exec_module`, and the
surrounding `load_plugin_module()` call is wrapped in a `try/except`
that only logs a warning:

```python
if "__init__.py" in files:
    try:
        load_plugin_module(app, root, "__init__.py", plugin_name)
    except Exception as e:
        log.warning(f"Error loading __init__.py: {e}")
```

So a bad top-level import in your `__init__.py` doesn't crash NeoDeck —
it just quietly logs a warning and **your blueprint never registers**.
Your commands, monitors, routes, and settings UI simply won't appear,
with no obvious error surfaced to the user. If a plugin you're
building "isn't showing up at all," check the NeoDeck log for a
`ModuleNotFoundError` on this exact line before assuming the loader
itself is broken.

`app` is the local variable name for the running `CustomFlask` instance
in the bootstrap script — a Flask application object, not a Python
package on `sys.path`. There is no `app/utils/settings.py` submodule to
import in plugin code. Always go through `current_app.get_settings(...)`
instead.

## Reading settings from background threads

`current_app` is a **context-local proxy** — it only resolves while an
application or request context is pushed on the *current thread*. That
holds true inside a route handler, inside a `command_map`/`monitors`
callback (NeoDeck pushes a context for these), and inside `plugin.init()`
(NeoDeck wraps the `init()` pass in `with self.app_context():`).

It does **not** hold inside a background thread you start yourself
(e.g. a reconnect loop via `start_background_connection`, a
`threading.Timer`, or similar) — that thread has no context pushed by
default, and calling `current_app.get_settings(...)` from it raises
`RuntimeError: Working outside of application context`.

The fix is to capture the **real app object** (not the `current_app`
proxy — a proxy can't be handed off to another thread) while a context
is active, typically inside `init()`, and push a short-lived context
around each read from the background thread:

```python
from flask import current_app

def _make_current_settings(app):
    def _current_settings():
        try:
            with app.app_context():
                return app.get_settings(plugin_name) or {}
        except Exception as exc:
            functions._log(f"No se pudo leer settings: {exc}")
            return {}
    return _current_settings

def init():
    app = current_app._get_current_object()
    functions.start_background_connection(_make_current_settings(app))

plugin.init = init
```

Because settings can change while NeoDeck is running (the user can
open the settings UI at any time), avoid reading settings once and
caching them for the plugin's whole lifetime. Call
`current_app.get_settings(...)` again whenever you need a fresh value —
for example, right before attempting a reconnect — instead of reusing a
value captured at plugin load time.

There is also `save_settings(updates)`, used internally by the
`POST /save_settings` endpoint, but plugins generally shouldn't call
this directly — let the standard settings UI handle writes.

---

# Translation System

Labels use:

```text
label__setting_name
```

Categories use:

```text
PLUGIN_NAME_CATEGORY_NAME
```

---

# Full Example

```python
plugin.settings = {
    "check_connection": {
        "type": "status",
        "endpoint": "/obs/check_connection",
    },

    "obs_guide": {
        "type": "link",
        "url": "https://github.com/obsproject/obs-websocket",
    },

    "server_port": {
        "type": "number",
        "default": 4455,
    },

    "server_password": {
        "type": "text",
        "default": "",
        "secret": True,
    }
}
```

Reading it back at runtime:

```python
from flask import current_app

settings = current_app.get_settings("obs_integration")
port = settings.get("server_port")
password = settings.get("server_password")
```

---

# Summary

- Plugins expose settings through `plugin.settings`
- Settings UI is generated dynamically
- Multiple setting types are supported
- `link`, `status`, and `button` are display-only and must not have a `"default"`
- Settings are saved automatically, and only the delta from defaults is persisted
- Registration happens in a **second pass**, after every plugin has finished
  loading — defer startup work (background threads, reconnects) to
  `plugin.init`, not module-level code in `__init__.py`
- Plugin code reads current values via `current_app.get_settings(plugin_name)`
  — there is no importable `app.utils.settings` module; attempting that
  import silently breaks plugin loading instead of raising a visible error
- `current_app` only resolves inside an active request/app context —
  background threads must capture the real `app` object (during
  `init()`) and push their own `app.app_context()` on each read