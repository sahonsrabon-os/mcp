#!/usr/bin/env bash
set -Eeuo pipefail
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://127.0.0.1:3000/mcp"
mkdir -p "$WORK_DIR/results"

function run_rpc() {
  local name="$1"
  local body="$2"
  local out="$WORK_DIR/results/local-${name}.json"
  echo "Running local MCP ${name}..."
  curl -sS --max-time 15 -X POST "$URL" -H 'Content-Type: application/json' -d "$body" | tee "$out"
  echo " -> saved to $out"
}

curl -I --max-time 10 "$URL" | sed -n '1,6p'
run_rpc tools-list '{"jsonrpc":"2.0","id":"local-tools","method":"tools/list","params":{}}'
run_rpc resources-list '{"jsonrpc":"2.0","id":"local-resources","method":"resources/list","params":{}}'
run_rpc prompts-list '{"jsonrpc":"2.0","id":"local-prompts","method":"prompts/list","params":{}}'
