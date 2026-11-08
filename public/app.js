const messagesViewport = document.getElementById("messagesViewport");
const chatThread = document.getElementById("chatThread");
const welcomeContainer = document.getElementById("welcomeContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const sidebar = document.getElementById("sidebar");

let conversationHistory = [];

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

function startNewChat() {
  conversationHistory = [];
  chatThread.innerHTML = "";
  welcomeContainer.style.display = "block";
  userInput.value = "";
  userInput.focus();
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

  appendMessage(text, "user");
  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;

  conversationHistory.push({ role: "user", content: text });

  const botBubble = appendMessage('<i class="ri-loader-4-line ri-spin"></i> Menelaah rujukan kitab salaf...', "assistant");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory })
    });

    const data = await res.json();
    const replyText = data.reply || "Afwan, silakan kirim ulang pertanyaan Anda.";

    botBubble.innerHTML = marked.parse(replyText);
    conversationHistory.push({ role: "assistant", content: replyText });

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

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});
