#!/usr/bin/env bash
# Builds the web bundle locally and ships it to the VPS.
#
# Building here rather than on the server is deliberate: Metro wants around a
# gigabyte of RAM, which a small VPS may not have to spare.
set -euo pipefail

HOST="${DEPLOY_HOST:-72.smixa.ru}"
USER="${DEPLOY_USER:-root}"
TARGET="/var/www/72.smixa.ru"

echo "==> Building"
npm run build:web

if [ ! -f dist/index.html ] || [ ! -f dist/sw.js ]; then
    echo "FAIL: dist/ is missing index.html or sw.js — the build did not complete." >&2
    exit 1
fi

echo "==> Uploading to ${USER}@${HOST}:${TARGET}"
# --delete removes files from previous builds; without it, stale hashed
# bundles accumulate forever.
rsync -avz --delete dist/ "${USER}@${HOST}:${TARGET}/"

echo "==> Done: https://${HOST}"
