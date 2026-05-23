# Plugin Metadata

NeoDeck plugins use metadata to describe:

* plugin identity
* versioning
* authors
* descriptions
* icons
* repository information
* release manifests

Metadata is primarily defined inside the plugin `__init__.py`.

* * *

# Basic Metadata

Minimal example:

```Python
plugin_name = "my_plugin"
plugin_version = "1.0.0"

plugin.metadata = {
    "name": plugin_name,
    "version": plugin_version,
    "creators": ["Your Name"],
    "description": "Example NeoDeck plugin",
    "icon": "assets/icon.jpg"
}
```

* * *

# Required Metadata Variables

NeoDeck expects the following variables to exist:

| Variable | Required | Description |
| --- | --- | --- |
| `plugin_name` | Yes | Unique plugin identifier |
| `plugin_version` | Yes | Current plugin version |
| `plugin.metadata` | Recommended | Plugin metadata dictionary |

* * *

# plugin_name

`plugin_name` identifies the plugin internally.

Example:

```Python
plugin_name = "spotify_controls"
```

* * *

## Naming Rules

Recommended:

* lowercase
* underscores instead of spaces
* stable identifier
* avoid special characters

Good:

```
spotify_controls
obs_integration
discord_rpc
```

Bad:

```
Spotify Controls
My Plugin!!!
plugin-v2
```

* * *

# plugin_version

Defines the current plugin version.

Example:

```Python
plugin_version = "1.4.0"
```

NeoDeck uses this value for:

* dependency tracking
* update detection
* installation state
* release manifests

* * *

# Versioning

Semantic versioning is strongly recommended.

Format:

```
MAJOR.MINOR.PATCH
```

Example:

```
1.0.0
1.2.3
2.0.0
```

* * *

## Version Guidelines

| Type | Meaning |
| --- | --- |
| MAJOR | Breaking changes |
| MINOR | New features |
| PATCH | Bug fixes |

* * *

# Metadata Dictionary

The metadata dictionary is attached to the plugin blueprint.

Example:

```Python
plugin.metadata = {
    "name": "spotify_controls",
    "version": "1.2.0",
    "creators": ["Dalinnar"],
    "description": "Spotify integration for NeoDeck",
    "icon": "assets/icon.jpg"
}
```

* * *

# Supported Metadata Fields

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Plugin display name |
| `version` | string | Current plugin version |
| `creators` | list | Plugin authors |
| `description` | string | Short plugin description |
| `icon` | string | Relative icon path |

* * *

# Creators

`creators` should be a list.

Example:

```Python
"creators": [
    "Dalinnar",
    "Contributor"
]
```

* * *

# Description

Descriptions should be short and clear.

Good:

```
Spotify integration for NeoDeck
```

Bad:

```
This plugin allows the user to fully integrate the Spotify desktop application into the NeoDeck ecosystem with multiple controls and advanced systems.
```

* * *

# Icons

Plugins can define an icon asset.

Example:

```Python
"icon": "assets/icon.jpg"
```

Recommended:

```
assets/icon.jpg
```

* * *

# Icon Requirements

Recommended:

* square image
* jpg or png
* lightweight
* readable at small sizes

Typical sizes:

```
128x128
256x256
512x512
```

* * *

# Metadata Extraction

NeoDeck reads plugin metadata directly from:

```
__init__.py
```

The loader extracts:

* `plugin_name`
* `plugin_version`

using regex parsing.

* * *

# Release Metadata

NeoDeck repositories may also generate:

```
plugin.json
manifest.json
```

for plugin distribution systems.

* * *

# plugin.json

Each plugin can generate a `plugin.json` file containing:

* plugin information
* release history
* download URLs
* version metadata
* icon URLs

Example:

```JSON
{
  "plugin_name": "spotify_controls",
  "description": "Spotify integration",
  "latest_version": "1.2.0",
  "icon_url": "https://...",
  "releases": []
}
```

* * *

# manifest.json

The repository-wide manifest contains:

* all published plugins
* latest versions
* download URLs
* metadata references

Example:

```JSON
{
  "spotify_controls": {
    "plugin_name": "spotify_controls",
    "latest_version": "1.2.0",
    "download_url": "https://..."
  }
}
```

* * *

# GitHub Release Integration

NeoDeck plugin repositories may automatically build metadata from:

* GitHub Releases
* release tags
* uploaded `.deck` assets

Release tags follow:

```
plugin_name@1.0.0
```

Example:

```
spotify_controls@1.4.0
```

* * *

# Automatic Manifest Generation

The repository tooling can automatically:

* scan plugin folders
* extract metadata
* fetch GitHub releases
* generate manifests
* generate plugin release history

This allows plugin stores and managers to work automatically.

* * *

# Example Complete Metadata

```Python
from flask import Blueprint

plugin_name = "spotify_controls"
plugin_version = "1.2.0"

plugin = Blueprint(plugin_name, __name__)

plugin.metadata = {
    "name": "Spotify Controls",
    "version": plugin_version,
    "creators": ["Dalinnar"],
    "description": "Spotify integration for NeoDeck",
    "icon": "assets/icon.jpg"
}
```

* * *

# Best Practices

## Keep Names Stable

Changing `plugin_name` may break:

* updates
* settings
* manifests
* plugin tracking

Treat it as a permanent identifier.

* * *

## Use Semantic Versioning

Recommended:

```
1.0.0
1.1.0
1.1.1
2.0.0
```

Avoid:

```
v1
release2
beta_final
```

* * *

## Keep Descriptions Short

Metadata descriptions should remain concise.

Long explanations belong in:

* README files
* documentation
* plugin pages

* * *

# Notes

* Metadata is read during plugin loading
* Version tracking is automatic
* Icons may be used by plugin stores
* Manifest generation is repository-driven
* Plugin metadata should remain lightweight