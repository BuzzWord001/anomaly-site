/* ============================================
   ZONE CHAT — STALKER EXTRACTION
   Always visible, top-left, STALKER-themed emojis
   Demo mode (Firebase-ready)
   ============================================ */
(function() {
  'use strict';

  const MAX_MESSAGES = 100;
  const STORAGE_PROFILE = 'zone_chat_profile';
  const STORAGE_MESSAGES = 'zone_chat_messages';
  const STORAGE_UID = 'zone_chat_uid';

  // --- EMOJI DATA ---
  const ICON_EMOJIS = ['☢','⚠','☠','⚡','🔥','💀','🎯','👁','⚔','🛡','💊','🔋','🗺','📡','🌑','🐺','🕷'];
  const TEXT_EMOJIS = ['artifact','anomaly','emission','bloodsucker','stalker','zone','radiation','medkit','ammo','loot'];
  const TEXT_EMOJI_SET = new Set(TEXT_EMOJIS);

  // --- STATE ---
  let userId = localStorage.getItem(STORAGE_UID);
  if (!userId) {
    userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    localStorage.setItem(STORAGE_UID, userId);
  }
  let profile = null;
  let messages = [];
  let emojiOpen = false;

  // --- DOM ---
  let els = {};

  function init() {
    els = {
      chat: document.getElementById('zoneChat'),
      collapse: document.getElementById('chatCollapseBtn'),
      profilePanel: document.getElementById('chatProfile'),
      body: document.getElementById('chatBody'),
      messages: document.getElementById('chatMessages'),
      input: document.getElementById('chatInput'),
      send: document.getElementById('chatSendBtn'),
      emojiBtn: document.getElementById('emojiBtnToggle'),
      emojiPanel: document.getElementById('emojiPanel'),
      nickname: document.getElementById('profileNickname'),
      color: document.getElementById('profileColor'),
      saveBtn: document.getElementById('profileSaveBtn'),
      onlineCount: document.getElementById('onlineCount'),
      mobileToggle: document.getElementById('chatMobileToggle')
    };

    loadProfile();
    loadMessages();
    buildEmojiPanel();
    bindEvents();
    simulateOnline();

    if (window.innerWidth <= 600) {
      els.chat.classList.add('mobile-hidden');
    }
  }

  // --- PROFILE ---
  function loadProfile() {
    try {
      const s = localStorage.getItem(STORAGE_PROFILE);
      if (s) { profile = JSON.parse(s); showChat(); }
      else { showProfile(); }
    } catch(e) { showProfile(); }
  }
  function showProfile() {
    els.profilePanel.style.display = 'flex';
    els.body.style.display = 'none';
  }
  function showChat() {
    els.profilePanel.style.display = 'none';
    els.body.style.display = 'flex';
    renderMessages();
    scrollBottom();
  }
  function saveProfile() {
    const nick = els.nickname.value.trim();
    if (!nick) { els.nickname.style.borderColor = '#ff4444'; els.nickname.focus(); return; }
    profile = { nickname: nick, color: els.color.value };
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    showChat();
    addSystemMsg(profile.nickname + ' входит в Зону');
  }

  // --- MESSAGES ---
  function loadMessages() {
    try { const s = localStorage.getItem(STORAGE_MESSAGES); if (s) messages = JSON.parse(s); } catch(e) { messages = []; }
  }
  function saveMessages() {
    if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
  }
  function addMessage(text) {
    text = text.trim();
    if (!text || !profile) return;
    const msg = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      uid: userId, nickname: profile.nickname, color: profile.color,
      text: text, time: Date.now()
    };
    messages.push(msg);
    saveMessages();
    appendMsg(msg);
    scrollBottom();
  }
  function addSystemMsg(text) {
    const msg = { id: 's_' + Date.now(), uid: '__sys__', text: text, time: Date.now(), sys: true };
    messages.push(msg);
    saveMessages();
    appendSysMsg(msg);
    scrollBottom();
  }
  function deleteMsg(id) {
    messages = messages.filter(m => m.id !== id);
    saveMessages();
    const el = document.querySelector('[data-mid="' + id + '"]');
    if (el) {
      el.style.transition = 'all 0.2s'; el.style.opacity = '0'; el.style.height = '0';
      el.style.padding = '0'; el.style.overflow = 'hidden';
      setTimeout(() => el.remove(), 200);
    }
  }

  // --- RENDER ---
  function renderMessages() {
    els.messages.innerHTML = '';
    messages.forEach(m => m.sys ? appendSysMsg(m) : appendMsg(m));
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }
  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function renderEmojis(text) {
    text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return text.replace(/:(\w+):/g, (m, w) =>
      TEXT_EMOJI_SET.has(w.toLowerCase()) ? '<span class="zone-emoji-badge">' + w.toLowerCase() + '</span>' : m
    );
  }
  function appendMsg(msg) {
    const div = document.createElement('div');
    div.className = 'zone-chat-msg' + (msg.uid === userId ? ' zone-chat-msg-own' : '');
    div.setAttribute('data-mid', msg.id);
    let h = '<span class="zone-chat-msg-time">' + fmtTime(msg.time) + '</span>';
    h += '<span class="zone-chat-msg-name" style="color:' + esc(msg.color) + '">' + esc(msg.nickname) + ':</span>';
    h += '<span class="zone-chat-msg-text">' + renderEmojis(msg.text) + '</span>';
    if (msg.uid === userId) h += '<button class="zone-chat-msg-del" data-del="' + msg.id + '">✕</button>';
    div.innerHTML = h;
    els.messages.appendChild(div);
  }
  function appendSysMsg(msg) {
    const div = document.createElement('div');
    div.className = 'zone-chat-msg zone-chat-msg-system';
    div.setAttribute('data-mid', msg.id);
    div.textContent = '— ' + msg.text + ' —';
    els.messages.appendChild(div);
  }
  function scrollBottom() { els.messages.scrollTop = els.messages.scrollHeight; }

  // --- EMOJI PANEL ---
  function buildEmojiPanel() {
    let h = '<div class="zone-chat-emoji-section-title">Зона</div><div class="zone-chat-emoji-grid">';
    ICON_EMOJIS.forEach(e => { h += '<button class="zone-chat-emoji-item" data-em="' + e + '">' + e + '</button>'; });
    h += '</div><div class="zone-chat-emoji-section-title">Теги</div><div class="zone-chat-emoji-grid">';
    TEXT_EMOJIS.forEach(e => { h += '<button class="zone-chat-emoji-item text-emoji" data-em=":' + e + ':">' + e + '</button>'; });
    h += '</div>';
    els.emojiPanel.innerHTML = h;
  }
  function toggleEmoji() {
    emojiOpen = !emojiOpen;
    els.emojiPanel.style.display = emojiOpen ? 'block' : 'none';
  }
  function insertEmoji(em) {
    const v = els.input.value;
    const pos = els.input.selectionStart || v.length;
    const sp = (pos > 0 && v[pos-1] !== ' ') ? ' ' : '';
    els.input.value = v.slice(0, pos) + sp + em + ' ' + v.slice(pos);
    els.input.focus();
  }

  // --- ONLINE (demo) ---
  function simulateOnline() {
    els.onlineCount.textContent = Math.floor(Math.random() * 10) + 2;
    setInterval(() => {
      const c = parseInt(els.onlineCount.textContent) || 3;
      const d = Math.random() > 0.5 ? 1 : -1;
      els.onlineCount.textContent = Math.max(1, Math.min(20, c + d));
    }, 15000);
  }

  // --- EVENTS ---
  function bindEvents() {
    els.saveBtn.addEventListener('click', saveProfile);
    els.nickname.addEventListener('keydown', e => { if (e.key === 'Enter') saveProfile(); });

    els.send.addEventListener('click', () => { addMessage(els.input.value); els.input.value = ''; els.input.focus(); });
    els.input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMessage(els.input.value); els.input.value = ''; }
    });

    els.emojiBtn.addEventListener('click', e => { e.stopPropagation(); toggleEmoji(); });
    els.emojiPanel.addEventListener('click', e => {
      const b = e.target.closest('.zone-chat-emoji-item');
      if (b) insertEmoji(b.getAttribute('data-em'));
    });

    els.messages.addEventListener('click', e => {
      const b = e.target.closest('.zone-chat-msg-del');
      if (b) deleteMsg(b.getAttribute('data-del'));
    });

    els.collapse.addEventListener('click', () => {
      els.chat.classList.toggle('collapsed');
      els.collapse.textContent = els.chat.classList.contains('collapsed') ? '+' : '−';
    });

    els.mobileToggle.addEventListener('click', () => {
      const hidden = els.chat.classList.contains('mobile-hidden');
      els.chat.classList.toggle('mobile-hidden');
      els.mobileToggle.classList.toggle('active', hidden);
    });

    document.addEventListener('click', e => {
      if (emojiOpen && !els.emojiPanel.contains(e.target) && e.target !== els.emojiBtn) {
        emojiOpen = false; els.emojiPanel.style.display = 'none';
      }
    });
  }

  // --- START ---
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
