# Commands.md — NeoDeck Command System

## Overview
This file defines the backend command execution system used by NeoDeck plugins. Commands act as the bridge between UI buttons and Python logic.

---

## Command System Architecture

Flow:
UI Button → command string → command_map → Python function → execution

---

## Command Map

Commands are registered inside a plugin using `plugin.command_map`:

```python
plugin.command_map = {
    "/hello": lambda: say_hello(),
    "/echo": lambda message: echo(message),
}
```

---

## Command Format

Commands are string identifiers:

```
/command_name
```

They are referenced directly by UI buttons.

---

## Arguments

Commands may receive arguments depending on invocation:

`message` is the full command string with all variables.

an example of a full command is 
`/obs_change_scene {scene_name}`

message is configured to be the full string to be able to use it however the funcion needs it

message might contain special 


```python
"/echo": lambda message: echo(message),
```

Arguments are injected by NeoDeck at runtime.

---

## Execution Logic

When a command is executed:

1. Message is received
2. Command is extracted (first token)
3. command_map is searched
4. Matching function is executed
5. Result is returned

---

## Process Command Function

Core backend handler:

```python
def process_command(message, command_type="command"):
    message = message.strip()
    cmd, _, rest = message.partition(" ")

    command_dict = command_map if command_type == "command" else getter_map

    func = command_dict.get(cmd)
    if func:
        return func(message) if "message" in func.__code__.co_varnames else func()

    return ""
```

---

## Getter System

NeoDeck supports read-only commands via `getter_map`:

- Used for data retrieval
- Does not modify state
- Same execution flow as commands

---

## Monitors (System Data API)

Monitors are a special backend feature used to fetch **real-time or computed system values** (CPU, RAM, custom stats, etc.) in a single request.

Unlike commands, monitors are **batch-requested via HTTP** and return structured JSON data.

* * *

## API Endpoint

```Python
@app.route("/monitors", methods=["POST"])
def usage():
    return get_monitors(request.get_json()["track"])
```

### Request Format

Monitors are requested using a JSON body:

```JSON
{
  "track": ["cpu_usage", "ram_usage", "fps"]
}
```

* `track` → list of monitor keys you want to fetch
* Each key must exist in `monitors_map`

* * *

`Commands.md`.

* * *

## Monitors System (Full Architecture)

## Overview

The Monitor System is a **reactive data layer** used by NeoDeck buttons to display real-time values such as CPU usage, RAM, FPS, or custom plugin metrics.

It is designed as a **pull-based batch API**:

* Frontend requests multiple values at once
* Backend resolves them using a registry (`monitors_map`)
* Results are returned as JSON

* * *

## Frontend Usage

A monitor button is defined like this:

```JSON
{
  "command": "#monitor",
  "track": ["cpu_usage", "ram_usage"]
}
```

### Behavior

When a button uses:

```JavaScript
buttonData.command === "#monitor"
```

The system:

1. Calls `Initialize_monitors(track)`
2. Creates a `<h2>` display element
3. Continuously updates it with fetched values

```JavaScript
Initialize_monitors(this.data.track ?? undefined);
```

Each tracked key becomes a live value inside the UI.

* * *

## Backend Endpoint

```Python
@app.route("/monitors", methods=["POST"])
def usage():
    return get_monitors(request.get_json()["track"])
```

### Request format

```JSON
{
  "track": ["cpu_usage", "fps", "ram_usage"]
}
```

* * *

## Monitor Map (Core Registry)

The `monitors_map` is the **central registry of all available system metrics**.

```Python
monitors_map = {
    "cpu_usage": get_cpu_usage,
    "ram_usage": get_ram_usage,
    "fps": get_fps,
    "disk_usage": get_disk_usage,
}
```

* * *

## How It Works

Each entry follows this structure:

```Python
"monitor_key": function()
```

### Rules

* Functions take **no arguments**
* Functions return a **single value**
* Must be **fast-executing** (called frequently)
* Must be **serializable** (JSON-safe)

* * *

## Execution Flow

When a request arrives:

```Python
def get_monitors(requested_monitors):
    global monitors_map
    result = {}

    for monitor in requested_monitors:
        if monitor in monitors_map:
            result[monitor] = monitors_map[monitor]()

    return json.dumps(result, indent=4)
```

### Step-by-step

1. Receive list of requested monitor keys (`track`)
2. Loop through each key
3. Validate it exists in `monitors_map`
4. Execute the function
5. Store result in response dictionary
6. Return JSON string

* * *

## Example Request

```JSON
{
  "track": ["cpu_usage", "fps"]
}
```

## Example Response

```JSON
{
  "cpu_usage": 18.4,
  "fps": 144
}
```

* * *

## Frontend Binding (Important)

In `MonitorButton`:

```JavaScript
if (this.data.command === "#monitor") {
  Initialize_monitors(this.data.track ?? undefined);

  const monitor = document.createElement("h2");
  monitor.setAttribute("data_from", this.data.collect_data_from);

  this.element.appendChild(monitor);
}
```

### Key idea

* `track` defines WHAT to fetch
* `Initialize_monitors()` defines HOW often to fetch
* `<h2 data_from="...">` defines WHERE to inject value

* * *

## Monitor Update Loop (Concept)

Even if not shown directly, the system behaves like:

```JavaScript
setInterval(async () => {
  const data = await request_data("/monitors", {
    track: activeTracks
  });

  updateUI(data);
}, 1000);
```

* * *

## Adding a New Monitor

To add a new metric:

### 1. Define function

```Python
def get_gpu_usage():
    return psutil.virtual_memory().percent
```

### 2. Register it

```Python
monitors_map["gpu_usage"] = get_gpu_usage
```

### 3. Use in UI

```JSON
{
  "command": "#monitor",
  "track": ["gpu_usage"]
}
```

* * *

## Design Rules

* Monitors are **read-only**
* Must not modify system state
* Must be safe for high-frequency calls
* Should avoid heavy computations
* Should return consistent types

* * *

## Difference from Commands

| Feature | Commands | Monitors |
| --- | --- | --- |
| Trigger type | UI / command string | HTTP POST request |
| Execution | Single function call | Batch execution |
| Arguments | Supported | Not supported |
| Output format | Any | JSON dict |
| Purpose | Actions / logic | Data retrieval |

* * *
---

## Placeholder Rules (Backend)

Commands may contain placeholders:

```
/echo Hello {name}
```

These are resolved before execution.

---

## Command Resolution Order

1. Parse message
2. Replace placeholders
3. Match command
4. Execute function
5. Return result

---

## Failure Handling

If no command is found:
- Command is ignored
- Empty response is returned
