# Work Test Folder

This folder contains scripts and outputs for validating the MCP services and local inference server.

## What is tested

- Local MCP endpoint on `http://127.0.0.1:3000/mcp`
- Remote MCP endpoint on `https://great-tan.local.mcp-use.run/mcp`
- Local llama server port `15000`
- MCP tool metadata: `tools/list`
- MCP resource metadata: `resources/list`
- MCP prompt metadata: `prompts/list`

## Available scripts

- `run-all-tests.sh` — run every test and save output files under `results/`
- `test-system-services.sh` — check port availability and /mcp HEAD responses
- `test-local-mcp.sh` — validate local MCP endpoint
- `test-remote-mcp.sh` — validate remote MCP endpoint

## Server mapping

- `great_tan_local_mcp` → `https://great-tan.local.mcp-use.run/mcp`
- `influential_blue_local_mcp` → `https://influential-blue.local.mcp-use.run/mcp`
- `zombiecoder_remote_mcp` → `https://zombiecoder.my.id/mcp`
- `playwright_mcp` → `npx @playwright/mcp@latest`
- `llama-server` → local model inference on `http://127.0.0.1:15000`

## Tool names discovered

- `ask_zombie`
- `chat`
- `read_file`
- `write_file`
- `edit_file`
- `ls`
- `glob`
- `grep`
- `planning`
- `status`
- `search-tools`
- `get-fruit-details`
