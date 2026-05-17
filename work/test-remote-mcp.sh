#!/usr/bin/env bash
set -Eeuo pipefail
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
URL="https://great-tan.local.mcp-use.run/mcp"
mkdir -p "$WORK_DIR/results"

function run_rpc() {
  local name="$1"
  local body="$2"
  local out="$WORK_DIR/results/remote-${name}.json"
  echo "Running remote MCP ${name}..."
  curl -sS --max-time 20 -X POST "$URL" -H 'Content-Type: application/json' -d "$body" | tee "$out"
  echo " -> saved to $out"
}

curl -I --max-time 10 "$URL" | sed -n '1,6p'
run_rpc tools-list '{"jsonrpc":"2.0","id":"remote-tools","method":"tools/list","params":{}}'
run_rpc resources-list '{"jsonrpc":"2.0","id":"remote-resources","method":"resources/list","params":{}}'
run_rpc prompts-list '{"jsonrpc":"2.0","id":"remote-prompts","method":"prompts/list","params":{}}'
