import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTEL_DIR = path.join(__dirname, '../intel');
const MEMORY_FILE = path.join(__dirname, '../eddie/memory/MEMORY.md');
const WATCHLIST_FILE = path.join(INTEL_DIR, 'watchlist.json');
const CUSTOM_FILE = path.join(INTEL_DIR, 'custom-sources.json');
const PORT = 3131;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadDrafts(date: string) {
  const filePath = path.join(INTEL_DIR, 'drafts', date, 'drafts.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function appendMemory(entry: string) {
  fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
  const existing = fs.existsSync(MEMORY_FILE)
    ? fs.readFileSync(MEMORY_FILE, 'utf-8')
    : '# Eddie Memory\n';
  fs.writeFileSync(MEMORY_FILE, `${existing.trimEnd()}\n\n${entry}\n`);
}

function serveStatic(res: http.ServerResponse, file = 'index.html') {
  const htmlPath = path.join(__dirname, 'public', file);
  if (!fs.existsSync(htmlPath)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(htmlPath));
}

function loadSources() {
  const themes = fs.existsSync(WATCHLIST_FILE)
    ? JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf-8'))
    : [];
  const custom = fs.existsSync(CUSTOM_FILE)
    ? JSON.parse(fs.readFileSync(CUSTOM_FILE, 'utf-8'))
    : { topics: [], sources: [] };
  return { themes, topics: custom.topics ?? [], sources: custom.sources ?? [] };
}

function saveSources(body: { themes?: unknown; topics?: unknown; sources?: unknown }) {
  if (body.themes !== undefined) {
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(body.themes, null, 2));
  }
  if (body.topics !== undefined || body.sources !== undefined) {
    const current = fs.existsSync(CUSTOM_FILE)
      ? JSON.parse(fs.readFileSync(CUSTOM_FILE, 'utf-8'))
      : { topics: [], sources: [] };
    if (body.topics !== undefined) current.topics = body.topics;
    if (body.sources !== undefined) current.sources = body.sources;
    fs.writeFileSync(CUSTOM_FILE, JSON.stringify(current, null, 2));
  }
}

function listDraftDates(): string[] {
  const draftsDir = path.join(INTEL_DIR, 'drafts');
  if (!fs.existsSync(draftsDir)) return [];
  return fs.readdirSync(draftsDir)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && fs.existsSync(path.join(draftsDir, d, 'drafts.json')))
    .sort()
    .reverse();
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Static pages
  if (req.method === 'GET' && url.pathname === '/') return serveStatic(res, 'index.html');
  if (req.method === 'GET' && url.pathname === '/sources') return serveStatic(res, 'sources.html');

  // GET /api/drafts
  if (req.method === 'GET' && url.pathname === '/api/drafts') {
    const date = url.searchParams.get('date') ?? today();
    const drafts = loadDrafts(date);
    if (!drafts) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `No drafts found for ${date}. Run Eddie first.` }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(drafts));
  }

  // GET /api/dates
  if (req.method === 'GET' && url.pathname === '/api/dates') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(listDraftDates()));
  }

  // GET /api/sources
  if (req.method === 'GET' && url.pathname === '/api/sources') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(loadSources()));
  }

  // POST /api/sources — save updated sources
  if (req.method === 'POST' && url.pathname === '/api/sources') {
    try {
      const body = JSON.parse(await readBody(req));
      saveSources(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Bad request' }));
    }
  }

  // POST /api/feedback
  if (req.method === 'POST' && url.pathname === '/api/feedback') {
    try {
      const { platform, angle, source_brief, action, original, edited, note } = JSON.parse(await readBody(req));
      const date = today();
      let entry = '';

      if (action === 'approve') {
        entry = `## ${date} · APPROVED · ${platform}\n**Angle:** ${angle}\n**Source:** ${source_brief}\n→ Style worked as-is. Reinforce this approach.`;
      } else if (action === 'edit') {
        entry = `## ${date} · EDITED · ${platform}\n**Angle:** ${angle}\n**Source:** ${source_brief}\n**Original:**\n${original}\n**Edited to:**\n${edited}\n→ Prefer the edited version. Study the difference.`;
      } else if (action === 'reject') {
        entry = `## ${date} · REJECTED · ${platform}\n**Angle:** ${angle}\n**Source:** ${source_brief}${note ? `\n**Note:** ${note}` : ''}\n→ This angle/approach did not land. Avoid repeating it.`;
      }

      if (entry) appendMemory(entry);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Bad request' }));
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\nReview server running → http://localhost:${PORT}\n`);
});
