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
schema generation
    ↓
settings.js
    ↓
dynamic UI rendering
    ↓
saveSettings()
    ↓
backend persistence
```

---

# General Setting Properties

| Property | Description |
|---|---|
| `type` | Setting type |
| `default` | Default value |
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

---

# Summary

- Plugins expose settings through `plugin.settings`
- Settings UI is generated dynamically
- Multiple setting types are supported
- Settings are saved automatically
