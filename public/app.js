const messagesViewport = document.getElementById("messagesViewport");
const chatThread = document.getElementById("chatThread");
const welcomeContainer = document.getElementById("welcomeContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const sidebar = document.getElementById("sidebar");
const historyItemsContainer = document.getElementById("historyItemsContainer");

const STORAGE_KEY = "nu_gpt_chat_sessions";
let allSessions = [];
let currentSessionId = null;
let currentMessages = [];

// Muat riwayat dari localStorage saat aplikasi dibuka
initApp();

function initApp() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      allSessions = JSON.parse(stored);
    } catch {
      allSessions = [];
    }
  }
  renderHistoryUI();
  startNewChat();
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
}

function renderHistoryUI() {
  historyItemsContainer.innerHTML = "";

  if (allSessions.length === 0) {
    historyItemsContainer.innerHTML = `
      <div style="font-size: 0.8rem; color: #6b7280; padding: 12px 8px; text-align: center;">
        Belum ada obrolan tersimpan
      </div>
    `;
    return;
  }

  allSessions.forEach(session => {
    const item = document.createElement("div");
    item.className = `history-item ${session.id === currentSessionId ? "active" : ""}`;
    
    item.innerHTML = `
      <i class="ri-chat-3-line"></i>
      <span class="history-title" title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</span>
      <button class="delete-chat-btn" title="Hapus Obrolan" onclick="deleteSession(event, '${session.id}')">
        <i class="ri-delete-bin-line"></i>
      </button>
    `;

    item.onclick = (e) => {
      if (e.target.closest(".delete-chat-btn")) return;
      loadSession(session.id);
    };

    historyItemsContainer.appendChild(item);
  });
}

function startNewChat() {
  currentSessionId = null;
  currentMessages = [];
  chatThread.innerHTML = "";
  welcomeContainer.style.display = "block";
  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;
  renderHistoryUI();
  userInput.focus();
}

function loadSession(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;

  currentSessionId = session.id;
  currentMessages = [...session.messages];

  chatThread.innerHTML = "";
  welcomeContainer.style.display = "none";

  // Render semua balon chat dari sesi terpilih
  currentMessages.forEach(msg => {
    appendMessage(msg.content, msg.role);
  });

  renderHistoryUI();
  scrollToBottom();
}

function deleteSession(e, sessionId) {
  e.stopPropagation();
  allSessions = allSessions.filter(s => s.id !== sessionId);
  saveSessions();

  if (currentSessionId === sessionId) {
    startNewChat();
  } else {
    renderHistoryUI();
  }
}

userInput.addEventListener("input", () => {
  sendBtn.disabled = !userInput.value.trim();
});

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
}

function toggleSidebar() {
  sidebar.classList.toggle("open");
}

function useQuickPrompt(text) {
  userInput.value = text;
  sendBtn.disabled = false;
  sendMessage();
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  if (welcomeContainer.style.display !== "none") {
    welcomeContainer.style.display = "none";
  }

  // Tampilkan balon user
  appendMessage(text, "user");
  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;

  // Jika ini pesan pertama di obrolan baru, buat sesi baru
  if (!currentSessionId) {
    currentSessionId = "session_" + Date.now();
    const sessionTitle = text.length > 28 ? text.slice(0, 28) + "..." : text;
    allSessions.unshift({
      id: currentSessionId,
      title: sessionTitle,
      messages: []
    });
  }

  currentMessages.push({ role: "user", content: text });

  // Update pesan ke sesi lokal
  const activeSession = allSessions.find(s => s.id === currentSessionId);
  if (activeSession) {
    activeSession.messages = [...currentMessages];
    saveSessions();
    renderHistoryUI();
  }

  const botBubble = appendMessage('<i class="ri-loader-4-line ri-spin"></i> Sedang Mempersiapkan Jawaban...', "assistant");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: currentMessages })
    });

    const data = await res.json();
    const replyText = data.reply || "Afwan, silakan kirim ulang pertanyaan Anda.";

    botBubble.innerHTML = marked.parse(replyText);
    currentMessages.push({ role: "assistant", content: replyText });

    // Simpan balasan bot ke storage
    if (activeSession) {
      activeSession.messages = [...currentMessages];
      saveSessions();
    }

  } catch {
    botBubble.innerHTML = marked.parse("Afwan, jaringan telaah kitab sedang disinkronkan. Silakan coba kembali.");
  } finally {
    scrollToBottom();
  }
}

function appendMessage(content, sender) {
  const row = document.createElement("div");
  row.className = `msg-row ${sender}`;

  if (sender === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.innerText = "NU";
    row.appendChild(avatar);
  }

  const body = document.createElement("div");
  body.className = "msg-body";

  if (sender === "assistant") {
    body.innerHTML = marked.parse(content);
  } else {
    body.innerText = content;
  }

  row.appendChild(body);
  chatThread.appendChild(row);
  scrollToBottom();

  return body;
}

function scrollToBottom() {
  messagesViewport.scrollTop = messagesViewport.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});
