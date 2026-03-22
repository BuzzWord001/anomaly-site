/* ============================================
   ZONE CHAT — STALKER EXTRACTION
   Firebase Realtime Database — live chat
   ============================================ */
(function() {
  'use strict';

  // --- FIREBASE CONFIG ---
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCLGYlEA0jo9Zxcw5Lpm-ONsS8cwsI2rY8",
    authDomain: "anomaly-chat.firebaseapp.com",
    databaseURL: "https://anomaly-chat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "anomaly-chat",
    storageBucket: "anomaly-chat.firebasestorage.app",
    messagingSenderId: "869455865759",
    appId: "1:869455865759:web:7ccac49785a3a69b0abfaa"
  };

  const BATCH_SIZE = 20; // messages per load
  const STORAGE_PROFILE = 'zone_chat_profile';
  const STORAGE_UID = 'zone_chat_uid';

  // --- COLORED SVG EMOJIS ---
  const SVG_EMOJIS = {
    '☢': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><circle cx="9" cy="9" r="2.2" fill="#c8d820"/><path d="M9 1.5A7.5 7.5 0 0 0 1.5 9h3.3a4.2 4.2 0 0 1 2.1-3.64L5.25 2.4A7.45 7.45 0 0 0 9 1.5z" fill="#b8cc00" opacity="0.9"/><path d="M16.5 9A7.5 7.5 0 0 0 12.75 2.4l-1.65 2.96A4.2 4.2 0 0 1 13.2 9h3.3z" fill="#b8cc00" opacity="0.9"/><path d="M9 16.5a7.45 7.45 0 0 0 3.75-1.02l-1.65-2.96a4.2 4.2 0 0 1-4.2 0L5.25 15.48A7.45 7.45 0 0 0 9 16.5z" fill="#b8cc00" opacity="0.9"/><circle cx="9" cy="9" r="2.2" fill="#eeff33" style="filter:drop-shadow(0 0 3px rgba(200,216,32,0.8))"/></svg>',
    '⚠': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><path d="M9 1.5L1 16h16L9 1.5z" fill="none" stroke="#e8a020" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 3.5L2.5 15h13L9 3.5z" fill="rgba(232,160,32,0.15)"/><line x1="9" y1="7" x2="9" y2="11.5" stroke="#e8a020" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="13.5" r="0.8" fill="#e8a020"/></svg>',
    '☠': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><ellipse cx="9" cy="7.5" rx="5.5" ry="5" fill="none" stroke="#d43030" stroke-width="1.2"/><ellipse cx="6.8" cy="7" rx="1.3" ry="1.5" fill="#d43030"/><ellipse cx="11.2" cy="7" rx="1.3" ry="1.5" fill="#d43030"/><path d="M7 10.5Q9 12 11 10.5" fill="none" stroke="#d43030" stroke-width="0.8"/><line x1="7.5" y1="12.5" x2="7.5" y2="15.5" stroke="#d43030" stroke-width="1" stroke-linecap="round"/><line x1="9" y1="12.5" x2="9" y2="16" stroke="#d43030" stroke-width="1" stroke-linecap="round"/><line x1="10.5" y1="12.5" x2="10.5" y2="15.5" stroke="#d43030" stroke-width="1" stroke-linecap="round"/></svg>',
    '⚡': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><polygon points="10.5,1 4,10 8,10 7,17 14,7.5 10,7.5 12,1" fill="#4dc9f6" stroke="#2ab0e6" stroke-width="0.5" stroke-linejoin="round" style="filter:drop-shadow(0 0 3px rgba(77,201,246,0.7))"/></svg>',
    '🔥': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><path d="M9 1C7 5 4 7 4 11c0 3 2.2 5.5 5 5.5s5-2.5 5-5.5c0-2.5-1.5-4-3-6C10 3.5 9 1 9 1z" fill="#e85020" opacity="0.9"/><path d="M9 6C8 8.5 6 9.5 6 12c0 1.8 1.3 3.5 3 3.5s3-1.7 3-3.5c0-1.5-1-2.5-2-4z" fill="#ff8c20"/><path d="M9 10c-.5 1-1.5 1.5-1.5 3 0 .9.7 1.8 1.5 1.8s1.5-.9 1.5-1.8c0-1-.5-1.5-1-2.2z" fill="#ffcc40"/></svg>',
    '💀': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><ellipse cx="9" cy="7.5" rx="5" ry="4.5" fill="none" stroke="#ff4444" stroke-width="1"/><circle cx="7" cy="7" r="1.2" fill="#ff4444"/><circle cx="11" cy="7" r="1.2" fill="#ff4444"/><path d="M7.5 10Q9 11.5 10.5 10" fill="none" stroke="#ff4444" stroke-width="0.7"/></svg>',
    '🎯': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="#d43030" stroke-width="0.8" opacity="0.6"/><circle cx="9" cy="9" r="4.5" fill="none" stroke="#d43030" stroke-width="0.8" opacity="0.8"/><circle cx="9" cy="9" r="2" fill="none" stroke="#d43030" stroke-width="1"/><circle cx="9" cy="9" r="0.7" fill="#ff3333"/><line x1="9" y1="1" x2="9" y2="5" stroke="#d43030" stroke-width="0.7"/><line x1="9" y1="13" x2="9" y2="17" stroke="#d43030" stroke-width="0.7"/><line x1="1" y1="9" x2="5" y2="9" stroke="#d43030" stroke-width="0.7"/><line x1="13" y1="9" x2="17" y2="9" stroke="#d43030" stroke-width="0.7"/></svg>',
    '👁': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><path d="M1 9s3.5-5 8-5 8 5 8 5-3.5 5-8 5-8-5-8-5z" fill="none" stroke="#39ff14" stroke-width="0.9" opacity="0.8"/><circle cx="9" cy="9" r="2.8" fill="none" stroke="#39ff14" stroke-width="0.9"/><circle cx="9" cy="9" r="1.2" fill="#39ff14" style="filter:drop-shadow(0 0 3px rgba(57,255,20,0.8))"/></svg>',
    '⚔': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><line x1="3" y1="15" x2="14" y2="3" stroke="#a0a8b0" stroke-width="1.3" stroke-linecap="round"/><line x1="12" y1="5" x2="15" y2="3" stroke="#a0a8b0" stroke-width="1"/><line x1="15" y1="15" x2="4" y2="3" stroke="#8890a0" stroke-width="1.3" stroke-linecap="round"/><line x1="6" y1="5" x2="3" y2="3" stroke="#8890a0" stroke-width="1"/></svg>',
    '🛡': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><path d="M9 2L3 5v4.5c0 3.5 2.6 6.5 6 7.5 3.4-1 6-4 6-7.5V5L9 2z" fill="rgba(46,100,40,0.3)" stroke="#4a8040" stroke-width="1.1" stroke-linejoin="round"/></svg>',
    '💊': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><rect x="3" y="5" width="12" height="8" rx="1.5" fill="none" stroke="#d43030" stroke-width="1"/><line x1="7" y1="9" x2="11" y2="9" stroke="#d43030" stroke-width="1.2" stroke-linecap="round"/><line x1="9" y1="7" x2="9" y2="11" stroke="#d43030" stroke-width="1.2" stroke-linecap="round"/></svg>',
    '🔋': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><rect x="2" y="5" width="12" height="8" rx="1" fill="none" stroke="#39cc40" stroke-width="1"/><rect x="14" y="7" width="2" height="4" rx="0.5" fill="#39cc40"/><rect x="3.5" y="6.5" width="3" height="5" rx="0.5" fill="#39cc40" opacity="0.8"/><rect x="7.5" y="6.5" width="3" height="5" rx="0.5" fill="#39cc40" opacity="0.5"/></svg>',
    '🗺': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><path d="M2 3l4.5 1.5L9 3l4.5 1.5L16 3v12l-2.5 1.5L9 15l-4.5 1.5L2 15V3z" fill="rgba(232,160,32,0.15)" stroke="#e8a020" stroke-width="0.9"/><circle cx="9" cy="9" r="1" fill="#e8a020" opacity="0.7"/></svg>',
    '📡': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><line x1="5" y1="13" x2="9" y2="8" stroke="#20d4d4" stroke-width="1.2" stroke-linecap="round"/><circle cx="9" cy="8" r="1.2" fill="#20d4d4"/><path d="M6.5 6.5a3.8 3.8 0 0 1 5.5 0" fill="none" stroke="#20d4d4" stroke-width="0.8" opacity="0.7"/><path d="M5 5a6 6 0 0 1 8.5 0" fill="none" stroke="#20d4d4" stroke-width="0.8" opacity="0.4" style="filter:drop-shadow(0 0 2px rgba(32,212,212,0.5))"/><line x1="5" y1="13" x2="3" y2="16" stroke="#20d4d4" stroke-width="0.8"/><line x1="5" y1="13" x2="7" y2="16" stroke="#20d4d4" stroke-width="0.8"/></svg>',
    '🌑': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.5" fill="#1a1030" stroke="#6030a0" stroke-width="0.8"/><circle cx="9" cy="9" r="6.5" fill="none" stroke="#8040c0" stroke-width="0.4" opacity="0.5" style="filter:drop-shadow(0 0 4px rgba(128,64,192,0.5))"/><circle cx="7" cy="7" r="1.5" fill="rgba(96,48,160,0.3)"/></svg>',
    '🐺': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><path d="M3 4l2 5h8l2-5-3 3H6L3 4z" fill="#c89040" stroke="#a07030" stroke-width="0.6" stroke-linejoin="round"/><ellipse cx="9" cy="11" rx="4.5" ry="3.5" fill="#c89040" stroke="#a07030" stroke-width="0.6"/><circle cx="7.2" cy="9.5" r="0.8" fill="#ff6020"/><circle cx="10.8" cy="9.5" r="0.8" fill="#ff6020"/></svg>',
    '🕷': '<svg class="zone-svg-emoji" viewBox="0 0 18 18"><ellipse cx="9" cy="8" rx="2.5" ry="2" fill="#801020"/><ellipse cx="9" cy="11.5" rx="3" ry="2.5" fill="#801020"/><line x1="6.5" y1="8" x2="1" y2="4" stroke="#801020" stroke-width="0.8"/><line x1="6.5" y1="9" x2="1" y2="9" stroke="#801020" stroke-width="0.8"/><line x1="6.5" y1="11" x2="1" y2="14" stroke="#801020" stroke-width="0.8"/><line x1="11.5" y1="8" x2="17" y2="4" stroke="#801020" stroke-width="0.8"/><line x1="11.5" y1="9" x2="17" y2="9" stroke="#801020" stroke-width="0.8"/><line x1="11.5" y1="11" x2="17" y2="14" stroke="#801020" stroke-width="0.8"/><circle cx="8" cy="7.5" r="0.5" fill="#ff2020"/><circle cx="10" cy="7.5" r="0.5" fill="#ff2020"/></svg>'
  };

  const EMOJI_CHARS = Object.keys(SVG_EMOJIS);
  const TEXT_EMOJIS = ['artifact','anomaly','emission','bloodsucker','stalker','zone','radiation','medkit','ammo','loot'];
  const TEXT_EMOJI_SET = new Set(TEXT_EMOJIS);

  // --- TWITCH / BTTV / 7TV EMOTES ---
  // Format: { code: 'emote_id', src: 'cdn_url' }
  const TWITCH_EMOTES = [
    { code: 'Kappa', src: 'https://cdn.7tv.app/emote/60ae958e229664e866f0a660/1x.webp' },
    { code: 'KEKW', src: 'https://cdn.7tv.app/emote/60ae4bb30e35477634988c09/1x.webp' },
    { code: 'OMEGALUL', src: 'https://cdn.7tv.app/emote/60ae7316f39a7552b658b60d/1x.webp' },
    { code: 'monkaS', src: 'https://cdn.7tv.app/emote/60ae3e54cab80e4e0fdd6adf/1x.webp' },
    { code: 'PogChamp', src: 'https://cdn.7tv.app/emote/60ae916df39a7552b658b791/1x.webp' },
    { code: 'Sadge', src: 'https://cdn.7tv.app/emote/60ae459b0e35477634988b8e/1x.webp' },
    { code: 'COPIUM', src: 'https://cdn.7tv.app/emote/60ae9485f39a7552b658b7af/1x.webp' },
    { code: 'PepeLaugh', src: 'https://cdn.7tv.app/emote/60ae8b44f39a7552b658b6df/1x.webp' },
    { code: 'EZ', src: 'https://cdn.7tv.app/emote/60ae7d9cf39a7552b658b681/1x.webp' },
    { code: 'catJAM', src: 'https://cdn.7tv.app/emote/60ae65d2f39a7552b658b5c8/1x.webp' },
    { code: 'HYPERS', src: 'https://cdn.7tv.app/emote/60ae87acf39a7552b658b6c5/1x.webp' },
    { code: 'monkaW', src: 'https://cdn.7tv.app/emote/60ae3f640e35477634988ae6/1x.webp' },
    { code: 'FeelsBadMan', src: 'https://cdn.7tv.app/emote/60ae7f1af39a7552b658b696/1x.webp' },
    { code: 'FeelsGoodMan', src: 'https://cdn.7tv.app/emote/60ae7f56f39a7552b658b69b/1x.webp' },
    { code: 'PepeHands', src: 'https://cdn.7tv.app/emote/60ae89e7f39a7552b658b6d8/1x.webp' },
    { code: 'Pepega', src: 'https://cdn.7tv.app/emote/60ae8ac6f39a7552b658b6e1/1x.webp' },
    { code: 'widepeepoHappy', src: 'https://cdn.7tv.app/emote/60ae9720f39a7552b658b7bd/1x.webp' },
    { code: 'peepoSad', src: 'https://cdn.7tv.app/emote/60ae89a4f39a7552b658b6d4/1x.webp' },
    { code: 'Clap', src: 'https://cdn.7tv.app/emote/60ae5d29f39a7552b658b575/1x.webp' },
    { code: 'POGGERS', src: 'https://cdn.7tv.app/emote/60ae9168f39a7552b658b78c/1x.webp' },
    { code: 'monkaHmm', src: 'https://cdn.7tv.app/emote/60ae3f3b0e35477634988ae1/1x.webp' },
    { code: 'LULW', src: 'https://cdn.7tv.app/emote/60ae8d13f39a7552b658b6f6/1x.webp' },
    { code: 'pepeMeltdown', src: 'https://cdn.7tv.app/emote/6257e7a3131d4588262aae2f/1x.webp' },
    { code: 'Aware', src: 'https://cdn.7tv.app/emote/626795b38c5eb7bdd5c5c1c9/1x.webp' },
  ];
  const TWITCH_MAP = {};
  TWITCH_EMOTES.forEach(e => { TWITCH_MAP[e.code.toLowerCase()] = e; });

  // --- STANDARD EMOJI CATEGORIES ---
  const STD_EMOJIS = {
    'Смайлы': ['😀','😂','🤣','😅','😊','😎','🤔','😏','😒','😢','😭','😤','🤬','😱','🥺','😴','🤮','🤡','💩','👻','🤖','👽','🫡','🫠','😈'],
    'Жесты': ['👍','👎','👏','🤝','✌️','🤞','🤙','👊','✊','💪','🫶','🖕','👋','🙏','🤘'],
    'Сердца': ['❤️','🖤','💔','❤️‍🔥','💛','💚','💜','🤎','💯','💢','💥','✨','🔥'],
    'Люди': ['🧑‍💻','🧟','🪖','🥷','💂','🕵️','👤','💀','☠️','🤺','🏃','🧎'],
    'Животные': ['🐺','🐻','🦅','🐍','🕷️','🦇','🐀','🐗','🦎','🐊'],
    'Еда': ['🍺','🍻','🥃','🍖','🥫','🥩','🧃','☕','🫗'],
    'Предметы': ['🔫','🗡️','🪓','💣','🧨','💉','💊','🩹','🔦','🧭','📻','🔑','🪙','💰','🎒','🗺️','⛏️','🔧','🪚'],
    'Символы': ['⚠️','☢️','☣️','⚡','🚫','❌','✅','⭕','🔴','🟢','🟡','🔵','⬛','💠','🏴','🏁','📌','📍']
  };

  // --- STATE ---
  let userId = localStorage.getItem(STORAGE_UID);
  if (!userId) { userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); localStorage.setItem(STORAGE_UID, userId); }
  let profile = null, emojiOpen = false, els = {}, db = null, renderedIds = new Set();
  let oldestKey = null, loadingOlder = false, allLoaded = false;

  function init() {
    els = {
      chat: document.getElementById('zoneChat'), collapse: document.getElementById('chatCollapseBtn'),
      profilePanel: document.getElementById('chatProfile'), body: document.getElementById('chatBody'),
      messages: document.getElementById('chatMessages'), input: document.getElementById('chatInput'),
      send: document.getElementById('chatSendBtn'), emojiBtn: document.getElementById('emojiBtnToggle'),
      emojiPanel: document.getElementById('emojiPanel'), nickname: document.getElementById('profileNickname'),
      color: document.getElementById('profileColor'), saveBtn: document.getElementById('profileSaveBtn'),
      onlineCount: document.getElementById('onlineCount'), mobileToggle: document.getElementById('chatMobileToggle')
    };

    initFirebase();
    loadProfile();
    buildEmojiPanel();
    bindEvents();
    if (window.innerWidth <= 600) els.chat.classList.add('mobile-hidden');
  }

  // --- FIREBASE ---
  function initFirebase() {
    if (typeof firebase === 'undefined') { console.warn('Firebase SDK not loaded'); return; }
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
    } catch(e) { console.error('Firebase init failed:', e); }
  }

  function setupPresence() {
    if (!db || !profile) return;
    const myRef = db.ref('presence/' + userId);
    const connRef = db.ref('.info/connected');

    connRef.on('value', snap => {
      if (snap.val() === true) {
        myRef.onDisconnect().remove();
        myRef.set({ name: profile.nickname, color: profile.color, t: firebase.database.ServerValue.TIMESTAMP });
      }
    });

    // Listen to online count
    db.ref('presence').on('value', snap => {
      els.onlineCount.textContent = snap.numChildren() || 1;
    });
  }

  function listenMessages() {
    if (!db) return;

    // Load last BATCH_SIZE messages initially
    db.ref('messages').orderByKey().limitToLast(BATCH_SIZE).once('value', snap => {
      const data = snap.val();
      if (!data) return;
      const entries = Object.entries(data).sort((a, b) => (a[1].time || 0) - (b[1].time || 0));
      entries.forEach(([key, msg]) => {
        msg._key = key;
        renderedIds.add(key);
        appendMsg(msg);
      });
      if (entries.length > 0) oldestKey = entries[0][0];
      if (entries.length < BATCH_SIZE) allLoaded = true;
      scrollBottom();
    });

    // Listen for NEW messages (after initial load)
    setTimeout(() => {
      db.ref('messages').orderByKey().limitToLast(1).on('child_added', snap => {
        if (renderedIds.has(snap.key)) return;
        const msg = snap.val();
        msg._key = snap.key;
        renderedIds.add(snap.key);
        appendMsg(msg);
        scrollBottom();
      });
    }, 1500);

    // Listen for edits
    db.ref('messages').on('child_changed', snap => {
      const msg = snap.val();
      const el = document.querySelector('[data-mid="' + snap.key + '"]');
      if (el) {
        const textEl = el.querySelector('.zone-chat-msg-text');
        if (textEl) textEl.innerHTML = renderEmojis(msg.text) + (msg.edited ? ' <span class="zone-chat-msg-edited">(ред.)</span>' : '');
      }
    });

    // Listen for deletes
    db.ref('messages').on('child_removed', snap => {
      const el = document.querySelector('[data-mid="' + snap.key + '"]');
      if (el) { el.style.transition = 'all 0.25s'; el.style.opacity = '0'; el.style.maxHeight = '0'; el.style.padding = '0'; el.style.overflow = 'hidden'; setTimeout(() => el.remove(), 250); }
      renderedIds.delete(snap.key);
    });

    // Scroll-up to load older messages
    els.messages.addEventListener('scroll', () => {
      if (loadingOlder || allLoaded || !oldestKey) return;
      if (els.messages.scrollTop < 60) loadOlderMessages();
    });
  }

  function loadOlderMessages() {
    if (!db || loadingOlder || allLoaded) return;
    loadingOlder = true;

    // Show loading indicator
    const loader = document.createElement('div');
    loader.className = 'zone-chat-msg-system';
    loader.id = 'chatLoader';
    loader.innerHTML = '<span class="zone-sys-spinner"></span> загрузка...';
    els.messages.prepend(loader);

    db.ref('messages').orderByKey().endBefore(oldestKey).limitToLast(BATCH_SIZE).once('value', snap => {
      const loaderEl = document.getElementById('chatLoader');
      if (loaderEl) loaderEl.remove();

      const data = snap.val();
      if (!data) { allLoaded = true; loadingOlder = false; showAllLoadedHint(); return; }

      const entries = Object.entries(data).sort((a, b) => (a[1].time || 0) - (b[1].time || 0));
      if (entries.length === 0) { allLoaded = true; loadingOlder = false; showAllLoadedHint(); return; }
      if (entries.length < BATCH_SIZE) allLoaded = true;

      // Save scroll position
      const prevHeight = els.messages.scrollHeight;

      // Prepend older messages
      const frag = document.createDocumentFragment();
      entries.forEach(([key, msg]) => {
        if (renderedIds.has(key)) return;
        msg._key = key;
        renderedIds.add(key);
        const div = buildMsgEl(msg);
        frag.appendChild(div);
      });
      els.messages.prepend(frag);

      if (allLoaded) showAllLoadedHint();

      // Restore scroll position
      els.messages.scrollTop = els.messages.scrollHeight - prevHeight;
      oldestKey = entries[0][0];
      loadingOlder = false;
    });
  }

  function showAllLoadedHint() {
    if (document.getElementById('chatAllLoaded')) return;
    const hint = document.createElement('div');
    hint.className = 'zone-chat-msg-system';
    hint.id = 'chatAllLoaded';
    hint.innerHTML = '<span class="zone-sys-icon">⚠</span> начало истории чата';
    els.messages.prepend(hint);
  }

  // --- PROFILE ---
  function loadProfile() {
    try { const s = localStorage.getItem(STORAGE_PROFILE); if (s) { profile = JSON.parse(s); showChat(); } else showProfile(); } catch(e) { showProfile(); }
  }
  function showProfile() { els.profilePanel.style.display = 'flex'; els.body.style.display = 'none'; }
  function showChat() {
    els.profilePanel.style.display = 'none'; els.body.style.display = 'flex';
    setupPresence();
    listenMessages();
  }
  function saveProfile() {
    const nick = els.nickname.value.trim();
    if (!nick) { els.nickname.style.borderColor = '#ff4444'; els.nickname.focus(); return; }
    profile = { nickname: nick, color: els.color.value };
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    showChat();
    // System message
    if (db) {
      db.ref('messages').push({ uid: '__sys__', text: nick + ' входит в Зону', time: firebase.database.ServerValue.TIMESTAMP, sys: true });
    }
  }

  // --- MESSAGES ---
  function addMessage(text) {
    text = text.trim(); if (!text || !profile) return;
    if (db) {
      db.ref('messages').push({
        uid: userId, nickname: profile.nickname, color: profile.color,
        text: text, time: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }

  function deleteMsg(key) {
    if (db) db.ref('messages/' + key).remove();
  }

  function editMsg(key) {
    if (!db) return;
    const el = document.querySelector('[data-mid="' + key + '"]');
    if (!el || el.classList.contains('editing')) return;

    // Read current text from Firebase
    db.ref('messages/' + key).once('value', snap => {
      const msg = snap.val();
      if (!msg || msg.uid !== userId) return;

      el.classList.add('editing');
      const textEl = el.querySelector('.zone-chat-msg-text');
      const oldHtml = textEl.innerHTML;

      const input = document.createElement('input');
      input.type = 'text'; input.className = 'zone-chat-edit-input'; input.value = msg.text; input.maxLength = 300;
      const actions = document.createElement('span');
      actions.className = 'zone-chat-edit-actions';
      actions.innerHTML = '<button class="zone-chat-edit-save" title="Сохранить">&#10003;</button><button class="zone-chat-edit-cancel" title="Отмена">&#10007;</button>';
      textEl.innerHTML = ''; textEl.appendChild(input); textEl.appendChild(actions);
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);

      function save() {
        const newText = input.value.trim();
        if (newText && newText !== msg.text) {
          db.ref('messages/' + key).update({ text: newText, edited: true });
        } else {
          textEl.innerHTML = oldHtml;
        }
        el.classList.remove('editing');
      }
      function cancel() { textEl.innerHTML = oldHtml; el.classList.remove('editing'); }

      actions.querySelector('.zone-chat-edit-save').addEventListener('click', e => { e.stopPropagation(); save(); });
      actions.querySelector('.zone-chat-edit-cancel').addEventListener('click', e => { e.stopPropagation(); cancel(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') cancel(); });
      input.addEventListener('click', e => e.stopPropagation());
    });
  }

  // --- RENDER ---
  function fmtTime(ts) {
    if (!ts) return '--:--';
    const d = new Date(ts); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }
  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function renderEmojis(text) {
    text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // SVG zone emojis
    for (const [ch, svg] of Object.entries(SVG_EMOJIS)) { while (text.indexOf(ch) !== -1) text = text.replace(ch, svg); }
    // Twitch emotes (case-insensitive word match)
    text = text.replace(/\b([A-Za-z]\w+)\b/g, (m, w) => {
      const e = TWITCH_MAP[w.toLowerCase()];
      return e ? '<img class="zone-twitch-emote" src="' + e.src + '" alt="' + e.code + '" title="' + e.code + '">' : m;
    });
    // Text tag emojis :word:
    text = text.replace(/:(\w+):/g, (m, w) => TEXT_EMOJI_SET.has(w.toLowerCase()) ? '<span class="zone-emoji-badge">' + w.toLowerCase() + '</span>' : m);
    return text;
  }

  function buildMsgEl(msg) {
    const div = document.createElement('div');
    if (msg.sys) {
      div.className = 'zone-chat-msg zone-chat-msg-system';
      div.setAttribute('data-mid', msg._key);
      div.innerHTML = '<span class="zone-sys-icon">☢</span> ' + esc(msg.text);
      return div;
    }
    div.className = 'zone-chat-msg' + (msg.uid === userId ? ' zone-chat-msg-own' : '');
    div.setAttribute('data-mid', msg._key);
    if (msg.uid !== userId && msg.color) { div.style.borderLeftColor = msg.color; div.style.borderLeftWidth = '2px'; div.style.borderLeftStyle = 'solid'; }
    let h = '<span class="zone-chat-msg-time">' + fmtTime(msg.time) + '</span>';
    h += '<span class="zone-chat-msg-name" style="color:' + esc(msg.color || '#ccc') + '">' + esc(msg.nickname || 'Сталкер') + ':</span>';
    h += '<span class="zone-chat-msg-text">' + renderEmojis(msg.text) + (msg.edited ? ' <span class="zone-chat-msg-edited">(ред.)</span>' : '') + '</span>';
    if (msg.uid === userId) {
      h += '<span class="zone-chat-msg-actions">';
      h += '<button class="zone-chat-msg-edit" data-edit="' + msg._key + '" title="Редактировать">&#9998;</button>';
      h += '<button class="zone-chat-msg-del" data-del="' + msg._key + '" title="Удалить">&#10005;</button>';
      h += '</span>';
    }
    div.innerHTML = h;
    return div;
  }

  function appendMsg(msg) {
    els.messages.appendChild(buildMsgEl(msg));
  }

  function scrollBottom() { els.messages.scrollTop = els.messages.scrollHeight; }

  // --- EMOJI PANEL ---
  function buildEmojiPanel() {
    let h = '';
    // Zone SVG icons
    h += '<div class="zone-chat-emoji-section-title">Зона</div><div class="zone-chat-emoji-grid">';
    EMOJI_CHARS.forEach(ch => { h += '<button class="zone-chat-emoji-item" data-em="' + ch + '">' + SVG_EMOJIS[ch] + '</button>'; });
    h += '</div>';
    // Zone text tags
    h += '<div class="zone-chat-emoji-section-title">Теги</div><div class="zone-chat-emoji-grid">';
    TEXT_EMOJIS.forEach(e => { h += '<button class="zone-chat-emoji-item text-emoji" data-em=":' + e + ':">' + e + '</button>'; });
    h += '</div>';
    // Twitch / BTTV / 7TV emotes
    h += '<div class="zone-chat-emoji-section-title">Twitch / BTTV</div><div class="zone-chat-emoji-grid">';
    TWITCH_EMOTES.forEach(e => {
      h += '<button class="zone-chat-emoji-item zone-twitch-emoji-btn" data-em="' + e.code + '" title="' + e.code + '"><img src="' + e.src + '" alt="' + e.code + '" class="zone-twitch-emote-preview"></button>';
    });
    h += '</div>';
    // Standard emoji categories
    for (const [cat, emojis] of Object.entries(STD_EMOJIS)) {
      h += '<div class="zone-chat-emoji-section-title">' + cat + '</div><div class="zone-chat-emoji-grid">';
      emojis.forEach(em => { h += '<button class="zone-chat-emoji-item" data-em="' + em + '">' + em + '</button>'; });
      h += '</div>';
    }
    els.emojiPanel.innerHTML = h;
  }
  function toggleEmoji() { emojiOpen = !emojiOpen; els.emojiPanel.style.display = emojiOpen ? 'block' : 'none'; }
  function insertEmoji(em) {
    const v = els.input.value, pos = els.input.selectionStart || v.length;
    const sp = (pos > 0 && v[pos-1] !== ' ') ? ' ' : '';
    els.input.value = v.slice(0, pos) + sp + em + ' ' + v.slice(pos); els.input.focus();
  }

  // --- EVENTS ---
  function bindEvents() {
    els.saveBtn.addEventListener('click', saveProfile);
    els.nickname.addEventListener('keydown', e => { if (e.key === 'Enter') saveProfile(); });
    els.send.addEventListener('click', () => { addMessage(els.input.value); els.input.value = ''; els.input.focus(); });
    els.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMessage(els.input.value); els.input.value = ''; } });
    els.emojiBtn.addEventListener('click', e => { e.stopPropagation(); toggleEmoji(); });
    els.emojiPanel.addEventListener('click', e => { const b = e.target.closest('.zone-chat-emoji-item'); if (b) insertEmoji(b.getAttribute('data-em')); });
    els.messages.addEventListener('click', e => {
      const del = e.target.closest('.zone-chat-msg-del'); if (del) deleteMsg(del.getAttribute('data-del'));
      const edit = e.target.closest('.zone-chat-msg-edit'); if (edit) editMsg(edit.getAttribute('data-edit'));
    });
    els.collapse.addEventListener('click', () => { els.chat.classList.toggle('collapsed'); els.collapse.innerHTML = els.chat.classList.contains('collapsed') ? '&#43;' : '&minus;'; });
    els.mobileToggle.addEventListener('click', () => { const h = els.chat.classList.contains('mobile-hidden'); els.chat.classList.toggle('mobile-hidden'); els.mobileToggle.classList.toggle('active', h); });
    document.addEventListener('click', e => { if (emojiOpen && !els.emojiPanel.contains(e.target) && e.target !== els.emojiBtn) { emojiOpen = false; els.emojiPanel.style.display = 'none'; } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
