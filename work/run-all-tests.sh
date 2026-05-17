#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
./test-system-services.sh
./test-local-mcp.sh
./test-remote-mcp.sh
