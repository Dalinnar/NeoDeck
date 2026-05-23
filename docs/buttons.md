# Buttons.md — NeoDeck Button & UI System

## Overview

This file defines NeoDeck's UI button system.

Buttons are interactive UI elements that:

* collect user input
* build commands
* execute backend/frontend actions
* render dynamic widgets
* support realtime monitoring systems

Buttons act as the bridge between the frontend UI and the command execution pipeline.

* * *

# Button System Flow

```
Button
  ↓
Input Collection
  ↓
Placeholder Replacement
  ↓
Command Generation
  ↓
Execution Dispatch
  ↓
Backend / Frontend Handler
```

* * *

# Basic Button Structure

Example:

```JSON
{
  "My Button": {
    "command": "/hello",
    "inputs": []
  }
}
```

* * *

# Button Properties

## Core Properties

| Property | Description |
| --- | --- |
| command | command executed by the button |
| inputs | input definitions |
| style | visual customization |
| toggleable | persistent ON/OFF state |
| TYPE | special button type |

* * *

# Command Types

NeoDeck supports multiple command categories.

| Prefix | Purpose |
| --- | --- |
| `/` | backend command |
| `$` | frontend/internal function |
| `#` | special widget/UI handler |

Examples:

```JSON
{
  "command": "/write hello"
}
```

```JSON
{
  "command": "$fullscreen()"
}
```

```JSON
{
  "command": "#monitor"
}
```

* * *

# Placeholder System

Commands support dynamic placeholders.

Example:

```
/write Hello {name}
```

Runtime result:

```
/write Hello Gonzalo
```

Placeholders are replaced using collected input values.

* * *

# Input System

Buttons may define dynamic inputs.

Example:

```JSON
"inputs": [
  {
    "TYPE": "input text",
    "name": "message"
  }
]
```

Inputs are injected into placeholders during command generation.

* * *

# Supported Input Types

NeoDeck supports multiple dynamic input types.

| Type | Description |
| --- | --- |
| input text | simple text field |
| textarea | multiline text input |
| select | dropdown selector |
| input file | uploaded file input |
| input url | validated URL input |
| sys file | native system file picker |
| sys folder | native folder picker |
| macro_rec | macro recorder |
| input number | numeric input |

* * *

# Conditional Inputs

Inputs may depend on another input value.

Example:

```JSON
{
  "TYPE": "input file",
  "name": "selected_option",
  "dependant_on": "uploaded_file"
}
```

Conditional inputs are only rendered when their dependency matches.

Used for:

* mode selectors
* advanced forms
* dynamic configuration systems

* * *

# Dynamic Select Options

Select inputs may load values dynamically from backend APIs.

Example:

```JSON
{
  "TYPE": "select",
  "name": "disk-letter",
  "options_url": "/api/disks"
}
```

Options are fetched at runtime.

Used for:

* disks
* GPUs
* folders
* devices
* plugin-generated content

* * *

# Style System

Buttons support a customizable style object.

Example:

```JSON
{
  "style": {
    "image": "reload.png",
    "image_size": "50%"
  }
}
```

* * *

## Supported Style Properties

| Property | Description |
| --- | --- |
| image | button image/icon |
| image_size | icon scale |
| background_color | button background |
| text_color | text color |
| blank_img | disables default image rendering |

* * *

# Blank Image Buttons

Some buttons intentionally render without an image.

Example:

```JSON
{
  "blank_img": true
}
```

Used for:

* monitors
* trackpads
* custom rendered widgets

* * *

# Toggleable Buttons

Buttons may persist an ON/OFF state.

Example:

```JSON
{
  "command": "/soundcontrol_mute",
  "toggleable": true
}
```

Toggleable buttons:

* keep visual state
* support active/inactive styling
* synchronize with backend state systems

Common uses:

* mute buttons
* pause/play systems
* recording states
* OBS controls
* smart device toggles

* * *

# Multi-Action Buttons

Buttons may contain multiple interaction handlers.

Example:

```JSON
{
  "commands": {
    "single_click": "/hello",
    "double_click": "/echo {text}"
  }
}
```

Supported interaction examples:

* single click
* double click
* hold
* long press

Each interaction maps to a different command.

* * *

# MultiAction Mode

Special UI mode:

```JSON
{
  "command": "__multiaction__"
}
```

Handled separately by the UI builder.

Used for:

* macro systems
* grouped actions
* advanced interaction flows

* * *

# Multiple Button Definitions

Buttons may define multiple variants using:

```JSON
{
  "TYPE": "multiple"
}
```

Example:

```JSON
{
  "TYPE": "multiple",
  "commands": {
    "play": {},
    "pause": {}
  }
}
```

Used for:

* grouped controls
* monitoring variants
* category expansion
* auto-generated button collections

* * *

# Monitoring Buttons

Monitoring buttons display realtime system data.

Example:

```JSON
{
  "command": "#monitor",
  "track": "cpu",
  "collect_data_from": "usage_dict.cpu.usage_percent"
}
```

Monitoring buttons:

* continuously update
* subscribe to tracked values
* render dynamic UI states

Common tracking sources:

* CPU
* memory
* GPU
* disks
* network

* * *

# Realtime Tracking System

Monitoring buttons may define:

| Property | Description |
| --- | --- |
| track | data category |
| collect_data_from | value path |

Example:

```JSON
{
  "track": "memory",
  "collect_data_from": "usage_dict.memory.used_gb"
}
```

* * *

# Special UI Buttons

Some buttons behave as interactive widgets instead of standard commands.

Examples:

* trackpads
* virtual keyboards
* monitoring displays
* remote control surfaces

These buttons are handled by specialized frontend systems.

* * *

# File Handling

If inputs contain uploaded files:

1. file is uploaded
2. backend stores file
3. placeholder is replaced with final path
4. command executes using resolved path

* * *

# Button Generator System

UI generation is handled through:

* generate_button()
* setup_multiaction()
* setup_actions()

Responsibilities:

* rendering inputs
* preview generation
* dialog creation
* interaction binding
* validation
* customization UI

* * *

# Button Builder System

Core builder functions:

* buildButton()
* buildActions()
* buildMultiactionButton()

Responsibilities:

* validation
* serialization
* saving state
* folder uploads
* command generation

* * *

# Validation Rules

Before saving:

* required inputs must exist
* placeholders must resolve correctly
* multi-action buttons require at least one action
* invalid dependencies are rejected

* * *

# Button Execution Pipeline

## Execution Steps

1. User presses button
2. Inputs are collected
3. Placeholders are resolved
4. Final command is generated
5. Command is dispatched
6. Backend/frontend handler executes action

* * *

# Button Data Output

Generated buttons are serialized into objects.

Example:

```JSON
{
  "command": "/echo Hello",
  "btn_text": "My Button",
  "background_color": "#1e1e1e",
  "text_color": "#ffffff",
  "column": 0,
  "row": 0
}
```

* * *

# UI Customization

Buttons support:

* text labels
* icons/images
* colors
* sizing
* grid positioning
* widget rendering

* * *

# Architecture Summary

NeoDeck separates:

* UI button definitions
* command generation
* realtime tracking
* execution handlers

Buttons define:

* user interaction
* data collection
* visual behavior

Commands define:

* backend/frontend logic

Placeholders connect both systems dynamically.