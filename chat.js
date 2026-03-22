// ===== ANOMALY ZONE CHAT =====
// Firebase Realtime Database — free tier
// Config: replace with your Firebase project credentials

const FIREBASE_CONFIG = {
  // TODO: Replace with your Firebase config
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

let db = null;
let chatReady = false;
let userProfile = null;
let unreadCount = 0;
let chatOpen = false;
let lastSeenTimestamp = 0;

// ===== INIT =====
function initChat() {
  // Check if Firebase is loaded and configured
  if (typeof firebase === 'undefined') {
    console.log('Firebase SDK not loaded — chat disabled');
    return;
  }

  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    console.log('Firebase not configured — chat runs in demo mode');
    initDemoMode();
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    chatReady = true;
    loadProfile();
    setupPresence();
    setupUI();
  } catch (e) {
    console.error('Firebase init failed:', e);
    initDemoMode();
  }
}

// ===== DEMO MODE (no Firebase) =====
function initDemoMode() {
  loadProfile();
  setupUI();
  updateOnlineCount(1);

  // Show demo message
  const msgs = document.getElementById('chatMessages');
  if (msgs && userProfile) {
    msgs.innerHTML = '<div class="chat-msg-system">Чат в демо-режиме. Для полной работы нужна настройка Firebase.</div>';
  }
}

// ===== PROFILE =====
function loadProfile() {
  const saved = localStorage.getItem('anomaly-chat-profile');
  if (saved) {
    userProfile = JSON.parse(saved);
    showChat();
  }
}

function saveProfile(name, color) {
  userProfile = {
    name: name.trim(),
    color: color,
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  };
  localStorage.setItem('anomaly-chat-profile', JSON.stringify(userProfile));
}

function showChat() {
  document.getElementById('chatProfileSetup').style.display = 'none';
  document.getElementById('chatMessages').style.display = 'flex';
  document.getElementById('chatInputArea').style.display = 'flex';

  if (chatReady) {
    listenMessages();
    announceJoin();
  }
}

// ===== PRESENCE (online counter) =====
function setupPresence() {
  if (!db) return;

  const presenceRef = db.ref('presence/' + userProfile?.id || 'anon_' + Date.now());
  const connectedRef = db.ref('.info/connected');

  connectedRef.on('value', (snap) => {
    if (snap.val() === true && userProfile) {
      presenceRef.onDisconnect().remove();
      presenceRef.set({
        name: userProfile.name,
        color: userProfile.color,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
    }
  });

  // Listen to presence count
  db.ref('presence').on('value', (snap) => {
    const count = snap.numChildren();
    updateOnlineCount(count);
  });
}

function updateOnlineCount(count) {
  const el1 = document.getElementById('onlineCount');
  const el2 = document.getElementById('chatOnlineCount');
  if (el1) el1.textContent = count;
  if (el2) el2.textContent = count;
}

// ===== MESSAGES =====
function listenMessages() {
  if (!db) return;

  // Load last 50 messages
  db.ref('messages').orderByChild('timestamp').limitToLast(50).on('child_added', (snap) => {
    const msg = snap.val();
    appendMessage(msg);

    // Unread badge
    if (!chatOpen && msg.timestamp > lastSeenTimestamp && msg.userId !== userProfile?.id) {
      unreadCount++;
      updateBadge();
    }
  });
}

function sendMessage(text) {
  if (!text.trim()) return;

  const msg = {
    userId: userProfile.id,
    name: userProfile.name,
    color: userProfile.color,
    text: text.trim(),
    timestamp: Date.now(),
    type: 'message'
  };

  if (chatReady && db) {
    db.ref('messages').push(msg);
  } else {
    // Demo mode — show locally
    appendMessage(msg);
  }
}

function announceJoin() {
  if (!db || !userProfile) return;

  db.ref('messages').push({
    type: 'system',
    text: userProfile.name + ' вошёл в Зону',
    timestamp: Date.now()
  });
}

function appendMessage(msg) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const div = document.createElement('div');

  if (msg.type === 'system') {
    div.className = 'chat-msg-system';
    div.textContent = msg.text;
  } else {
    div.className = 'chat-msg';
    const time = new Date(msg.timestamp);
    const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');

    div.innerHTML = `
      <div class="chat-msg-header">
        <span class="chat-msg-name" style="color: ${escapeHtml(msg.color)}">${escapeHtml(msg.name)}</span>
        <span class="chat-msg-time">${timeStr}</span>
      </div>
      <div class="chat-msg-text">${escapeHtml(msg.text)}</div>
    `;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

// ===== BADGE =====
function updateBadge() {
  const badge = document.getElementById('chatBadge');
  if (!badge) return;
  if (unreadCount > 0) {
    badge.style.display = 'flex';
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
  } else {
    badge.style.display = 'none';
  }
}

// ===== UI SETUP =====
function setupUI() {
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const enterBtn = document.getElementById('chatEnterBtn');
  const sendBtn = document.getElementById('chatSendBtn');
  const msgInput = document.getElementById('chatMsgInput');
  const nameInput = document.getElementById('chatNameInput');
  const colorPicker = document.getElementById('chatColorPicker');

  // Toggle chat
  toggle.addEventListener('click', () => {
    chatOpen = !chatOpen;
    panel.classList.toggle('open', chatOpen);
    if (chatOpen) {
      unreadCount = 0;
      updateBadge();
      lastSeenTimestamp = Date.now();
      if (userProfile) msgInput?.focus();
    }
  });

  // Close
  closeBtn.addEventListener('click', () => {
    chatOpen = false;
    panel.classList.remove('open');
    lastSeenTimestamp = Date.now();
  });

  // Color picker
  let selectedColor = '#d42020';
  colorPicker.addEventListener('click', (e) => {
    const opt = e.target.closest('.chat-color-opt');
    if (!opt) return;
    colorPicker.querySelectorAll('.chat-color-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedColor = opt.dataset.color;
  });

  // Enter profile
  enterBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = '#ff3333';
      nameInput.focus();
      return;
    }
    saveProfile(name, selectedColor);
    showChat();
    if (chatReady) setupPresence();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enterBtn.click();
  });

  // Send message
  function doSend() {
    const text = msgInput.value;
    if (!text.trim()) return;
    sendMessage(text);
    msgInput.value = '';
    msgInput.focus();
  }

  sendBtn.addEventListener('click', doSend);
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSend();
  });
}

// ===== START =====
document.addEventListener('DOMContentLoaded', initChat);
