# Requirements.md — NeoDeck Plugin Dependencies

## Overview

NeoDeck plugins can include a `requirements.txt` file for installing Python dependencies automatically.

When a plugin is loaded or updated, NeoDeck checks for this file and installs all required packages using pip.

---

# requirements.txt

Example:

```txt
requests
psutil
websocket-client
```

Version pinning is supported:

```txt
requests==2.32.0
```

---

# Automatic Installation

During plugin loading:

1. Plugin is extracted
2. NeoDeck searches for `requirements.txt`
3. Dependencies are installed automatically
4. Installed version is cached

---

# Installation Flow

```text
Plugin Loaded
    ↓
Find requirements.txt
    ↓
pip install -r requirements.txt
    ↓
Store installed version
```

---

# Internal Installer

NeoDeck uses:

```python
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-r", req_path]
)
```

This ensures packages are installed using the current Python interpreter.

---

# Version Tracking

Installed plugin dependency versions are tracked inside:

```text
satisfied_installs.txt
```

Format:

```text
plugin_name==1.0.0
```

This prevents reinstalling requirements every launch.

---

# Update Behavior

When a plugin version changes:

- NeoDeck detects the new version
- Requirements are reinstalled
- Cache entry is updated

---

# Best Practices

Keep dependencies:

- minimal
- lightweight
- compatible with Windows
- stable versions when possible

Prefer:

```txt
requests>=2.0
```

Over:

```txt
requests
```

For production plugins.

---

# Important Notes

- `requirements.txt` is optional
- Only Python packages are supported
- Failed installs are logged internally
- Dependency installation is silent in UI

---

# Example Plugin Structure

```text
my_plugin/
│
├── __init__.py
├── requirements.txt
├── buttons.json
└── assets/
```

---

# Summary

- Plugins may include `requirements.txt`
- Dependencies install automatically
- NeoDeck caches installed versions
- Reinstall occurs only after plugin updates
