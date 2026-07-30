const STORAGE_KEY = "misocho-v0";

const CATEGORIES = [
  { key: "setting", label: "設定", emoji: "⚙️", hint: "世界・舞台・ルール" },
  { key: "character", label: "キャラ", emoji: "👤", hint: "人物・感情・関係" },
  { key: "theme", label: "テーマ", emoji: "💡", hint: "問い・メッセージ・価値観" },
];

const app = document.getElementById("app");

const state = {
  items: loadItems(),
  current: null,
  search: "",
};

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch {
    // ignore
  }
}

function uid() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}


function categoryMeta(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
}

function itemsByCategory(category) {
  const q = state.search.trim().toLowerCase();
  return state.items
    .filter((x) => x.category === category)
    .filter((x) => (q ? x.body.toLowerCase().includes(q) : true))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function setItems(next) {
  state.items = next;
  saveItems();
  render();
}

function addItem(category, body) {
  const text = body.trim();
  if (!text) return;
  const now = new Date().toISOString();
  setItems([
    { id: uid(), category, body: text, createdAt: now, updatedAt: now },
    ...state.items,
  ]);
}

function updateItem(id, body) {
  const text = body.trim();
  if (!text) return;
  const now = new Date().toISOString();
  setItems(state.items.map((x) => (x.id === id ? { ...x, body: text, updatedAt: now } : x)));
}

function deleteItem(id) {
  if (!confirm("このメモを削除しますか？")) return;
  setItems(state.items.filter((x) => x.id !== id));
}

function goHome() {
  state.current = null;
  state.search = "";
  render();
}

function openCategory(category) {
  state.current = category;
  state.search = "";
  render();
}

function exportMarkdown() {
  const out = ["# みそ帖", ""];
  for (const c of CATEGORIES) {
    const list = state.items.filter((x) => x.category === c.key);
    if (!list.length) continue;
    out.push(`## ${c.label}`, "");
    for (const item of list) {
      out.push(item.body, "");
    }
  }
  return out.join("
");
}

function exportPlainText() {
  const out = ["みそ帖", ""];
  for (const c of CATEGORIES) {
    const list = state.items.filter((x) => x.category === c.key);
    if (!list.length) continue;
    out.push(`［${c.label}］`);
    for (const item of list) {
      out.push(item.body, "");
    }
  }
  return out.join("
");
}

function exportHtml() {
  const esc = escapeHtml;
  let html = `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>みそ帖</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;line-height:1.65;color:#111827}h1{font-size:28px;margin:0 0 16px}h2{margin:28px 0 10px} .item{padding:14px 0;border-bottom:1px solid #e5e7eb}.body{white-space:pre-wrap;color:#374151}</style></head><body><h1>みそ帖</h1>`;
  for (const c of CATEGORIES) {
    const list = state.items.filter((x) => x.category === c.key);
    if (!list.length) continue;
    html += `<h2>${esc(c.label)}</h2>`;
    for (const item of list) {
      html += `<div class="item"><div class="body">${esc(item.body)}</div></div>`;
    }
  }
  html += `</body></html>`;
  return html;
}

function download(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(text, label) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => alert(`${label}をコピーしました`));
    return;
  }
  alert("コピーに対応していませんでした。書き出しを使ってください。");
}

function render() {
  if (!state.current) {
    renderHome();
    return;
  }
  renderCategory();
}

function renderHome() {
  app.innerHTML = `
    <div class="screen">
      <header class="hero">
        <div class="pill">みそ帖</div>
        <h1>みそ帖</h1>
      </header>

      <section class="stack">
        ${CATEGORIES.map((c) => {
          const count = state.items.filter((x) => x.category === c.key).length;
          return `
            <button class="cat-card" data-open="${c.key}">
              <div class="cat-top">
                <div class="cat-emoji">${c.emoji}</div>
                <div class="cat-badge">${count}件</div>
              </div>
              <div class="cat-name">${c.label}</div>
              <div class="cat-hint">${c.hint}</div>
            </button>
          `;
        }).join("")}
      </section>


      <footer class="footer-actions">
        <button class="ghost-btn" id="exportMd">MD</button>
        <button class="ghost-btn" id="exportTxt">TXT</button>
        <button class="ghost-btn" id="exportHtml">HTML</button>
      </footer>
    </div>
  `;

  app.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openCategory(btn.dataset.open));
  });
  document.getElementById("exportMd").addEventListener("click", () => download("neta-memo.md", exportMarkdown(), "text/markdown;charset=utf-8"));
  document.getElementById("exportTxt").addEventListener("click", () => download("neta-memo.txt", exportPlainText()));
  document.getElementById("exportHtml").addEventListener("click", () => download("neta-memo.html", exportHtml(), "text/html;charset=utf-8"));
}

function renderCategory() {
  const meta = categoryMeta(state.current);
  const list = itemsByCategory(state.current);

  app.innerHTML = `
    <div class="screen">
      <header class="topbar">
        <button class="ghost-btn" id="backBtn">← 戻る</button>
        <div class="topbar-title">${meta.label}</div>
        <div class="topbar-right">
          <button class="ghost-btn" id="copyMd">MD</button>
          <button class="ghost-btn" id="copyTxt">TXT</button>
        </div>
      </header>

      <section class="compose-card">
        <div class="compose-label">新規メモ</div>
        <textarea id="draft" class="compose-input" placeholder="ここにメモを書く"></textarea>
        <div class="compose-actions">
          <button class="primary-btn" id="saveBtn">保存</button>
          <button class="ghost-btn" id="clearBtn">クリア</button>
        </div>
      </section>

      <section class="search-card">
        <div class="compose-label">検索</div>
        <div class="search-wrap">
          <span class="search-icon">🔎</span>
          <input id="search" class="search-input" type="text" placeholder="キーワードで検索" value="${escapeHtml(state.search)}" />
        </div>
      </section>

      <section class="list-head">
        <div>
          <div class="list-title">一覧</div>
          <div class="list-meta">${list.length}件</div>
        </div>
      </section>

      <section class="note-list">
        ${list.length ? list.map((item) => `
          <article class="note-card">
            <div class="note-head">
              <div class="note-main">
                <div class="note-title">${escapeHtml(preview(item.body) || "（無題）")}</div>
                <div class="note-body">${escapeHtml(item.body)}</div>
                <div class="note-date">${formatDate(item.updatedAt)}</div>
              </div>
              <div class="note-actions">
                <button class="icon-btn" data-edit="${item.id}" aria-label="編集">✎</button>
                <button class="icon-btn" data-delete="${item.id}" aria-label="削除">🗑</button>
              </div>
            </div>
          </article>
        `).join("") : `<div class="empty-card">まだメモがありません。</div>`}
      </section>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", goHome);
  document.getElementById("saveBtn").addEventListener("click", () => {
    const draft = document.getElementById("draft");
    addItem(state.current, draft.value);
    draft.value = "";
    draft.focus();
  });
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("draft").value = "";
  });
  document.getElementById("search").addEventListener("input", (e) => {
    state.search = e.target.value;
    render();
  });

  document.getElementById("copyMd").addEventListener("click", () => copyText(exportMarkdown(), "Markdown"));
  document.getElementById("copyTxt").addEventListener("click", () => copyText(exportPlainText(), "テキスト"));

  app.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.edit));
  });
  app.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteItem(btn.dataset.delete));
  });
}

function openEdit(id) {
  const item = state.items.find((x) => x.id === id);
  if (!item) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div>
          <div class="modal-title">編集</div>
          <div class="modal-sub">${categoryMeta(item.category).label}</div>
        </div>
        <button class="ghost-btn" id="closeEdit">✕</button>
      </div>
      <textarea id="editText" class="compose-input modal-input">${escapeHtml(item.body)}</textarea>
      <div class="compose-actions" style="justify-content:flex-end;">
        <button class="ghost-btn" id="deleteEdit">削除</button>
        <button class="primary-btn" id="saveEdit">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  modal.querySelector("#closeEdit").addEventListener("click", close);
  modal.querySelector("#saveEdit").addEventListener("click", () => {
    updateItem(id, modal.querySelector("#editText").value);
    close();
  });
  modal.querySelector("#deleteEdit").addEventListener("click", () => {
    close();
    deleteItem(id);
  });
}

render();
