#!/usr/bin/env bash
set -Eeuo pipefail
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$WORK_DIR/results"

echo "Checking local service ports..."
ss -ltnp 2>/dev/null | grep -E ':3000|:15000' || true

echo
for url in "http://127.0.0.1:3000/mcp" "https://great-tan.local.mcp-use.run/mcp"; do
  echo "HEAD $url"
  curl -I --max-time 10 "$url" | sed -n '1,6p' || true
  echo
done
