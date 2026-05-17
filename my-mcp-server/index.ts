import { MCPServer, text, object, widget } from "mcp-use/server";
import { z } from "zod";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";

const __dirname = import.meta.dirname;
const WORKSPACE = process.env.WORKSPACE || "/home/sahon/dev/llama_cpp";

// ===== MONITORING SYSTEM =====
interface ToolCallLog {
  ts: string;
  tool: string;
  durationMs: number;
}
class Monitor {
  toolCalls: ToolCallLog[] = [];
  MAX = 200;
  startTime = Date.now();

  logCall(tool: string, durationMs: number) {
    this.toolCalls.unshift({ ts: new Date().toISOString(), tool, durationMs });
    if (this.toolCalls.length > this.MAX) this.toolCalls.length = this.MAX;
  }

  htmlDashboard(sessions: string[]) {
    const rows = this.toolCalls.slice(0, 30).map((c) =>
      `<tr><td>${c.ts.slice(11, 19)}</td><td>${c.tool}</td><td>${c.durationMs}ms</td></tr>`
    ).join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ZombieCoder Monitor</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui,sans-serif; background:#0d1117; color:#c9d1d9; padding:20px; }
h1 { color:#58a6ff; font-size:1.5rem; margin-bottom:8px; }
.status-bar { display:flex; gap:20px; margin:16px 0; flex-wrap:wrap; }
.card { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; flex:1; min-width:200px; }
.card h3 { color:#8b949e; font-size:.8rem; text-transform:uppercase; margin-bottom:4px; }
.card .val { font-size:1.8rem; font-weight:700; }
.card .val.green { color:#3fb950; }
.card .val.blue { color:#58a6ff; }
.card .val.yellow { color:#d29922; }
table { width:100%; border-collapse:collapse; margin-top:8px; font-size:.85rem; }
th { text-align:left; color:#8b949e; border-bottom:1px solid #30363d; padding:8px 4px; }
td { padding:6px 4px; border-bottom:1px solid #21262d; }
.section { margin-top:24px; }
.section h2 { color:#58a6ff; font-size:1.1rem; margin-bottom:8px; }
a { color:#58a6ff; }
.footer { margin-top:24px; padding-top:16px; border-top:1px solid #30363d; font-size:.8rem; color:#8b949e; }
pre { background:#0d1117; padding:8px; border-radius:4px; overflow-x:auto; font-size:.8rem; }
</style></head>
<body>
<h1>🧟 ZombieCoder MCP Monitor</h1>
<div class="status-bar">
  <div class="card"><h3>Uptime</h3><div class="val blue">${Math.floor((Date.now()-this.startTime)/60000)}m ${Math.floor(((Date.now()-this.startTime)%60000)/1000)}s</div></div>
  <div class="card"><h3>Active Editors</h3><div class="val ${sessions.length > 0 ? "green" : ""}">${sessions.length}</div></div>
  <div class="card"><h3>Tools Called</h3><div class="val yellow">${this.toolCalls.length}</div></div>
  <div class="card"><h3>Remote</h3><div class="val" style="font-size:.9rem">zombiecoder.my.id</div></div>
</div>

<div class="section">
<h2>👤 Connected Editors (${sessions.length})</h2>
${sessions.length ? sessions.map(s => `<div>• ${s}</div>`).join("\n") : '<p style="color:#8b949e">No editors currently connected</p>'}
</div>

<div class="section">
<h2>📋 Recent Tool Calls <a href="/status.json" style="font-weight:400;font-size:.8rem">[JSON]</a></h2>
${this.toolCalls.length ? `<table><tr><th>Time</th><th>Tool</th><th>Duration</th></tr>${rows}</table>` : '<p style="color:#8b949e">No tool calls yet</p>'}
</div>

<div class="section">
<h2>🔧 Available Tools (12)</h2>
<pre>ask_zombie  read_file   write_file  edit_file   ls
glob        grep        planning    chat        status
search-tools  get-fruit-details</pre>
</div>

<div class="footer">
  <p>Server: <a href="/mcp">/mcp</a> · <a href="/inspector">Inspector</a> · <a href="/status.json">Status JSON</a></p>
  <p>Remote: <a href="https://zombiecoder.my.id">zombiecoder.my.id</a> (Inspector) · <a href="https://lama.zombiecoder.my.id">lama.zombiecoder.my.id</a> (llama.cpp)</p>
  <p>Local: <a href="http://localhost:3000">http://localhost:3000</a></p>
</div>
</body></html>`;
  }
}

const monitor = new Monitor();

// ===== SERVER SETUP =====
const server = new MCPServer({
  name: "my-mcp-server",
  title: "my-mcp-server",
  version: "1.0.0",
  description: "ZombieCoder MCP server with 11 tools + live monitoring",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

// ===== MCP MIDDLEWARE: Track tool call timing =====
server.use("mcp:tools/call", async (_ctx: any, next: any) => {
  const start = Date.now();
  try {
    const result = await next();
    monitor.logCall("(tools/call)", Date.now() - start);
    return result;
  } catch (e: any) {
    monitor.logCall("(error)", Date.now() - start);
    throw e;
  }
});

// ===== CUSTOM HTTP ROUTES (Hono) =====
function getSessions() {
  try { return server.getActiveSessions(); } catch { return []; }
}
function sessionSummary() {
  const sessions = getSessions();
  return {
    uptime: process.uptime(),
    activeSessions: sessions.length,
    sessionIds: sessions,
    recentCalls: monitor.toolCalls.slice(0, 30).map(c => ({ ...c, ts: c.ts.slice(11, 19) })),
    totalCalls: monitor.toolCalls.length,
    timestamp: new Date().toISOString(),
  };
}
server.app.get("/status", (c: any) => c.html(monitor.htmlDashboard(getSessions())));
server.app.get("/status.json", (c: any) => c.json(sessionSummary()));

// ===== ZOMBIECODER LLM TOOL =====
async function askLlama(messages: { role: string; content: string }[]) {
  const systemPromptPath = join(WORKSPACE, "system_prompt.txt");
  const system = existsSync(systemPromptPath) ? readFileSync(systemPromptPath, "utf-8") : "You are a helpful AI assistant.";
  const res = await fetch("http://localhost:15000/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "Llama-3.2-1B-Instruct-UD-Q5_K_XL.gguf",
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`llama.cpp error: ${await res.text()}`);
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || "(no response)";
}

server.tool({
  name: "ask_zombie",
  description: "ZombieCoder AI কে কিছু জিজ্ঞাসা করুন (llama.cpp চালু থাকতে হবে)",
  schema: z.object({ message: z.string().optional().default("hello").describe("আপনার প্রশ্ন") }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
}, async ({ message }) => {
  const safeMessage = message?.toString().trim() || "hello";
  return text(await askLlama([{ role: "user", content: safeMessage }]));
});

server.tool({
  name: "chat",
  description: "ZombieCoder-এর সাথে মাল্টি-টার্ন চ্যাট করুন",
  schema: z.object({
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional().default([]),
    message: z.string().optional().default("hello").describe("নতুন বার্তা"),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
}, async ({ history, message }) => {
  const safeMessage = message?.toString().trim() || "hello";
  const safeHistory = history ?? [];
  return text(await askLlama([...safeHistory.slice(-10), { role: "user", content: safeMessage }]));
});

// ===== FILE SYSTEM TOOLS =====
server.tool({
  name: "read_file",
  description: "Read a file from the workspace",
  schema: z.object({ path: z.string().describe("File path relative to workspace") }),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ path }) => {
  const fullPath = resolve(WORKSPACE, path);
  if (!fullPath.startsWith(WORKSPACE)) return text("Error: Path outside workspace");
  if (!existsSync(fullPath)) return text(`Error: File not found: ${path}`);
  const content = readFileSync(fullPath, "utf-8");
  return text(content);
});

server.tool({
  name: "write_file",
  description: "Write content to a file (creates or overwrites)",
  schema: z.object({
    path: z.string().describe("File path relative to workspace"),
    content: z.string().describe("File content"),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
}, async ({ path, content }) => {
  const fullPath = resolve(WORKSPACE, path);
  if (!fullPath.startsWith(WORKSPACE)) return text("Error: Path outside workspace");
  writeFileSync(fullPath, content, "utf-8");
  return text(`Written ${content.length} bytes to ${path}`);
});

server.tool({
  name: "edit_file",
  description: "Find and replace text in a file",
  schema: z.object({
    path: z.string().describe("File path relative to workspace"),
    oldString: z.string().describe("Text to find"),
    newString: z.string().describe("Replacement text"),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
}, async ({ path, oldString, newString }) => {
  const fullPath = resolve(WORKSPACE, path);
  if (!fullPath.startsWith(WORKSPACE)) return text("Error: Path outside workspace");
  if (!existsSync(fullPath)) return text(`Error: File not found: ${path}`);
  let content = readFileSync(fullPath, "utf-8");
  if (!content.includes(oldString)) return text(`Error: oldString not found in ${path}`);
  content = content.replace(oldString, newString);
  writeFileSync(fullPath, content, "utf-8");
  return text(`Edited: replaced "${oldString}" -> "${newString}"`);
});

server.tool({
  name: "ls",
  description: "List files and directories in a path",
  schema: z.object({ path: z.string().optional().default(".").describe("Directory path relative to workspace") }),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ path }) => {
  const fullPath = resolve(WORKSPACE, path);
  if (!fullPath.startsWith(WORKSPACE)) return text("Error: Path outside workspace");
  if (!existsSync(fullPath)) return text(`Error: Path not found: ${path}`);
  const entries = readdirSync(fullPath);
  const lines = entries.map((e) => {
    const s = statSync(join(fullPath, e));
    const type = s.isDirectory() ? "📁" : s.isFile() ? "📄" : "🔗";
    const size = s.isFile() ? `${(s.size / 1024).toFixed(1)}KB` : "";
    return `${type} ${e}${size ? ` (${size})` : ""}`;
  });
  return text(lines.join("\n"));
});

server.tool({
  name: "glob",
  description: "Find files matching a glob pattern",
  schema: z.object({ pattern: z.string().describe("Glob pattern (e.g. **/*.ts, **/*.json)") }),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ pattern }) => {
  const { globSync } = await import("glob");
  const files = globSync(pattern, { cwd: WORKSPACE, nodir: true });
  if (files.length === 0) return text("No files found");
  return text(files.map((f) => `📄 ${f}`).join("\n"));
});

server.tool({
  name: "grep",
  description: "Search file contents for a pattern",
  schema: z.object({
    pattern: z.string().describe("Search pattern (string or regex)"),
    include: z.string().optional().describe("File glob pattern (e.g. *.ts, *.md)"),
  }),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ pattern, include }) => {
  const { globSync } = await import("glob");
  const files = include
    ? globSync(include, { cwd: WORKSPACE, nodir: true })
    : globSync("**/*", { cwd: WORKSPACE, nodir: true, ignore: "node_modules/**" });

  const results: string[] = [];
  const re = new RegExp(pattern, "i");
  for (const f of files.slice(0, 50)) {
    try {
      const content = readFileSync(join(WORKSPACE, f), "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          results.push(`${f}:${i + 1}: ${lines[i].trim().slice(0, 120)}`);
        }
      }
    } catch {}
  }
  if (results.length === 0) return text("No matches found");
  return text(results.join("\n"));
});

// ===== PLANNING / TODO TOOL =====
interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
}
const TODO_FILE = join(WORKSPACE, ".todos.json");

function loadTodos(): TodoItem[] {
  if (!existsSync(TODO_FILE)) return [];
  return JSON.parse(readFileSync(TODO_FILE, "utf-8"));
}
function saveTodos(todos: TodoItem[]) {
  writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2), "utf-8");
}

server.tool({
  name: "planning",
  description: "Manage TODO/planning items — create, list, update, delete",
  schema: z.object({
    action: z.enum(["create", "list", "update", "delete"]).optional().default("list").describe("কী করতে চান"),
    id: z.string().optional().describe("Todo ID (update/delete-এর জন্য)"),
    content: z.string().optional().describe("Todo content (create/update-এর জন্য)"),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("স্ট্যাটাস"),
    priority: z.enum(["high", "medium", "low"]).optional().describe("প্রায়োরিটি"),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
}, async ({ action, id, content, status, priority }) => {
  let todos = loadTodos();
  if (action === "create") {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      content: content || "(no description)",
      status: "pending",
      priority: priority || "medium",
    };
    todos.push(newTodo);
    saveTodos(todos);
    return text(`✅ Created: ${newTodo.id}\n${newTodo.content} [${newTodo.priority}]`);
  }
  if (action === "list") {
    if (todos.length === 0) return text("📋 No todos");
    return text(todos.map((t) =>
      `${t.status === "completed" ? "✅" : t.status === "in_progress" ? "🔄" : "⬜"} ${t.id}: ${t.content} [${t.priority}]`
    ).join("\n"));
  }
  if (action === "update") {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx === -1) return text(`Error: Todo ${id} not found`);
    if (content) todos[idx].content = content;
    if (status) todos[idx].status = status;
    if (priority) todos[idx].priority = priority;
    saveTodos(todos);
    return text(`✅ Updated ${id}: ${todos[idx].content} [${todos[idx].status}]`);
  }
  if (action === "delete") {
    todos = todos.filter((t) => t.id !== id);
    saveTodos(todos);
    return text(`✅ Deleted ${id}`);
  }
  return text("Invalid action");
});

// ===== STATUS TOOL =====
server.tool({
  name: "status",
  description: "Show MCP server status: connected editors, recent tool calls, uptime",
  schema: z.object({}),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => {
  const sessions = getSessions();
  const recent = monitor.toolCalls.slice(0, 10);
  const lines: string[] = [];
  lines.push(`🧟 ZombieCoder MCP Status`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Uptime: ${Math.floor((Date.now()-monitor.startTime)/60000)}m ${Math.floor(((Date.now()-monitor.startTime)%60000)/1000)}s`);
  lines.push(`Active Editors: ${sessions.length}`);
  lines.push(`Total Tool Calls: ${monitor.toolCalls.length}`);
  lines.push(``);
  if (sessions.length > 0) {
    lines.push(`👤 Connected:`);
    for (const s of sessions) { lines.push(`  • ${s.slice(0, 12)}`); }
  } else {
    lines.push(`👤 No editors currently connected`);
  }
  lines.push(``);
  if (recent.length > 0) {
    lines.push(`📋 Recent calls:`);
    for (const c of recent) { lines.push(`  ${c.ts.slice(11, 19)} ${c.tool} — ${c.durationMs}ms`); }
  } else {
    lines.push(`📋 No tool calls yet`);
  }
  lines.push(``);
  lines.push(`🔗 Remote:`);
  lines.push(`  • Inspector: https://zombiecoder.my.id/`);
  lines.push(`  • llama.cpp: https://lama.zombiecoder.my.id/`);
  lines.push(`  • MCP: http://localhost:3000/mcp`);
  return text(lines.join("\n"));
});

// ===== FRUITS (original demo tools) =====
const fruits = [
  { fruit: "mango", color: "bg-[#FBF1E1] dark:bg-[#FBF1E1]/10" },
  { fruit: "pineapple", color: "bg-[#f8f0d9] dark:bg-[#f8f0d9]/10" },
  { fruit: "cherries", color: "bg-[#E2EDDC] dark:bg-[#E2EDDC]/10" },
  { fruit: "coconut", color: "bg-[#fbedd3] dark:bg-[#fbedd3]/10" },
  { fruit: "apricot", color: "bg-[#fee6ca] dark:bg-[#fee6ca]/10" },
  { fruit: "blueberry", color: "bg-[#e0e6e6] dark:bg-[#e0e6e6]/10" },
  { fruit: "grapes", color: "bg-[#f4ebe2] dark:bg-[#f4ebe2]/10" },
  { fruit: "watermelon", color: "bg-[#e6eddb] dark:bg-[#e6eddb]/10" },
  { fruit: "orange", color: "bg-[#fdebdf] dark:bg-[#fdebdf]/10" },
  { fruit: "avocado", color: "bg-[#ecefda] dark:bg-[#ecefda]/10" },
  { fruit: "apple", color: "bg-[#F9E7E4] dark:bg-[#F9E7E4]/10" },
  { fruit: "pear", color: "bg-[#f1f1cf] dark:bg-[#f1f1cf]/10" },
  { fruit: "plum", color: "bg-[#ece5ec] dark:bg-[#ece5ec]/10" },
  { fruit: "banana", color: "bg-[#fdf0dd] dark:bg-[#fdf0dd]/10" },
  { fruit: "strawberry", color: "bg-[#f7e6df] dark:bg-[#f7e6df]/10" },
  { fruit: "lemon", color: "bg-[#feeecd] dark:bg-[#feeecd]/10" },
];

const fruitRowSchema = z.object({ fruit: z.string(), color: z.string() });

server.tool({
  name: "search-tools",
  description: "Search for fruits and display the results in a visual widget",
  schema: z.object({ query: z.string().optional().describe("Search query to filter fruits") }),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  outputSchema: z.object({ query: z.string(), results: z.array(fruitRowSchema) }),
  widget: { name: "product-search-result", invoking: "Searching...", invoked: "Results loaded" },
}, async ({ query }) => {
  const results = fruits.filter((f) => !query || f.fruit.toLowerCase().includes(query.toLowerCase()));
  await new Promise((r) => setTimeout(r, 2000));
  return widget({
    props: { query: query ?? "", results },
    output: text(`Found ${results.length} fruits matching "${query ?? "all"}"`),
  });
});

server.tool({
  name: "get-fruit-details",
  description: "Get detailed information about a specific fruit",
  schema: z.object({ fruit: z.string().describe("The fruit name") }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  outputSchema: z.object({ fruit: z.string(), color: z.string(), facts: z.array(z.string()) }),
}, async ({ fruit }) => {
  const found = fruits.find((f) => f.fruit?.toLowerCase() === fruit?.toLowerCase());
  return object({
    fruit: found?.fruit ?? fruit,
    color: found?.color ?? "unknown",
    facts: [`${fruit} is a delicious fruit`, `Color: ${found?.color ?? "unknown"}`],
  });
});

server.listen().then(() => console.log(`🧟 ZombieCoder MCP running on port ${server.getServerPort()}`));
