// ============================================================
//  AI Code Assistant — app.js
//  OpenRouter API · model: stepfun/step-3.5-flash:free
//  API key stored in localStorage
// ============================================================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL              = "stepfun/step-3.5-flash:free";
const LS_API_KEY         = "openrouter_api_key";

// ── DOM refs ─────────────────────────────────────────────────
const codeInput        = document.getElementById("codeInput");
const analyseBtn       = document.getElementById("analyseBtn");
const clearBtn         = document.getElementById("clearBtn");
const copyBtn          = document.getElementById("copyResultBtn");
const languageSelect   = document.getElementById("languageSelect");
const resultSection    = document.getElementById("resultSection");
const resultContent    = document.getElementById("resultContent");
const emptyState       = document.getElementById("emptyState");
const statusBadge      = document.getElementById("statusBadge");
const lineCount        = document.getElementById("lineCount");
const charCount        = document.getElementById("charCount");
const themeToggle      = document.getElementById("themeToggle");
const tabBtns          = document.querySelectorAll(".tab-btn");
const settingsBtn      = document.getElementById("settingsBtn");
const settingsModal    = document.getElementById("settingsModal");
const modalOverlay     = document.getElementById("modalOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const apiKeyInput      = document.getElementById("apiKeyInput");
const toggleKeyVisBtn  = document.getElementById("toggleKeyVisBtn");
const saveKeyBtn       = document.getElementById("saveKeyBtn");
const clearKeyBtn      = document.getElementById("clearKeyBtn");
const keyStatusEl      = document.getElementById("keyStatus");
const keyIndicator     = document.getElementById("keyIndicator");

let currentTab = "analysis";
let lastResult = { analysis: "", fixed: "", explanation: "" };

// ── Init ──────────────────────────────────────────────────────
(function init() {
  updateStats();
  syncKeyIndicator();
})();

// ── Theme ─────────────────────────────────────────────────────
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("light-theme");
  themeToggle.querySelector("span").textContent =
    document.documentElement.classList.contains("light-theme") ? "☀" : "◑";
});

// ── Live stats ────────────────────────────────────────────────
codeInput.addEventListener("input", updateStats);
function updateStats() {
  const text  = codeInput.value;
  const lines = text === "" ? 0 : text.split("\n").length;
  lineCount.textContent = `${lines} line${lines !== 1 ? "s" : ""}`;
  charCount.textContent = `${text.length} chars`;
}

// ── Tabs ──────────────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("tab-active"));
    btn.classList.add("tab-active");
    currentTab = btn.dataset.tab;
    renderTab();
  });
});

function renderTab() {
  const content = lastResult[currentTab] || "";
  if (!content) {
    resultContent.innerHTML = `<p class="placeholder-msg">Run an analysis first to see results here.</p>`;
    return;
  }
  if (currentTab === "fixed") {
    resultContent.innerHTML = `<pre class="result-code">${escapeHtml(content)}</pre>`;
  } else {
    resultContent.innerHTML = formatMarkdown(content);
  }
}

// ── Clear ─────────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  codeInput.value = "";
  updateStats();
  lastResult = { analysis: "", fixed: "", explanation: "" };
  resultSection.classList.add("hidden");
  emptyState.style.display = "flex";
  setStatus("idle", "");
});

// ── Copy ──────────────────────────────────────────────────────
copyBtn.addEventListener("click", () => {
  const text = lastResult[currentTab];
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "✓ Copied!";
    setTimeout(() => (copyBtn.textContent = "⎘ Copy"), 1800);
  });
});

// ── Status badge ──────────────────────────────────────────────
function setStatus(type, msg) {
  statusBadge.className = "status-badge status-" + type;
  statusBadge.textContent = msg;
  statusBadge.style.display = msg ? "inline-flex" : "none";
}

// ── Settings modal ────────────────────────────────────────────
settingsBtn.addEventListener("click",     openModal);
modalOverlay.addEventListener("click",    closeModal);
closeSettingsBtn.addEventListener("click", closeModal);

function openModal() {
  const saved = localStorage.getItem(LS_API_KEY) || "";
  apiKeyInput.value = saved;
  apiKeyInput.type  = "password";
  toggleKeyVisBtn.textContent = "👁";
  settingsModal.classList.remove("hidden");
  modalOverlay.classList.remove("hidden");
  setTimeout(() => apiKeyInput.focus(), 60);
}

function closeModal() {
  settingsModal.classList.add("hidden");
  modalOverlay.classList.add("hidden");
  keyStatusEl.style.display = "none";
}

// Toggle visibility
toggleKeyVisBtn.addEventListener("click", () => {
  const show = apiKeyInput.type === "password";
  apiKeyInput.type = show ? "text" : "password";
  toggleKeyVisBtn.textContent = show ? "🙈" : "👁";
});

// Save
saveKeyBtn.addEventListener("click", saveKey);
apiKeyInput.addEventListener("keydown", e => { if (e.key === "Enter") saveKey(); });

function saveKey() {
  const key = apiKeyInput.value.trim();
  if (!key) { showKeyStatus("error", "Please paste your OpenRouter API key."); return; }
  if (!key.startsWith("sk-or-")) {
    showKeyStatus("error", "Key must start with  sk-or-…");
    return;
  }
  localStorage.setItem(LS_API_KEY, key);
  showKeyStatus("success", "✓ Key saved to localStorage!");
  syncKeyIndicator();
  setTimeout(closeModal, 1100);
}

// Clear
clearKeyBtn.addEventListener("click", () => {
  localStorage.removeItem(LS_API_KEY);
  apiKeyInput.value = "";
  showKeyStatus("warn", "Key removed from localStorage.");
  syncKeyIndicator();
});

function showKeyStatus(type, msg) {
  keyStatusEl.textContent  = msg;
  keyStatusEl.className    = "key-status key-" + type;
  keyStatusEl.style.display = "block";
  setTimeout(() => { keyStatusEl.style.display = "none"; }, 3200);
}

function syncKeyIndicator() {
  const has = !!localStorage.getItem(LS_API_KEY);
  keyIndicator.textContent = has ? "🔑 Key saved" : "⚠ No API key";
  keyIndicator.className   = "key-indicator " + (has ? "has-key" : "no-key");
}

// ── Analyse ───────────────────────────────────────────────────
analyseBtn.addEventListener("click", analyseCode);

async function analyseCode() {
  const code = codeInput.value.trim();
  if (!code) { shake(codeInput); return; }

  const apiKey = localStorage.getItem(LS_API_KEY);
  if (!apiKey) {
    openModal();
    showKeyStatus("error", "Enter your OpenRouter API key first.");
    return;
  }

  const lang = languageSelect.value || "auto";

  // Loading state
  analyseBtn.disabled = true;
  analyseBtn.innerHTML = `<span class="spinner"></span> Analysing…`;
  setStatus("loading", "⟳ Thinking…");
  resultSection.classList.remove("hidden");
  emptyState.style.display = "none";
  resultContent.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  const systemPrompt = `You are an expert code review assistant. You MUST respond with a single valid JSON object only — absolutely no markdown fences, no prose outside the JSON. Use exactly these four keys:
{
  "analysis": "Thorough analysis of what the code does, any style/logic/complexity issues",
  "bugs": ["Array of specific bugs or issues — empty array if none found"],
  "fixed": "The complete corrected and improved version of the full code",
  "explanation": "Clear step-by-step explanation of every change made and why"
}
Always return the full fixed code even when there are no bugs — improve clarity, naming, and efficiency.`;

  const userPrompt = `Language: ${lang}\n\nCode to review:\n\`\`\`\n${code}\n\`\`\``;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "AI Code Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Invalid API key — please check your key in Settings.");
      if (res.status === 402) throw new Error("Insufficient OpenRouter credits. Top up at openrouter.ai.");
      if (res.status === 429) throw new Error("Rate limit hit. Wait a moment and try again.");
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data    = await res.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // Safely strip any accidental markdown fences
    const clean = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(clean);

    let analysisText = (parsed.analysis || "").trim();
    if (parsed.bugs && parsed.bugs.length > 0) {
      analysisText += "\n\n**Bugs / Issues Found:**\n" +
        parsed.bugs.map(b => `• ${b}`).join("\n");
    } else {
      analysisText += "\n\n✓ No bugs detected — code looks clean!";
    }

    lastResult.analysis    = analysisText;
    lastResult.fixed       = (parsed.fixed || code).trim();
    lastResult.explanation = (parsed.explanation || "No explanation provided.").trim();

    const count = parsed.bugs?.length || 0;
    setStatus("success", `✓ Done — ${count} issue${count !== 1 ? "s" : ""} found`);
    renderTab();

  } catch (err) {
    console.error("[OpenRouter error]", err);
    setStatus("error", "✗ Error");
    resultContent.innerHTML = `<div class="error-msg">⚠ ${escapeHtml(err.message)}</div>`;
    lastResult = { analysis: "", fixed: "", explanation: "" };
  } finally {
    analyseBtn.disabled = false;
    analyseBtn.innerHTML = `<span class="btn-icon">◈</span> Analyse Code`;
  }
}

// ── Utilities ─────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, `<code class="inline-code">$1</code>`)
    .replace(/^• (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function shake(el) {
  el.classList.add("shake");
  el.addEventListener("animationend", () => el.classList.remove("shake"), { once: true });
}
