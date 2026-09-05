#!/bin/bash
cd "$(dirname "$0")"
command -v node    >/dev/null 2>&1 && exec node    serve.js
command -v python3 >/dev/null 2>&1 && exec python3 serve.py
command -v python  >/dev/null 2>&1 && exec python  serve.py
echo "Neither Node.js nor Python found. Install Node from https://nodejs.org"
read -r -p "Press enter to close."
