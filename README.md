# mcp

This repository contains the local MCP-based server environment for llama_cpp, including configuration files, server scripts, and a nested `my-mcp-server` web service.

## What is included

- `mcp-config.json` and `mcp-config-http.json` — server configuration
- `start-zombiecoder.sh` — startup script for the local service
- `doc/info.md` — project documentation and notes
- `my-mcp-server/` — TypeScript MCP server implementation and frontend files
- `system_prompt.txt` — default prompt content

## Getting started

1. Clone or download the repository.
2. Install dependencies for the nested server:
   ```bash
   cd my-mcp-server
   npm install
   ```
3. Configure your model paths and API settings.
4. Start the server using your preferred script or command.

## Notes

- Large runtime artifacts such as model files, runtime binaries, and logs are excluded from Git by `.gitignore`.
- Keep your `.env` credentials and local overrides out of source control.

## Recommended workflow

- Add or update model paths in `mcp-config.json` and `mcp-config-http.json`.
- Use `start-zombiecoder.sh` to launch the local service.
- See `doc/info.md` for detailed setup and usage instructions.

## License

This repository is licensed under the MIT License. See `LICENSE`.
