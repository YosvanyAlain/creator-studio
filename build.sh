#!/bin/sh
# Package xdc-src/ into the .xdc files and the browser demo.
exec python3 "$(dirname "$0")/build.py"
