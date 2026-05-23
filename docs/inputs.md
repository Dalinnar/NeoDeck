# Inputs

NeoDeck uses a dynamic input system for buttons, settings, dialogs, and plugin configuration.

Inputs are created from plain JSON objects using the internal `input_factory.js`.

This allows plugins to generate forms dynamically without manually writing HTML.

* * *

# Basic Structure

Every input is described using a JSON object.

Example:

```JSON
{
    "TYPE": "input text",
    "name": "username",
    "label": "Username",
    "required": true
}
```

* * *

# Input Properties

| Property | Description |
| --- | --- |
| `TYPE` | Defines the input type |
| `name` | Internal input name |
| `label` | Translation label |
| `id` | Optional DOM id |
| `required` | Makes the field required |
| `attributes` | Extra HTML attributes |
| `dependant_on` | Makes the input conditionally visible |
| `options` | Static select options |
| `options_url` | Dynamic select endpoint |

* * *

# Standard Inputs

## Text Input

```JSON
{
    "TYPE": "input text",
    "name": "message"
}
```

Generates:

```HTML
<input type="text">
```

* * *

## Number Input

```JSON
{
    "TYPE": "input number",
    "name": "volume"
}
```

* * *

## Checkbox

```JSON
{
    "TYPE": "input checkbox",
    "name": "enabled"
}
```

Checkboxes automatically change layout direction.

* * *

## Textarea

```JSON
{
    "TYPE": "textarea",
    "name": "content"
}
```

* * *

# Select Inputs

## Static Select

```JSON
{
    "TYPE": "select",
    "name": "quality",
    "options": [
        "low",
        "medium",
        "high"
    ]
}
```

* * *

## Key/Value Select

```JSON
{
    "TYPE": "select",
    "name": "resolution",
    "options": {
        "720p": "HD",
        "1080p": "Full_HD",
        "1440p": "QHD"
    }
}
```

Keys are stored as values.

Values are translated using:

```
select_verbose_<value>
```

* * *

## Dynamic Select

```JSON
{
    "TYPE": "select",
    "name": "device",
    "options_url": "/plugin/get_devices"
}
```

NeoDeck fetches the endpoint automatically and fills the select.

Supported response types:

```JSON
["option1", "option2"]
```

or:

```JSON
{
    "id1": "Device 1",
    "id2": "Device 2"
}
```

* * *

# Conditional Inputs

Inputs can depend on another input value.

Example:

```JSON
{
    "TYPE": "input text",
    "name": "ip",
    "dependant_on": "network"
}
```

The field only appears when the parent input matches the dependency value.

* * *

# System Inputs

NeoDeck includes special native system path pickers.

* * *

## System Folder Picker

```JSON
{
    "TYPE": "sys folder",
    "name": "folder"
}
```

Opens the OS folder picker.

* * *

## System File Picker

```JSON
{
    "TYPE": "sys file",
    "name": "file"
}
```

Opens the OS file picker.

* * *

# Macro Recorder Input

The macro recorder allows recording keyboard shortcuts directly from the UI.

```JSON
{
    "TYPE": "macro_rec",
    "name": "shortcut"
}
```

Recorded macros are stored as JSON arrays.

Example:

```JSON
[
    "Ctrl+Shift+A",
    "@wait_10ms",
    "Alt+Enter"
]
```

* * *

# Labels & Translations

Labels use the translation system automatically.

Example:

```JSON
{
    "label": "Server Port"
}
```

Internally becomes:

```
input_label__Server_Port
```

* * *

# HTML Attributes

Extra attributes can be injected into the input element.

Example:

```JSON
{
    "TYPE": "input text",
    "name": "username",
    "attributes": {
        "maxlength": "32",
        "placeholder": "Username"
    }
}
```

* * *

# Example Full Form

```JSON
[
    {
        "TYPE": "input text",
        "name": "host",
        "label": "Host"
    },
    {
        "TYPE": "input number",
        "name": "port",
        "label": "Port"
    },
    {
        "TYPE": "select",
        "name": "quality",
        "options": [
            "low",
            "medium",
            "high"
        ]
    },
    {
        "TYPE": "input checkbox",
        "name": "enabled"
    }
]
```

* * *

# Supported Types

| TYPE | Description |
| --- | --- |
| `input text` | Text input |
| `input number` | Numeric input |
| `input checkbox` | Boolean checkbox |
| `textarea` | Multiline text |
| `select` | Dropdown select |
| `sys folder` | Native folder picker |
| `sys file` | Native file picker |
| `macro_rec` | Keyboard macro recorder |

* * *

# Notes

* Inputs are generated entirely dynamically
* Plugins should never manually inject HTML forms
* Translation keys are generated automatically
* `options_url` is recommended for dynamic device lists
* `dependant_on` is useful for advanced forms
* Macro inputs store serialized key sequences automatically