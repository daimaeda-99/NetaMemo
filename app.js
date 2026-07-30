(function () {
  var STORAGE_KEY = "misocho-v0";
  var CATEGORIES = [
    { key: "setting", label: "設定", emoji: "⚙️", hint: "世界・舞台・ルール" },
    { key: "character", label: "キャラ", emoji: "👤", hint: "人物・感情・関係" },
    { key: "theme", label: "テーマ", emoji: "💡", hint: "問い・メッセージ・価値観" }
  ];

  var app = document.getElementById("app");
  var state = {
    items: loadItems(),
    current: null,
    search: ""
  };

  window.onerror = function (message, source, lineno, colno, error) {
    showError(error || message || "不明なエラー");
    return true;
  };

  function loadItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (e) {}
  }

  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function esc(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  }

  function preview(text) {
    var parts = String(text || "").trim().split("\n");
    return parts.slice(0, 2).join(" ").slice(0, 80);
  }

  function categoryMeta(key) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i];
    }
    return CATEGORIES[0];
  }

  function itemsByCategory(category) {
    var q = state.search.trim().toLowerCase();
    return state.items
      .filter(function (x) { return x.category === category; })
      .filter(function (x) { return q ? String(x.body).toLowerCase().indexOf(q) !== -1 : true; })
      .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
  }

  function setItems(next) {
    state.items = next;
    saveItems();
    render();
  }

  function addItem(category, body) {
    var text = String(body || "").trim();
    if (!text) return;
    var now = new Date().toISOString();
    setItems([{ id: uid(), category: category, body: text, createdAt: now, updatedAt: now }].concat(state.items));
  }

  function updateItem(id, body) {
    var text = String(body || "").trim();
    if (!text) return;
    var now = new Date().toISOString();
    setItems(state.items.map(function (x) {
      return x.id === id ? { id: x.id, category: x.category, body: text, createdAt: x.createdAt, updatedAt: now } : x;
    }));
  }

  function deleteItem(id) {
    if (!confirm("このメモを削除しますか？")) return;
    setItems(state.items.filter(function (x) { return x.id !== id; }));
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
    var out = ["# みそ帖", ""];
    CATEGORIES.forEach(function (c) {
      var list = state.items.filter(function (x) { return x.category === c.key; });
      if (!list.length) return;
      out.push("## " + c.label, "");
      list.forEach(function (item) {
        out.push(String(item.body), "");
      });
    });
    return out.join("\n");
  }

  function exportPlainText() {
    var out = ["みそ帖", ""];
    CATEGORIES.forEach(function (c) {
      var list = state.items.filter(function (x) { return x.category === c.key; });
      if (!list.length) return;
      out.push("［" + c.label + "］");
      list.forEach(function (item) {
        out.push(String(item.body), "");
      });
    });
    return out.join("\n");
  }

  function exportHtml() {
    var html = '<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>みそ帖</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;line-height:1.65;color:#111827}h1{font-size:28px;margin:0 0 16px}h2{margin:28px 0 10px} .item{padding:14px 0;border-bottom:1px solid #e5e7eb}.body{white-space:pre-wrap;color:#374151}</style></head><body><h1>みそ帖</h1>';
    CATEGORIES.forEach(function (c) {
      var list = state.items.filter(function (x) { return x.category === c.key; });
      if (!list.length) return;
      html += '<h2>' + esc(c.label) + '</h2>';
      list.forEach(function (item) {
        html += '<div class="item"><div class="body">' + esc(item.body) + '</div></div>';
      });
    });
    html += '</body></html>';
    return html;
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        alert(label + "をコピーしました");
      });
      return;
    }
    alert("コピーに対応していませんでした。書き出しを使ってください。");
  }

  function showError(error) {
    app.innerHTML = [
      '<div class="screen">',
      '<div class="pill">みそ帖</div>',
      '<h1>読み込みエラー</h1>',
      '<div class="error-box">' + esc(error && error.message ? error.message : String(error)) + '</div>',
      '</div>'
    ].join('');
  }

  function render() {
    try {
      if (!state.current) {
        renderHome();
      } else {
        renderCategory();
      }
    } catch (e) {
      showError(e);
    }
  }

  function renderHome() {
    var html = [
      '<div class="screen">',
      '<header class="hero">',
      '<div class="pill">みそ帖</div>',
      '<h1>みそ帖</h1>',
      '</header>',
      '<section class="stack">'
    ];

    CATEGORIES.forEach(function (c) {
      var count = state.items.filter(function (x) { return x.category === c.key; }).length;
      html.push(
        '<button class="cat-card" data-open="' + c.key + '">',
        '<div class="cat-top">',
        '<div class="cat-emoji">' + c.emoji + '</div>',
        '<div class="cat-badge">' + count + '件</div>',
        '</div>',
        '<div class="cat-name">' + c.label + '</div>',
        '<div class="cat-hint">' + c.hint + '</div>',
        '</button>'
      );
    });

    html.push(
      '</section>',
      '<footer class="footer-actions">',
      '<button class="ghost-btn" id="exportMd">MD</button>',
      '<button class="ghost-btn" id="exportTxt">TXT</button>',
      '<button class="ghost-btn" id="exportHtml">HTML</button>',
      '</footer>',
      '</div>'
    );

    app.innerHTML = html.join('');
    app.querySelectorAll('[data-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { openCategory(btn.getAttribute('data-open')); });
    });
    document.getElementById('exportMd').addEventListener('click', function () { download('misocho.md', exportMarkdown(), 'text/markdown;charset=utf-8'); });
    document.getElementById('exportTxt').addEventListener('click', function () { download('misocho.txt', exportPlainText(), 'text/plain;charset=utf-8'); });
    document.getElementById('exportHtml').addEventListener('click', function () { download('misocho.html', exportHtml(), 'text/html;charset=utf-8'); });
  }

  function renderCategory() {
    var meta = categoryMeta(state.current);
    var list = itemsByCategory(state.current);
    var html = [
      '<div class="screen">',
      '<header class="topbar">',
      '<button class="ghost-btn" id="backBtn">← 戻る</button>',
      '<div class="topbar-title">' + meta.label + '</div>',
      '<div class="topbar-right">',
      '<button class="ghost-btn" id="copyMd">MD</button>',
      '<button class="ghost-btn" id="copyTxt">TXT</button>',
      '</div>',
      '</header>',
      '<section class="compose-card">',
      '<div class="compose-label">新規メモ</div>',
      '<textarea id="draft" class="compose-input" placeholder="ここにメモを書く"></textarea>',
      '<div class="compose-actions">',
      '<button class="primary-btn" id="saveBtn">保存</button>',
      '<button class="ghost-btn" id="clearBtn">クリア</button>',
      '</div>',
      '</section>',
      '<section class="search-card">',
      '<div class="compose-label">検索</div>',
      '<div class="search-wrap">',
      '<span class="search-icon">🔎</span>',
      '<input id="search" class="search-input" type="text" placeholder="キーワードで検索" value="' + esc(state.search) + '" />',
      '</div>',
      '</section>',
      '<section class="list-head">',
      '<div><div class="list-title">一覧</div><div class="list-meta">' + list.length + '件</div></div>',
      '</section>',
      '<section class="note-list">'
    ];

    if (list.length) {
      list.forEach(function (item) {
        html.push(
          '<article class="note-card">',
          '<div class="note-head">',
          '<div class="note-main">',
          '<div class="note-title">' + esc(preview(item.body) || '（無題）') + '</div>',
          '<div class="note-body">' + esc(item.body) + '</div>',
          '<div class="note-date">' + formatDate(item.updatedAt) + '</div>',
          '</div>',
          '<div class="note-actions">',
          '<button class="icon-btn" data-edit="' + item.id + '" aria-label="編集">✎</button>',
          '<button class="icon-btn" data-delete="' + item.id + '" aria-label="削除">🗑</button>',
          '</div>',
          '</div>',
          '</article>'
        );
      });
    } else {
      html.push('<div class="empty-card">まだメモがありません。</div>');
    }

    html.push('</section></div>');
    app.innerHTML = html.join('');

    document.getElementById('backBtn').addEventListener('click', goHome);
    document.getElementById('saveBtn').addEventListener('click', function () {
      var draft = document.getElementById('draft');
      addItem(state.current, draft.value);
      draft.value = '';
      draft.focus();
    });
    document.getElementById('clearBtn').addEventListener('click', function () {
      document.getElementById('draft').value = '';
    });
    document.getElementById('search').addEventListener('input', function (e) {
      state.search = e.target.value;
      render();
    });
    document.getElementById('copyMd').addEventListener('click', function () { copyText(exportMarkdown(), 'Markdown'); });
    document.getElementById('copyTxt').addEventListener('click', function () { copyText(exportPlainText(), 'テキスト'); });

    app.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openEdit(btn.getAttribute('data-edit')); });
    });
    app.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteItem(btn.getAttribute('data-delete')); });
    });
  }

  function openEdit(id) {
    var item = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) { item = state.items[i]; break; }
    }
    if (!item) return;

    var modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = [
      '<div class="modal">',
      '<div class="modal-head">',
      '<div><div class="modal-title">編集</div><div class="modal-sub">' + categoryMeta(item.category).label + '</div></div>',
      '<button class="ghost-btn" id="closeEdit">✕</button>',
      '</div>',
      '<textarea id="editText" class="compose-input modal-input"></textarea>',
      '<div class="compose-actions" style="justify-content:flex-end;">',
      '<button class="ghost-btn" id="deleteEdit">削除</button>',
      '<button class="primary-btn" id="saveEdit">保存</button>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    document.getElementById('editText').value = item.body;

    var close = function () { modal.remove(); };
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#closeEdit').addEventListener('click', close);
    modal.querySelector('#saveEdit').addEventListener('click', function () {
      updateItem(id, modal.querySelector('#editText').value);
      close();
    });
    modal.querySelector('#deleteEdit').addEventListener('click', function () {
      close();
      deleteItem(id);
    });
  }

  render();
})();
