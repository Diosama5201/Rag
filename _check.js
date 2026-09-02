const API_BASE = 'http://127.0.0.1:8000';
const SESSION_KEY = 'nexus-rag-session-v1';
const MESSAGES_KEY = 'nexus-rag-messages-v1';

const $ = id => document.getElementById(id);
const messagesEl = $('messages');
const bootEl = $('boot');
const composer = $('composer');
const sendBtn = $('sendBtn');
const stopBtn = $('stopBtn');
const sessionChip = $('sessionChip');
const sessionIdEl = $('sessionId');
const livePill = $('livePill');
const liveText = $('liveText');
const clockEl = $('clock');
const connDot = $('connDot');
const connState = $('connState');
const connLat = $('connLat');
const footLeft = $('footLeft');
const searchInput = $('searchInput');
const searchBtn = $('searchBtn');
const docsEl = $('docs');
const fileInput = $('fileInput');
const fileLabel = $('fileLabel');
const dropzone = $('dropzone');
const uploadBtn = $('uploadBtn');
const uploadStatus = $('uploadStatus');

let messages = [];
let sessionId = '';
let activeController = null;
let activeMessageId = null;
const bubbleRefs = new Map();

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad2 = n => String(n).padStart(2, '0');
const timeText = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const genSession = () => 'WEB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

function initSession() {
  sessionId = localStorage.getItem(SESSION_KEY) || genSession();
  localStorage.setItem(SESSION_KEY, sessionId);
  sessionChip.textContent = sessionId;
  sessionIdEl.textContent = sessionId;
  sessionIdEl.title = '点击复制 SESSION ID';
}

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(MESSAGES_KEY) || 'null');
    if (saved && Array.isArray(saved.messages) && saved.messages.length) {
      messages = saved.messages.map(m => ({
        id: m.id || uid(),
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || ''),
        done: true,
        time: m.time || Date.now()
      }));
    }
  } catch (e) {
    messages = [];
  }
}

function persist() {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify({ sessionId, messages: messages.slice(-100) }));
  } catch (e) {}
}

function buildBubble(m) {
  const el = document.createElement('article');
  el.className = 'msg ' + m.role + (m.done ? '' : ' streaming');
  el.dataset.id = m.id;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = m.role === 'user' ? 'YOU' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const role = document.createElement('span');
  role.className = 'role';
  role.textContent = m.role === 'user' ? 'OPERATOR' : 'NEXUS AI';
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = timeText(m.time || Date.now());
  const status = document.createElement('span');
  status.className = 'status';
  status.textContent = m.done ? (m.role === 'user' ? 'SENT' : 'DONE') : 'LINKING...';
  status.classList.add(m.role === 'user' ? 'st-ok' : 'st-busy');
  meta.append(role, time, status);

  const content = document.createElement('div');
  content.className = 'content';
  content.textContent = m.content || '';

  let caret = null;
  if (m.role === 'assistant' && !m.done) {
    caret = document.createElement('span');
    caret.className = 'caret';
  }

  bubble.append(meta, content);
  if (caret) bubble.append(caret);
  el.append(avatar, bubble);

  return { el, bubble, content, status, time, caret };
}

function renderMessages() {
  messagesEl.querySelectorAll('.msg').forEach(n => n.remove());
  bubbleRefs.clear();
  bootEl.classList.toggle('hidden', messages.length > 0);
  messages.forEach(m => {
    const refs = buildBubble(m);
    messagesEl.appendChild(refs.el);
    bubbleRefs.set(m.id, refs);
  });
  if (messages.length) scrollBottom(true);
  else startBoot();
}

function addMessage(role, content, done) {
  const m = { id: uid(), role, content: content || '', time: Date.now(), done: !!done };
  messages.push(m);
  bootEl.classList.add('hidden');
  const refs = buildBubble(m);
  messagesEl.appendChild(refs.el);
  bubbleRefs.set(m.id, refs);
  scrollBottom(true);
  return m;
}

function scrollBottom(force) {
  const near = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 140;
  if (force || near) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendMessage(raw) {
  if (activeMessageId) return;
  const q = (raw === undefined ? composer.value : raw).trim();
  if (!q) return;
  composer.value = '';
  resizeComposer();
  addMessage('user', q, true);
  const aiMsg = addMessage('assistant', '', false);
  persist();
  runStream(q, aiMsg);
}

function runStream(input, aiMsg) {
  activeMessageId = aiMsg.id;
  activeController = new AbortController();
  const refs = bubbleRefs.get(aiMsg.id);
  let target = '';
  let shown = 0;
  let streamDone = false;
  let closed = false;
  let timer = null;
  const startTs = Date.now();

  const setStatus = (text, cls) => { refs.status.textContent = text; refs.status.className = 'status ' + cls; };
  const removeCaret = () => { if (refs.caret) { refs.caret.remove(); refs.caret = null; } };
  const unlock = () => {
    activeMessageId = null;
    activeController = null;
    sendBtn.disabled = false;
    stopBtn.hidden = true;
    refs.el.classList.remove('streaming');
  };

  const tick = () => {
    if (closed) return;
    const backlog = target.length - shown;
    if (backlog > 0) {
      const step = backlog > 160 ? 3 : (backlog > 60 ? 2 : 1);
      shown = Math.min(target.length, shown + step);
      refs.content.textContent = target.slice(0, shown);
      scrollBottom(false);
      timer = setTimeout(tick, backlog > 160 ? 6 : 18);
    } else if (streamDone) {
      finish();
    } else {
      timer = setTimeout(tick, 40);
    }
  };

  const appendChunk = chunk => {
    if (!chunk || closed) return;
    target += chunk;
    if (timer === null) timer = setTimeout(tick, 0);
  };

  const finish = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    refs.content.textContent = target;
    aiMsg.content = target;
    aiMsg.done = true;
    aiMsg.time = Date.now();
    setStatus('DONE · ' + ((Date.now() - startTs) / 1000).toFixed(1) + 'S', 'st-ok');
    removeCaret();
    unlock();
    footLeft.textContent = 'READY // AWAITING INPUT';
    persist();
    scrollBottom(true);
  };

  const fail = err => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    const halted = err && err.name === 'AbortError';
    if (!target) {
      refs.content.textContent = halted ? '▮ 传输已中止。' : ('⚠ 无法连接后端：' + (err && err.message ? err.message : '未知错误'));
      aiMsg.content = refs.content.textContent;
    } else if (!halted) {
      refs.content.textContent = target + '\n\n⚠ ' + (err && err.message ? err.message : '传输中断');
      aiMsg.content = refs.content.textContent;
    } else {
      refs.content.textContent = target;
      aiMsg.content = target;
    }
    aiMsg.done = true;
    aiMsg.time = Date.now();
    setStatus(halted ? 'HALTED' : 'ERROR', halted ? 'st-busy' : 'st-err');
    removeCaret();
    unlock();
    footLeft.textContent = halted ? 'STREAM HALTED' : 'LINK ERROR';
    persist();
    scrollBottom(true);
  };

  sendBtn.disabled = true;
  stopBtn.hidden = false;
  setStatus('LINKING...', 'st-busy');
  footLeft.textContent = 'TRANSMITTING // STREAMING';
  timer = setTimeout(tick, 120);

  fetchStream({ input, session_id: sessionId }, activeController.signal, appendChunk)
    .then(() => { streamDone = true; })
    .catch(fail);
}

async function fetchStream(payload, signal, onChunk) {
  const res = await fetch(API_BASE + '/api/chat_stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (e) {}
    throw new Error('HTTP ' + res.status + (detail ? ' · ' + detail.slice(0, 160) : ''));
  }
  if (!res.body) throw new Error('当前浏览器不支持流式读取');
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let openEvent = false;
  const handleLine = line => {
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line.startsWith('data:')) {
      onChunk(line.slice(5));
      openEvent = true;
    } else if (line === '') {
      openEvent = false;
    } else if (openEvent) {
      onChunk('\n' + line);
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      handleLine(line);
    }
  }
  if (buffer) handleLine(buffer);
}function resizeComposer() {
  composer.style.height = 'auto';
  composer.style.height = Math.min(composer.scrollHeight, 170) + 'px';
}

function setOnline(online, ms) {
  livePill.classList.toggle('online', online);
  livePill.classList.toggle('offline', !online);
  liveText.textContent = online ? 'LINK ONLINE' : 'LINK OFFLINE';
  connDot.classList.toggle('online', online);
  connDot.classList.toggle('offline', !online);
  connState.textContent = online ? 'ONLINE' : 'OFFLINE';
  connLat.textContent = online ? (ms + ' ms') : '--';
}

async function ping() {
  connState.textContent = 'PROBING...';
  connLat.textContent = '...';
  const t0 = performance.now();
  try {
    await fetch(API_BASE + '/docs', { cache: 'no-store' });
    setOnline(true, Math.round(performance.now() - t0));
    return true;
  } catch (e) {
    setOnline(false, null);
    return false;
  }
}

const BOOT_LINES = [
  '> INITIALIZING NEXUS RAG INTERFACE...',
  '> LINK :: http://127.0.0.1:8000',
  '> VECTOR STORE :: CHROMA ["rag"]',
  '> EMBEDDING :: text-embedding-v2',
  '> CHAT MODEL :: qwen3-max',
  '> AWAITING TRANSMISSION...'
];
let bootTimer = null;
function startBoot() {
  const term = $('bootTerm');
  term.innerHTML = '';
  clearTimeout(bootTimer);
  let li = 0;
  let ch = 0;
  let lineEl = document.createElement('div');
  term.appendChild(lineEl);
  const type = () => {
    if (li >= BOOT_LINES.length) { bootTimer = null; return; }
    const line = BOOT_LINES[li];
    if (ch < line.length) {
      lineEl.textContent = line.slice(0, ++ch);
      bootTimer = setTimeout(type, 20);
    } else {
      const done = document.createElement('div');
      done.textContent = line;
      done.className = 'ok';
      term.replaceChild(done, lineEl);
      li += 1;
      ch = 0;
      lineEl = document.createElement('div');
      term.appendChild(lineEl);
      bootTimer = setTimeout(type, 80);
    }
  };
  type();
}

const QUICK_PROMPTS = [
  '知识库中现在有哪些资料？',
  '请总结知识库的核心内容',
  '介绍一下你自己',
  '如何检索已上传的文档？',
  '知识库最近更新了什么？',
  '用要点说明向量检索流程'
];
function renderQuick() {
  const grid = $('quickGrid');
  grid.innerHTML = '';
  QUICK_PROMPTS.forEach(q => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quick-chip';
    b.textContent = q;
    b.addEventListener('click', () => { composer.value = q; resizeComposer(); composer.focus(); });
    grid.appendChild(b);
  });
}

function tickClock() {
  const d = new Date();
  clockEl.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function setUploadStatus(text, cls) {
  uploadStatus.textContent = text;
  uploadStatus.className = 'status-line ' + cls;
}

async function uploadFile(file) {
  setUploadStatus('UPLOADING // EMBEDDING...', 'st-busy');
  uploadBtn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(API_BASE + '/api/upload', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || ('HTTP ' + res.status));
    setUploadStatus(data.message || 'INJECTED OK', 'st-ok');
    fileInput.value = '';
    fileLabel.textContent = '拖入 / 点击选择 TXT 注入知识库';
  } catch (e) {
    setUploadStatus('ERROR :: ' + e.message, 'st-err');
  } finally {
    uploadBtn.disabled = false;
  }
}

function setDocsMessage(text, isErr) {
  docsEl.innerHTML = '';
  const p = document.createElement('div');
  p.className = isErr ? 'doc-item err' : 'doc-empty';
  p.textContent = text;
  docsEl.appendChild(p);
}

function renderDocs(docs) {
  if (!docs || !docs.length) { setDocsMessage('未命中相关文档'); return; }
  docsEl.innerHTML = '';
  docs.forEach((doc, i) => {
    const meta = doc.metadata || {};
    const item = document.createElement('div');
    item.className = 'doc-item';
    const head = document.createElement('div');
    head.className = 'doc-head';
    const idx = document.createElement('b');
    idx.textContent = String(i + 1).padStart(2, '0');
    const src = document.createElement('span');
    src.textContent = meta.source || 'UNKNOWN SOURCE';
    head.append(idx, src);
    const body = document.createElement('p');
    const txt = String(doc.content || '').replace(/\s+/g, ' ').trim();
    body.textContent = txt.length > 180 ? txt.slice(0, 180) + '…' : txt;
    const foot = document.createElement('div');
    foot.className = 'doc-foot';
    foot.textContent = meta.create_time || '';
    item.append(head, body, foot);
    docsEl.appendChild(item);
  });
}

function setSearchBusy(b) {
  searchBtn.disabled = b;
  searchBtn.textContent = b ? 'SEARCHING...' : '⌕ SEARCH';
}

async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) { setDocsMessage('请输入检索词', true); return; }
  setSearchBusy(true);
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: q, session_id: sessionId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || ('HTTP ' + res.status));
    renderDocs(data.docs || []);
  } catch (e) {
    setDocsMessage('ERROR :: ' + e.message, true);
  } finally {
    setSearchBusy(false);
  }
}

const fxCanvas = $('fx');
const fxCtx = fxCanvas.getContext('2d');
let particles = [];
function resizeFx() { fxCanvas.width = innerWidth; fxCanvas.height = innerHeight; seedFx(); }
function seedFx() {
  const count = Math.min(90, Math.max(30, Math.floor(fxCanvas.width / 18)));
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * fxCanvas.width,
      y: Math.random() * fxCanvas.height,
      vx: (Math.random() - .5) * .4,
      vy: (Math.random() - .5) * .4,
      r: .5 + Math.random() * 1.5,
      c: '0,240,255'
    });
  }
  for (let i = 0; i < Math.floor(count / 5); i++) particles[i].c = '255,45,120';
}
function drawFx() {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) p.x = fxCanvas.width + 10;
    if (p.x > fxCanvas.width + 10) p.x = -10;
    if (p.y < -10) p.y = fxCanvas.height + 10;
    if (p.y > fxCanvas.height + 10) p.y = -10;
    fxCtx.beginPath();
    fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    fxCtx.fillStyle = 'rgba(' + p.c + ',.55)';
    fxCtx.fill();
  }
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 12100) {
        const alpha = (1 - Math.sqrt(d2) / 110) * .12;
        fxCtx.beginPath();
        fxCtx.moveTo(a.x, a.y);
        fxCtx.lineTo(b.x, b.y);
        fxCtx.strokeStyle = 'rgba(0,240,255,' + alpha + ')';
        fxCtx.lineWidth = 1;
        fxCtx.stroke();
      }
    }
  }
  requestAnimationFrame(drawFx);
}

function buildTicker() {
  const text = 'REC ● LIVE CHANNEL   ·   PORT 8000   ·   MODEL QWEN3-MAX   ·   EMBED TEXT-EMBEDDING-V2   ·   VECTOR DB CHROMA   ·   TOP_K 4   ·   NEXUS RAG CONSOLE   ·   AUTHORIZED ACCESS';
  const track = $('tickerTrack');
  track.innerHTML = '';
  for (let i = 0; i < 2; i++) {
    const s = document.createElement('span');
    s.textContent = text;
    track.appendChild(s);
  }
}

function newSession() {
  if (activeController) activeController.abort();
  sessionId = genSession();
  localStorage.setItem(SESSION_KEY, sessionId);
  sessionChip.textContent = sessionId;
  sessionIdEl.textContent = sessionId;
  messages = [];
  renderMessages();
  persist();
  footLeft.textContent = 'NEW SESSION INITIALIZED';
}

function clearView() {
  if (activeController) activeController.abort();
  messages = [];
  renderMessages();
  persist();
  footLeft.textContent = 'VIEW CLEARED // HISTORY PRESERVED';
}

function init() {
  initSession();
  loadMessages();
  buildTicker();
  renderQuick();
  renderMessages();
  resizeComposer();
  resizeFx();
  drawFx();
  tickClock();
  setInterval(tickClock, 1000);

  composer.addEventListener('input', resizeComposer);
  composer.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', () => sendMessage());
  stopBtn.addEventListener('click', () => { if (activeController) activeController.abort(); });
  $('pingBtn').addEventListener('click', ping);
  $('newSessionBtn').addEventListener('click', newSession);
  $('clearBtn').addEventListener('click', clearView);
  searchBtn.addEventListener('click', runSearch);
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); runSearch(); }
  });
  sessionIdEl.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sessionId)
        .then(() => { footLeft.textContent = 'SESSION ID COPIED'; })
        .catch(() => {});
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) {
      fileLabel.textContent = 'FILE :: ' + f.name;
      uploadStatus.textContent = f.size ? (Math.max(1, Math.round(f.size / 1024)) + ' KB · READY') : 'READY';
      uploadStatus.className = 'status-line st-busy';
    }
  });
  ['dragover', 'dragenter'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
  uploadBtn.addEventListener('click', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) {
      setUploadStatus('请先选择 TXT 文件', 'st-err');
      return;
    }
    uploadFile(f);
  });

  window.addEventListener('resize', resizeFx);
  window.addEventListener('beforeunload', persist);

  ping();
  setInterval(ping, 25000);
  composer.focus();
}

document.addEventListener('DOMContentLoaded', init);
