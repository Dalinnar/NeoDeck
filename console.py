"""
This file is used for debugging purposes and allows sending commands directly to the server
without the need for a web browser interface. It provides a convenient way to interact with
the server, test functionality, and troubleshoot issues during development.
"""

import requests
import socket
import json
import time

with open('.config/config.json', encoding="utf-8") as f:
    config = json.load(f)

