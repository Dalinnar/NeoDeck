# Packaging Plugins

NeoDeck plugins are distributed using the `.deck` format.

A `.deck` file is simply a packaged plugin archive containing:

* Python code
* assets
* scripts
* translations
* buttons
* optional dependencies

NeoDeck automatically extracts and loads these packages at runtime.

* * *

# What is a `.deck` file?

`.deck` files are ZIP-based plugin packages.

Example:

```
spotify-v1.2.0.deck
```

Versioned filenames are required for updates and dependency tracking.

Expected naming format:

```
plugin-name-vX.Y.Z.deck
```

Examples:

```
obs-v1.0.0.deck
discord_rpc-v2.3.1.deck
minecraft_tools-v0.5.0.deck
```

* * *

# Typical Plugin Structure

```
my-plugin/
│
├── __init__.py
├── requirements.txt
├── buttons.json
│
├── assets/
│   ├── icon.png
│   └── background.jpg
│
├── scripts/
│   └── helper.js
│
└── languages/
    ├── en_US.lang
    └── es_AR.lang
```

* * *

# Required Files

## `__init__.py`

Main plugin entrypoint.

NeoDeck scans plugins searching for this file.

Example:

```Python
plugin_version = "1.0.0"
```

Without `plugin_version`, the plugin will not be registered.

* * *

## `buttons.json`

Defines the plugin buttons and UI.

Example:

```JSON
{
  "spotify": {
    "play_pause": {
      "name": "Play/Pause",
      "command": "spotify_play_pause"
    }
  }
}
```

* * *

# Optional Files

## `requirements.txt`

Python dependencies automatically installed by NeoDeck.

Example:

```
spotipy
requests
psutil
```

Dependencies are installed only when:

* the plugin version changes
* the plugin was never installed before

* * *

## `languages/`

Contains `.lang` translation files.

Example:

```
play=Play
pause=Pause
```

* * *

## `assets/`

Contains plugin images and static files.

NeoDeck automatically copies and remaps assets internally.

* * *

## `scripts/`

Contains frontend or helper scripts.

* * *

# Installing Plugins

Plugins can be:

* manually copied into `/plugins`
* installed from URLs
* distributed through repositories
* developed directly using root plugins mode

* * *

# Official Plugin Repository

Default repository:

```
Dalinnar/NeoDeck-plugins
```

This repository is used by NeoDeck to discover and install community plugins.

You can submit your own plugins through pull requests.

* * *

# Publishing Plugins

You are allowed to create, install, and distribute your own plugins.

You are also allowed to design completely custom plugin systems or integrations.

However, this is done at your own risk.

Plugins have full Python execution access and can:

* execute commands
* access files
* install dependencies
* interact with the operating system

Only install plugins from sources you trust.

* * *

# Contributing to the Official Repository

You can create pull requests to include your plugin in the official NeoDeck plugins repository.

Before submitting a plugin:

* keep the plugin focused on one application or one use-case
* avoid unnecessary complexity
* avoid remote code execution systems
* avoid dynamic executable downloads
* avoid runtime code injection
* avoid obfuscated code
* avoid self-updating binaries

Plugins should be deterministic and inspectable.

* * *

# Security Guidelines

We try to keep official plugins reasonably safe.

Because plugins execute Python code, complete sandboxing is not possible.

To reduce risk, official plugins should:

* target a specific application or workflow
* avoid dynamic external code loading
* avoid hidden background processes
* avoid downloading executable payloads
* avoid modifying unrelated system components

Good plugin examples:

* OBS integration
* Spotify controls
* Discord Rich Presence
* Minecraft server controls

Bad plugin examples:

* generic remote shell tools
* arbitrary code runners
* hidden automation malware
* executable downloaders
* plugins that inject unknown code at runtime

* * *

# Updating Plugins

NeoDeck supports automatic plugin updates.

Update flow:

1. Download `.deck`
2. Extract package
3. Validate version
4. Backup old plugin
5. Replace old `.deck`
6. Install dependencies
7. Reload plugin

* * *

# Backups

When updating plugins, NeoDeck creates backups automatically.

Example:

```
spotify.backup.1.2.0
```

This allows rollback if an update fails.

* * *

# Root Plugins Mode

For development, NeoDeck supports loading plugins directly from folders.

Enable:

```JSON
{
  "use_root_plugins": true
}
```

Then place plugin folders directly inside:

```
/plugins/
```

Instead of:

```
/plugins/my-plugin.deck
```

Use:

```
/plugins/my-plugin/
```

This mode is recommended only for development/debugging.