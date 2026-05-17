#!/usr/bin/env node

const LOCAL_MCP = 'http://127.0.0.1:3000/mcp';

async function rpcCall(id, method, params) {
  const payload = { jsonrpc: '2.0', id, method, params };
  const res = await fetch(LOCAL_MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'invalid-json', text };
  }
}

async function main() {
  console.log('Local MCP host:', LOCAL_MCP);

  console.log('\n1) tools/list');
  console.log(JSON.stringify(await rpcCall('test-tools', 'tools/list', {}), null, 2));

  console.log('\n2) ask_zombie with empty payload');
  console.log(JSON.stringify(await rpcCall('test-ask', 'tools/call', { name: 'ask_zombie', arguments: {} }), null, 2));

  console.log('\n3) chat with empty payload');
  console.log(JSON.stringify(await rpcCall('test-chat', 'tools/call', { name: 'chat', arguments: {} }), null, 2));
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
