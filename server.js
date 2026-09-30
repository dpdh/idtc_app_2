import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const webRoot = resolve(root, 'www');
const dataRoot = resolve(webRoot, 'data');
const maxBodyBytes = 24 * 1024;
const maxMessages = 12;
const maxToolRounds = 3;
const rateWindowMs = 60_000;
const requestBuckets = new Map();

function loadEnvFile() {
  let source = '';
  try { source = readFileSync(resolve(root, '.env'), 'utf8'); } catch { return; }
  source.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) return;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  });
}

loadEnvFile();

let userDatabase = null;
const databaseEnabled = Boolean(process.env.DATABASE_URL);
if (databaseEnabled) {
  const database = await import('./database/db.js');
  await database.initializeDatabase();
  userDatabase = await import('./database/user-service.js');
}

const providers = [
  { id: 'openai', label: 'OpenAI (GPT)', model: process.env.OPENAI_MODEL || 'gpt-4o-mini', configured: Boolean(process.env.OPENAI_API_KEY) },
  { id: 'gemini', label: 'Google Gemini', model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', configured: Boolean(process.env.GEMINI_API_KEY) },
  { id: 'compatible', label: process.env.COMPATIBLE_PROVIDER_NAME || 'OpenAI-compatible', model: process.env.COMPATIBLE_MODEL || '', configured: Boolean(process.env.COMPATIBLE_API_KEY && process.env.COMPATIBLE_BASE_URL) },
];

const toolDefinitions = [
  {
    name: 'search_digital_twin_knowledge',
    description: 'Cari FAQ lokal IDTC tentang Digital Twin, BIM, sensor, standar, dan teknologi konstruksi. Gunakan untuk pertanyaan faktual dan kutip referensi yang diberikan.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Istilah atau pertanyaan yang perlu dicari' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_learning_material',
    description: 'Cari jalur atau modul belajar Digital Twin yang relevan dan kembalikan judul serta ringkasan materi.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Topik materi yang dicari' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

const systemPrompt = [
  'Kamu adalah TwiniAI, asisten Digital Twin untuk komunitas IDTC.',
  'Jawab dalam Bahasa Indonesia kecuali pengguna meminta bahasa lain. Bersikap jelas, praktis, dan akui ketidakpastian.',
  'Untuk fakta tentang Digital Twin, BIM, standar, regulasi, sensor, atau materi belajar, gunakan tool pencarian yang tersedia sebelum menjawab.',
  'Jangan mengarang kutipan, nomor regulasi, status terkini, atau referensi. Jika sumber yang ditemukan tidak cukup, nyatakan batasnya dan sarankan pemeriksaan dokumen resmi.',
  'Jangan mengaku terhubung ke perangkat, data sensor live, akun, atau sistem operasi. Tools yang tersedia hanya membaca basis pengetahuan dan katalog materi lokal.',
  'Jangan menjalankan tindakan yang mengubah data atau sistem. Tools bersifat hanya-baca.',
].join(' ');

function normalize(value) {
  return String(value || '').toLocaleLowerCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value) {
  return normalize(value).split(/\s+/).filter(token => token.length > 1);
}

function readableText(value, limit = 5000) {
  const chunks = [];
  const visit = (item, depth = 0) => {
    if (chunks.join(' ').length >= limit || depth > 6 || item == null) return;
    if (typeof item === 'string' || typeof item === 'number') chunks.push(String(item));
    else if (Array.isArray(item)) item.forEach(child => visit(child, depth + 1));
    else if (typeof item === 'object') Object.values(item).forEach(child => visit(child, depth + 1));
  };
  visit(value);
  return chunks.join(' ').slice(0, limit);
}

async function readJson(name) {
  try { return JSON.parse(await readFile(resolve(dataRoot, name), 'utf8')); } catch { return null; }
}

async function buildKnowledge() {
  const [base, sensor, bim, curriculum] = await Promise.all([
    readJson('twini-ai.json'),
    readJson('twini-ai-sensors.json'),
    readJson('twini-ai-bim.json'),
    readJson('materi.json'),
  ]);
  const entries = [...(base?.entries || [])];
  (sensor?.categories || []).forEach(category => category.items.forEach((item, index) => entries.push({
    id: `sensor-${category.id}-${index + 1}`,
    category: `Sensor: ${category.name}`,
    question: item.q,
    keywords: [...(category.keywords || []), item.brands].filter(Boolean),
    answer: `${item.a}${item.brands ? ` Contoh merek/produk sejenis: ${item.brands}.` : ''}`,
  })));
  (bim?.categories || []).forEach(category => category.items.forEach((item, index) => {
    const referenceIds = item.references || category.references || [];
    const references = referenceIds.map(id => `[${id}] ${bim.references?.[id] || id}`);
    entries.push({
      id: `bim-${category.id}-${index + 1}`,
      category: `BIM: ${category.name}`,
      question: item.q,
      keywords: [...(category.keywords || []), ...referenceIds],
      answer: `${item.a}${references.length ? ` Referensi: ${references.join('; ')}.` : ''}`,
    });
  }));

  const lessons = [];
  (curriculum?.jalur || []).forEach(path => (path.modul || []).forEach(module => {
    const title = `${path.judul || path.nama || 'Materi'} / ${module.judul || 'Modul'}`;
    const content = readableText([module.ringkasan, module.deskripsi, module.konten], 4500);
    if (content) lessons.push({ title, content });
  }));
  return { entries, lessons };
}

const knowledge = await buildKnowledge();

function scoreText(query, text) {
  const queryTokens = [...new Set(tokens(query))];
  const candidateTokens = new Set(tokens(text));
  if (!queryTokens.length || !candidateTokens.size) return 0;
  const matched = queryTokens.filter(token => candidateTokens.has(token) || [...candidateTokens].some(candidate => candidate.length > 5 && token.length > 5 && candidate.slice(0, 5) === token.slice(0, 5))).length;
  const phraseBonus = normalize(text).includes(normalize(query)) ? 2 : 0;
  return matched / Math.sqrt(queryTokens.length * candidateTokens.size) + phraseBonus;
}

function searchEntries(query) {
  const ranked = knowledge.entries.map(entry => ({
    entry,
    score: scoreText(query, `${entry.question} ${(entry.keywords || []).join(' ')} ${entry.category}`),
  })).filter(result => result.score > 0.08).sort((a, b) => b.score - a.score).slice(0, 5);
  return ranked.map(({ entry }) => ({
    question: entry.question,
    category: entry.category,
    answer: entry.answer,
  }));
}

function searchLessons(query) {
  return knowledge.lessons.map(lesson => ({ lesson, score: scoreText(query, `${lesson.title} ${lesson.content}`) }))
    .filter(result => result.score > 0.08).sort((a, b) => b.score - a.score).slice(0, 3)
    .map(({ lesson }) => ({ title: lesson.title, excerpt: lesson.content.slice(0, 900) }));
}

function runTool(name, args = {}) {
  const query = String(args.query || '').trim().slice(0, 300);
  if (!query) return { results: [] };
  if (name === 'search_digital_twin_knowledge') return { results: searchEntries(query) };
  if (name === 'find_learning_material') return { results: searchLessons(query) };
  return { error: 'Tool tidak dikenal.' };
}

async function readBody(request, limit = maxBodyBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Permintaan terlalu besar.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
    throw Object.assign(new Error('Format JSON tidak valid.'), { status: 400 });
  }
}

function cleanMessages(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error('Riwayat percakapan tidak valid.'), { status: 400 });
  const messages = value.slice(-maxMessages).map(message => {
    const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
    const content = typeof message?.content === 'string' ? message.content.trim().slice(0, 3500) : '';
    return role && content ? { role, content } : null;
  }).filter(Boolean);
  if (!messages.length || messages.at(-1).role !== 'user') throw Object.assign(new Error('Pertanyaan terakhir harus berasal dari pengguna.'), { status: 400 });
  return messages;
}

function openAiTools() {
  return toolDefinitions.map(tool => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));
}

function geminiTools() {
  return [{ functionDeclarations: toolDefinitions.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: tool.parameters.type,
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    },
  })) }];
}

async function fetchJson(url, options) {
  let response;
  try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) }); } catch {
    throw Object.assign(new Error('Tidak dapat menghubungi provider AI.'), { status: 502 });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`AI provider returned HTTP ${response.status}`);
    throw Object.assign(new Error(`Provider AI menolak permintaan (HTTP ${response.status}).`), { status: 502 });
  }
  return payload;
}

function parseToolArgs(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function openAiChat(provider, messages) {
  const baseUrl = provider.id === 'compatible' ? process.env.COMPATIBLE_BASE_URL : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = provider.id === 'compatible' ? process.env.COMPATIBLE_API_KEY : process.env.OPENAI_API_KEY;
  const model = provider.model;
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const thread = [{ role: 'system', content: systemPrompt }, ...messages];
  for (let round = 0; round <= maxToolRounds; round += 1) {
    const result = await fetchJson(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: thread, tools: openAiTools(), tool_choice: 'auto', temperature: 0.2 }),
    });
    const assistant = result.choices?.[0]?.message;
    if (!assistant) throw Object.assign(new Error('Provider AI tidak mengembalikan jawaban.'), { status: 502 });
    if (!assistant.tool_calls?.length) return typeof assistant.content === 'string' ? assistant.content.trim() : '';
    thread.push(assistant);
    for (const call of assistant.tool_calls.slice(0, 4)) {
      const output = runTool(call.function?.name, parseToolArgs(call.function?.arguments));
      thread.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) });
    }
  }
  return 'Saya menemukan materi terkait, tetapi belum dapat menyusun jawaban akhir. Coba persempit pertanyaannya.';
}

async function geminiChat(provider, messages) {
  const key = process.env.GEMINI_API_KEY;
  const model = encodeURIComponent(provider.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const contents = messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  for (let round = 0; round <= maxToolRounds; round += 1) {
    const result = await fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: geminiTools(),
        generationConfig: { temperature: 0.2 },
      }),
    });
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const calls = parts.filter(part => part.functionCall?.name);
    if (!calls.length) return parts.map(part => part.text || '').join('').trim();
    contents.push(candidate.content);
    const functionResponses = calls.slice(0, 4).map(part => ({
      functionResponse: {
        name: part.functionCall.name,
        ...(part.functionCall.id ? { id: part.functionCall.id } : {}),
        response: runTool(part.functionCall.name, part.functionCall.args || {}),
      },
    }));
    contents.push({ role: 'user', parts: functionResponses });
  }
  return 'Saya menemukan materi terkait, tetapi belum dapat menyusun jawaban akhir. Coba persempit pertanyaannya.';
}

async function handleChat(request, response) {
  const body = await readBody(request);
  const provider = providers.find(item => item.id === body.provider);
  if (!provider) throw Object.assign(new Error('Provider AI tidak dikenal.'), { status: 400 });
  if (!provider.configured) throw Object.assign(new Error('Provider ini belum dikonfigurasi di server.'), { status: 503, code: 'provider_not_configured' });
  const messages = cleanMessages(body.messages);
  const answer = provider.id === 'gemini' ? await geminiChat(provider, messages) : await openAiChat(provider, messages);
  if (!answer) throw Object.assign(new Error('Provider AI mengembalikan jawaban kosong.'), { status: 502 });
  sendJson(response, 200, { answer, provider: provider.id, model: provider.model });
}

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  response.end(JSON.stringify(payload));
}

function sessionTokenFromRequest(request) {
  const cookie = request.headers.cookie || '';
  const item = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('idtc_session='));
  return item ? decodeURIComponent(item.slice('idtc_session='.length)) : '';
}

function sessionCookie(request, token, clear = false) {
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = process.env.NODE_ENV === 'production' || forwardedProtocol === 'https';
  let sameSite = process.env.SESSION_COOKIE_SAMESITE || 'Lax';
  if (sameSite.toLowerCase() === 'none' && !secure) sameSite = 'Lax';
  const maxAge = clear ? 0 : 60 * 60 * 24 * 30;
  return `idtc_session=${clear ? '' : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

async function databaseSession(request) {
  if (!databaseEnabled || !userDatabase) return null;
  return userDatabase.userForSession(sessionTokenFromRequest(request));
}

async function requireSuperAdmin(request, response) {
  const user = await databaseSession(request);
  if (!user) {
    sendJson(response, 401, { error: 'Silakan masuk dengan akun database.' });
    return null;
  }
  if (user.role !== 'super_admin') {
    sendJson(response, 403, { error: 'Akses ini khusus Super Admin.' });
    return null;
  }
  return user;
}

const authBuckets = new Map();
function authRateAllowed(request) {
  const now = Date.now();
  const key = request.socket.remoteAddress || 'unknown';
  const current = authBuckets.get(key) || { count: 0, resetAt: now + 15 * 60_000 };
  if (now >= current.resetAt) { current.count = 0; current.resetAt = now + 15 * 60_000; }
  current.count += 1;
  authBuckets.set(key, current);
  if (authBuckets.size > 5000) {
    for (const [ip, bucket] of authBuckets) if (now >= bucket.resetAt) authBuckets.delete(ip);
  }
  return current.count <= 12;
}

function requestAllowed(request, response) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const allowed = new Set((process.env.TWINI_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  const requestOrigin = `http://${request.headers.host}`;
  if (origin !== requestOrigin && !allowed.has(origin)) {
    sendJson(response, 403, { error: 'Origin tidak diizinkan.' });
    return false;
  }
  response.setHeader('access-control-allow-origin', origin);
  response.setHeader('access-control-allow-credentials', 'true');
  response.setHeader('vary', 'Origin');
  return true;
}

function withinRateLimit(request) {
  const now = Date.now();
  const key = request.socket.remoteAddress || 'unknown';
  const current = requestBuckets.get(key) || { count: 0, resetAt: now + rateWindowMs };
  if (now >= current.resetAt) { current.count = 0; current.resetAt = now + rateWindowMs; }
  current.count += 1;
  requestBuckets.set(key, current);
  if (requestBuckets.size > 5000) {
    for (const [ip, bucket] of requestBuckets) if (now >= bucket.resetAt) requestBuckets.delete(ip);
  }
  return current.count <= Math.max(1, Number(process.env.TWINI_RATE_LIMIT_PER_MINUTE) || 20);
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp',
};

async function serveStatic(request, response, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { sendJson(response, 400, { error: 'Path tidak valid.' }); return; }
  const target = resolve(webRoot, `.${decoded}`);
  if (target !== webRoot && !target.startsWith(`${webRoot}${sep}`)) { sendJson(response, 403, { error: 'Path tidak diizinkan.' }); return; }
  let file = target;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = resolve(file, 'index.html');
  } catch {
    if (extname(decoded)) { sendJson(response, 404, { error: 'File tidak ditemukan.' }); return; }
    file = resolve(webRoot, 'index.html');
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, {
      'content-type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end(); else response.end(content);
  } catch { sendJson(response, 404, { error: 'File tidak ditemukan.' }); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/') && !requestAllowed(request, response)) return;
  if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    response.writeHead(204, { 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600' });
    response.end();
    return;
  }
  if (url.pathname === '/api/auth/status' && request.method === 'GET') {
    const registration = databaseEnabled ? await userDatabase.registrationStatus() : { bootstrapRequired: false };
    sendJson(response, 200, {
      database: databaseEnabled,
      bootstrapRequired: databaseEnabled && registration.bootstrapRequired,
      registrationEnabled: process.env.PUBLIC_REGISTRATION !== 'false' || (databaseEnabled && registration.bootstrapRequired),
    });
    return;
  }
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await databaseSession(request);
    sendJson(response, 200, { database: databaseEnabled, user });
    return;
  }
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    if (!databaseEnabled) { sendJson(response, 503, { error: 'Database akun belum dikonfigurasi.' }); return; }
    if (!authRateAllowed(request)) { sendJson(response, 429, { error: 'Terlalu banyak percobaan. Coba lagi nanti.' }); return; }
    try {
      if (process.env.PUBLIC_REGISTRATION === 'false' && !(await userDatabase.registrationStatus()).bootstrapRequired) throw Object.assign(new Error('Pendaftaran publik sedang ditutup.'), { status: 403 });
      const result = await userDatabase.registerUser(await readBody(request, 4 * 1024 * 1024));
      sendJson(response, 201, { user: result.user }, { 'set-cookie': sessionCookie(request, result.token), 'cache-control': 'no-store' });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Akun tidak dapat dibuat.', code: error.code || 'registration_failed' });
    }
    return;
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    if (!databaseEnabled) { sendJson(response, 503, { error: 'Database akun belum dikonfigurasi.' }); return; }
    if (!authRateAllowed(request)) { sendJson(response, 429, { error: 'Terlalu banyak percobaan. Coba lagi nanti.' }); return; }
    try {
      const body = await readBody(request);
      const result = await userDatabase.loginUser(body.email, body.password);
      sendJson(response, 200, { user: result.user }, { 'set-cookie': sessionCookie(request, result.token), 'cache-control': 'no-store' });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Login gagal.', code: error.code || 'login_failed' });
    }
    return;
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    if (databaseEnabled) await userDatabase.revokeSession(sessionTokenFromRequest(request));
    sendJson(response, 200, { ok: true }, { 'set-cookie': sessionCookie(request, '', true), 'cache-control': 'no-store' });
    return;
  }
  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    if (!databaseEnabled) { sendJson(response, 503, { error: 'Database akun belum dikonfigurasi.' }); return; }
    try {
      const actor = await requireSuperAdmin(request, response);
      if (!actor) return;
      sendJson(response, 200, { users: await userDatabase.listUsers() });
    } catch { sendJson(response, 500, { error: 'Daftar akun tidak dapat dimuat.' }); }
    return;
  }
  if (url.pathname === '/api/admin/users' && request.method === 'POST') {
    if (!databaseEnabled) { sendJson(response, 503, { error: 'Database akun belum dikonfigurasi.' }); return; }
    try {
      const actor = await requireSuperAdmin(request, response);
      if (!actor) return;
      const user = await userDatabase.createManagedUser(await readBody(request), actor);
      sendJson(response, 201, { user });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Akun tidak dapat dibuat.' });
    }
    return;
  }
  const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})(?:\/role)?$/i);
  if (adminUserMatch && request.method === 'PATCH' && url.pathname.endsWith('/role')) {
    if (!databaseEnabled) { sendJson(response, 503, { error: 'Database akun belum dikonfigurasi.' }); return; }
    try {
      const actor = await requireSuperAdmin(request, response);
      if (!actor) return;
      const body = await readBody(request);
      const user = await userDatabase.updateUserRole(adminUserMatch[1], body.role, actor);
      sendJson(response, 200, { user });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Role akun tidak dapat diperbarui.' });
    }
    return;
  }
  if (adminUserMatch && request.method === 'DELETE' && !url.pathname.endsWith('/role')) {
    if (!databaseEnabled) { sendJson(response, 503, { error: 'Database akun belum dikonfigurasi.' }); return; }
    try {
      const actor = await requireSuperAdmin(request, response);
      if (!actor) return;
      sendJson(response, 200, await userDatabase.deleteUser(adminUserMatch[1], actor));
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Akun tidak dapat dihapus.' });
    }
    return;
  }
  if (url.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok', database: databaseEnabled, knowledgeEntries: knowledge.entries.length, learningModules: knowledge.lessons.length });
    return;
  }
  if (url.pathname === '/api/providers' && request.method === 'GET') {
    sendJson(response, 200, { defaultProvider: providers.find(provider => provider.id === process.env.TWINI_PROVIDER && provider.configured)?.id || providers.find(provider => provider.configured)?.id || 'local', providers: providers.map(({ id, label, model, configured }) => ({ id, label, model, configured })) });
    return;
  }
  if (url.pathname === '/api/chat' && request.method === 'POST') {
    if (!withinRateLimit(request)) { sendJson(response, 429, { error: 'Batas permintaan sementara tercapai. Coba lagi sebentar.' }); return; }
    try { await handleChat(request, response); } catch (error) {
      sendJson(response, error.status || 500, { error: error.message || 'Permintaan AI gagal.', code: error.code || 'chat_failed' });
    }
    return;
  }
  if (url.pathname.startsWith('/api/')) { sendJson(response, 404, { error: 'API endpoint tidak ditemukan.' }); return; }
  if (!['GET', 'HEAD'].includes(request.method)) { sendJson(response, 405, { error: 'Method tidak didukung.' }); return; }
  await serveStatic(request, response, url.pathname);
});

const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`TwiniAI server ready at http://${host}:${port}`));
