#!/bin/bash
export DISPLAY=:99
cd /usr/lib/node_modules/9router
exec node cli.js --host 0.0.0.0 --no-browser --tray
