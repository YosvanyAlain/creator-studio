#!/bin/sh
# Builds both .xdc packages and the browser demo from src/.
exec python3 "$(dirname "$0")/build.py" "$@"
