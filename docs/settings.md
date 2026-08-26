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
schema generation (register_plugin_settings, automatic on plugin load)
    ↓
settings.js
    ↓
dynamic UI rendering
    ↓
saveSettings()
    ↓
backend persistence (settings.json)
    ↓
get_settings() at runtime
```

When a plugin is loaded, NeoDeck automatically registers `plugin.settings`
under a category named after `plugin_name`. You do not need to call any
registration function yourself — just define `plugin.settings` and the
loader takes care of the rest.

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
should call `get_settings()` from `app.utils.settings`:

```python
from app.utils.settings import get_settings

# Full resolved dict for your plugin's category (defaults + overrides)
my_settings = get_settings("my_plugin")

# A single value
port = get_settings("my_plugin", "server_port")
```

- `get_settings()` with no arguments returns the full resolved settings
  dict across every category (core `neodeck` settings plus every
  registered plugin).
- `get_settings(category)` returns the resolved dict for one category —
  pass your `plugin_name` here.
- `get_settings(category, key)` returns a single resolved value, or
  `None` if the key doesn't exist.

"Resolved" means defaults from `plugin.settings` merged with whatever
the user has actually saved through the settings UI — this is what you
want to read, not the schema itself.

Because settings can change while NeoDeck is running (the user can
open the settings UI at any time), avoid reading settings once and
caching them for the plugin's whole lifetime. Call `get_settings()`
again whenever you need a fresh value — for example, right before
attempting a reconnect — instead of reusing a value captured at plugin
load time.

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
from app.utils.settings import get_settings

settings = get_settings("obs_integration")
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
- Plugin code reads current values with `get_settings(plugin_name)` from `app.utils.settings`, not from the schema