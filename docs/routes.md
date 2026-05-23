# Routes

NeoDeck plugins can expose HTTP endpoints using Flask routes.

Routes allow plugins to:

* expose APIs
* provide dynamic folders
* return JSON data
* expose status endpoints
* communicate with frontend scripts
* create integration endpoints
* provide configuration/state data

Routes are registered using the plugin `Blueprint`.

* * *

# Basic Route Setup

Inside your plugin:

```Python
from flask import Blueprint

plugin = Blueprint("my_plugin", __name__)
```

Then register routes:

```Python
plugin.add_url_rule(
    "/my_plugin/hello",
    view_func=hello_page
)
```

* * *

# Simple Route Example

```Python
from flask import Response
import json

def hello_page():
    return Response(
        json.dumps({"message": "Hello"}),
        mimetype="application/json"
    )
```

* * *

# JSON Responses

Most NeoDeck routes return JSON.

Example:

```Python
from flask import jsonify

def status():
    return jsonify({
        "success": True,
        "message": "Plugin working"
    })
```

* * *

# Dynamic Folder Routes

Routes can generate dynamic folders/buttons.

Example:

```Python
def dynamic_folder():
    return jsonify({
        "success": True,
        "data": [
            {
                "name": "Button 1",
                "command": "/example"
            }
        ]
    })
```

These endpoints are commonly used for:

* dynamic devices
* media lists
* server lists
* scene-like systems
* generated actions
* live application data

* * *

# Status Endpoints

Status routes are useful for:

* connection checks
* service monitoring
* debugging
* settings pages

Example:

```Python
def check_connection():
    return jsonify({
        "success": True
    })
```

You can connect these routes to plugin settings:

```Python
plugin.settings = {
    "connection_status": {
        "type": "status",
        "endpoint": "/my_plugin/check_connection"
    }
}
```

* * *

# Route Files

Most plugins separate routes into their own file.

Example:

```
my_plugin/
├── __init__.py
├── routes.py
└── functions.py
```

Recommended separation:

| File | Purpose |
| --- | --- |
| `routes.py` | HTTP/API endpoints |
| `functions.py` | Logic/backend |
| `__init__.py` | Registration/setup |

* * *

# Accessing Plugin Functions

Routes usually call backend functions.

Example:

```Python
from my_plugin.functions import *

def get_data():
    return jsonify(fetch_data())
```

This keeps routes clean and easier to debug.

* * *

# Route Naming

Recommended naming pattern:

```
/plugin_name/action
```

Examples:

```
/music/play
/music/pause
/music/status
/music/devices
```

Avoid:

```
/test
/data
/api
```

because plugins may conflict with each other.

* * *

# Using Request Data

Routes can receive POST data or query parameters.

Example:

```Python
from flask import request

def update_value():
    data = request.json

    return jsonify({
        "received": data
    })
```

* * *

# Returning HTTP Status Codes

Example:

```Python
from flask import Response
import json

def check():
    return Response(
        json.dumps({"message": "Offline"}),
        status=503,
        mimetype="application/json"
    )
```

Common status codes:

| Code | Meaning |
| --- | --- |
| `200` | Success |
| `400` | Bad request |
| `401` | Unauthorized |
| `404` | Not found |
| `500` | Internal error |
| `503` | Service unavailable |

* * *

# Frontend Communication

Frontend scripts can call plugin routes directly.

Example:

```JavaScript
fetch("/my_plugin/status")
    .then(r => r.json())
    .then(console.log)
```

This is commonly used for:

* live state updates
* dynamic interfaces
* plugin dashboards
* device refresh systems

* * *

# Security Considerations

Routes execute inside the NeoDeck server.

Avoid:

* executing arbitrary user code
* exposing unrestricted filesystem access
* creating unrestricted shell endpoints
* allowing raw command execution from HTTP
* exposing secrets through APIs

Plugins should expose only the minimum required functionality.

* * *

# Route Registration Example

Minimal complete example:

```Python
from flask import Blueprint, jsonify

plugin = Blueprint("example", __name__)

def ping():
    return jsonify({
        "success": True
    })

plugin.add_url_rule(
    "/example/ping",
    view_func=ping
)
```

* * *

# Recommended Practices

Recommended:

* keep routes small
* move logic into functions
* return JSON consistently
* use proper status codes
* namespace routes properly
* validate user input
* separate frontend/backend logic

Avoid:

* massive route files
* blocking operations inside routes
* duplicated route names
* raw unrestricted APIs
* mixing UI rendering with backend logic