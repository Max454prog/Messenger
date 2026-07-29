// КОНФИГУРАЦИЯ FIREBASE (вставьте свои ключи)
const firebaseConfig = {
  apiKey: "AIzaSyDH4JqdICmjf_IzC2h58arcQiSAWkV4AcA",
  authDomain: "messenger-41f5f.firebaseapp.com",
  projectId: "messenger-41f5f",
  storageBucket: "messenger-41f5f.firebasestorage.app",
  messagingSenderId: "663121888236",
  appId: "1:663121888236:web:f5997f256fd153fde9b6c9",
  measurementId: "G-87QPL1SK7N"
};

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM-элементы
const splashScreen = document.getElementById('splash-screen');
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authForm = document.getElementById('auth-form');
const nicknameGroup = document.getElementById('nickname-group');
const nicknameInput = document.getElementById('nickname');
const regPhoneGroup = document.getElementById('reg-phone-group');
const regPhoneInput = document.getElementById('reg-phone');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authToggle = document.getElementById('auth-toggle');
const switchLink = document.getElementById('switch-to-register');
const messagesContainer = document.getElementById('messages-container');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const profileNickname = document.getElementById('profile-nickname');
const profilePhone = document.getElementById('profile-phone');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const saveProfileBtn = document.getElementById('save-profile');
const closeModalBtn = document.getElementById('close-modal');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const selfStatusDot = document.getElementById('self-status-dot');
const currentUserNickname = document.getElementById('current-user-nickname');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji-panel');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const animationSelect = document.getElementById('animation-select');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const mainChat = document.getElementById('main-chat');
const sidebar = document.getElementById('sidebar');
const sidebarScrim = document.getElementById('sidebar-scrim');
const chatList = document.getElementById('chat-list');
const currentChatTitle = document.getElementById('current-chat-title');
const chatHeaderSub = document.getElementById('chat-header-sub');
const chatHeaderAvatarWrap = document.getElementById('chat-header-avatar-wrap');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');
const chatHeaderStatusDot = document.getElementById('chat-header-status-dot');
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const closeNewChatBtn = document.getElementById('close-new-chat');
const modePrivateBtn = document.getElementById('mode-private');
const modeGroupBtn = document.getElementById('mode-group');
const groupNameGroup = document.getElementById('group-name-group');
const groupNameInput = document.getElementById('group-name-input');
const userSearchInput = document.getElementById('user-search-input');
const userSearchBtn = document.getElementById('user-search-btn');
const searchResultsEl = document.getElementById('search-results');
const searchHint = document.getElementById('search-hint');
const stagedMembersEl = document.getElementById('staged-members');
const createGroupBtn = document.getElementById('create-group-btn');

let currentUser = null;
let currentUserData = { nickname: '', avatarUrl: '', animation: 'none' };
let activeChatId = 'general';
let unsubscribeMessages = null;
let isLoginMode = true;
let animationInterval = null;
let presenceInterval = null;
const userStatusListeners = new Map(); // uid -> unsubscribe
let unsubscribeChatList = null;
let unsubscribeHeaderPresence = null;
let newChatMode = 'private'; // 'private' | 'group'
let stagedMembers = []; // { uid, nickname, avatarUrl } — только для режима "группа"
let lastSearchResults = []; // кэш последних результатов поиска пользователей

// ============ Splash screen ============
// Показывается минимум ~1.3с, скрывается как только известно состояние авторизации
let splashMinTimeDone = false;
let authStateKnown = false;
function maybeHideSplash() {
  if (splashMinTimeDone && authStateKnown) {
    splashScreen.classList.add('hidden');
  }
}
setTimeout(() => { splashMinTimeDone = true; maybeHideSplash(); }, 1300);

// Вспомогательные функции
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}
function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
}
function isScrolledToBottom() {
  const c = messagesContainer;
  return c.scrollHeight - c.scrollTop - c.clientHeight < 100;
}
function scrollToBottom() { messagesContainer.scrollTop = messagesContainer.scrollHeight; }
function clearAuthError() { authError.textContent = ''; }
function displayAuthError(msg) { authError.textContent = msg; }
function linkify(text) {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
// ============ Реальные анимированные эмодзи (Google Noto Animated Emoji) ============
// У каждого эмодзи — своя настоящая покадровая Lottie-анимация с официального CDN
// Google Fonts (fonts.gstatic.com), под открытой лицензией. Не у всех эмодзи есть
// анимированная версия — для них аккуратно откатываемся на обычный текстовый эмодзи.
function emojiToNotoCodepoint(emoji) {
  return Array.from(emoji).map(ch => ch.codePointAt(0).toString(16).toLowerCase()).join('_');
}
const emojiLottieCache = new Map(); // codepoint -> Promise<lottieJSON|null>
function getEmojiLottie(codepoint) {
  if (emojiLottieCache.has(codepoint)) return emojiLottieCache.get(codepoint);
  const promise = fetch(`https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/lottie.json`)
    .then(res => { if (!res.ok) throw new Error('нет анимированной версии для этого эмодзи'); return res.json(); })
    .catch(() => null);
  emojiLottieCache.set(codepoint, promise);
  return promise;
}
// Рендерит эмодзи в container: реальная Lottie-анимация, если доступна, иначе обычный текстовый эмодзи
function renderAnimatedEmoji(container, emoji, { loop = false } = {}) {
  container.textContent = emoji; // сразу показываем статичный эмодзи, пока грузится анимация
  const codepoint = emojiToNotoCodepoint(emoji);
  getEmojiLottie(codepoint).then(data => {
    if (data && window.lottie && container.isConnected) {
      container.textContent = '';
      lottie.loadAnimation({ container, renderer: 'svg', loop, autoplay: true, animationData: data });
    }
  });
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23343450"/%3E%3C/svg%3E';

// Если сообщение целиком состоит из 1-3 эмодзи (без текста) — показываем его
// крупно и с реальной анимацией, как это делает Telegram для эмодзи-стикеров.
function getEmojiOnlyInfo(text) {
  const stripped = (text || '').replace(/\s+/g, '');
  if (!stripped) return null;
  const emojiOnlyRegex = /^(\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic})*\ufe0f?)+$/u;
  if (!emojiOnlyRegex.test(stripped)) return null;
  let graphemes;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    graphemes = Array.from(new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(stripped), s => s.segment);
  } else {
    graphemes = Array.from(stripped); // грубая оценка, если Intl.Segmenter недоступен
  }
  return graphemes.length > 0 && graphemes.length <= 3 ? { graphemes } : null;
}

function setLoginMode(mode) {
  isLoginMode = mode;
  if (mode) {
    nicknameGroup.style.display = 'none';
    regPhoneGroup.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'none';
    passwordInput.autocomplete = 'current-password';
    authToggle.innerHTML = 'Нет аккаунта? <a href="#" id="switch-to-register">Создать</a>';
  } else {
    nicknameGroup.style.display = 'block';
    regPhoneGroup.style.display = 'block';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'inline-flex';
    passwordInput.autocomplete = 'new-password';
    authToggle.innerHTML = 'Уже есть аккаунт? <a href="#" id="switch-to-login">Войти</a>';
  }
  const newLink = document.querySelector('#auth-toggle a');
  if (newLink) newLink.addEventListener('click', e => { e.preventDefault(); clearAuthError(); setLoginMode(!isLoginMode); });
}

// Аутентификация
async function registerUser(email, password, nickname, phone) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), { nickname, email, phone: phone || '', avatarUrl: '', animation: 'none', online: true, phoneReminderSent: !!phone, createdAt: serverTimestamp() });
  return cred.user;
}
async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
async function loadUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return snap.data();
  const def = { nickname: 'Пользователь', email: '', phone: '', avatarUrl: '', animation: 'none', online: true, phoneReminderSent: false };
  await setDoc(doc(db, 'users', uid), def);
  return def;
}

// Профиль и аватар
async function updateProfile(nickname, avatarUrl, phone) {
  if (!currentUser) return;
  const cleanAvatar = (avatarUrl && avatarUrl !== DEFAULT_AVATAR) ? avatarUrl : '';
  await updateDoc(doc(db, 'users', currentUser.uid), { nickname, avatarUrl: cleanAvatar, phone: phone || '' });
  currentUserData.nickname = nickname;
  currentUserData.avatarUrl = cleanAvatar;
  currentUserData.phone = phone || '';
  updateSidebarProfile();
}
function updateSidebarProfile() {
  currentUserNickname.textContent = currentUserData.nickname || 'Пользователь';
  if (currentUserData.avatarUrl) {
    sidebarAvatar.src = currentUserData.avatarUrl;
    sidebarAvatar.style.display = 'block';
  } else {
    sidebarAvatar.style.display = 'none';
  }
}
function compressImage(file, maxW=200, maxH=200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Файл повреждён или это не изображение'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) { if (width > maxW) { height *= maxW/width; width = maxW; } }
        else { if (height > maxH) { width *= maxH/height; height = maxH; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function maybeSendPhoneReminder(uid, data) {
  if (data.phone || data.phoneReminderSent) return;
  showLocalNotice(`${data.nickname || 'Пользователь'}, добавьте, пожалуйста, номер телефона в профиле.`);
  updateDoc(doc(db, 'users', uid), { phoneReminderSent: true }).catch(() => {});
  currentUserData.phoneReminderSent = true;
}
function showLocalNotice(text) {
  const notice = document.createElement('div');
  notice.className = 'local-notice';
  notice.textContent = text;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 6000);
}

// ============ Присутствие (online) ============
// БАГФИКС: раньше "в сети" определялось только по флагу online:true. Но если
// человек просто закрыл вкладку/приложение (не нажав "Выйти"), beforeunload
// часто не срабатывает (особенно на мобильных) — и online:true остаётся
// в базе навсегда, никто больше не пишет в этот документ. Теперь статус
// дополнительно проверяется по свежести lastActive: если heartbeat молчит
// дольше PRESENCE_TIMEOUT_MS — считаем человека офлайн, даже если флаг
// online в базе так и не был сброшен.
const PRESENCE_TIMEOUT_MS = 50000; // heartbeat раз в 25с — 50с тишины = офлайн
const presenceDataCache = new Map(); // uid -> последние сырые данные users/{uid}
function computeIsOnline(data) {
  if (!data || data.online !== true || !data.lastActive) return false;
  const lastMs = data.lastActive.toMillis ? data.lastActive.toMillis() : new Date(data.lastActive).getTime();
  return (Date.now() - lastMs) < PRESENCE_TIMEOUT_MS;
}
function refreshPresenceUI(uid) {
  const isOnline = computeIsOnline(presenceDataCache.get(uid));
  document.querySelectorAll(`.status-dot[data-uid="${uid}"]`).forEach(dot => dot.classList.toggle('online', isOnline));
  if (chatHeaderStatusDot.dataset.uid === uid) {
    chatHeaderStatusDot.classList.toggle('online', isOnline);
    chatHeaderSub.textContent = isOnline ? 'в сети' : 'не в сети';
    chatHeaderSub.classList.toggle('offline', !isOnline);
  }
}
// Раз в 15с пересчитываем статус даже без новых событий из Firestore — иначе
// "в сети" зависнет навечно у того, кто просто закрыл вкладку: новых
// снапшотов для его документа больше никогда не будет.
setInterval(() => { presenceDataCache.forEach((_, uid) => refreshPresenceUI(uid)); }, 15000);

function ensureUserStatusListener(uid) {
  if (!uid || userStatusListeners.has(uid)) return;
  const unsub = onSnapshot(doc(db, 'users', uid), snap => {
    presenceDataCache.set(uid, snap.exists() ? snap.data() : null);
    refreshPresenceUI(uid);
  });
  userStatusListeners.set(uid, unsub);
}
function clearUserStatusListeners() {
  userStatusListeners.forEach(unsub => unsub());
  userStatusListeners.clear();
  presenceDataCache.clear();
}
async function setOnline(state) {
  if (!currentUser) return;
  try { await updateDoc(doc(db, 'users', currentUser.uid), { online: state, lastActive: serverTimestamp() }); }
  catch (e) { /* нет соединения — не критично */ }
}
function startPresenceHeartbeat() {
  stopPresenceHeartbeat();
  setOnline(true);
  presenceInterval = setInterval(() => { if (!document.hidden) setOnline(true); }, 25000);
}
function stopPresenceHeartbeat() {
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
}
document.addEventListener('visibilitychange', () => {
  if (!currentUser) return;
  if (document.hidden) setOnline(false);
  else setOnline(true);
});
window.addEventListener('beforeunload', () => { setOnline(false); });

// ============ Личные и групповые чаты ============
function privateChatId(uidA, uidB) {
  return 'priv_' + [uidA, uidB].sort().join('_');
}

// Поиск пользователей по точному совпадению никнейма, email или телефона
async function searchUsers(term) {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const usersRef = collection(db, 'users');
  const fields = ['nickname', 'email', 'phone'];
  const found = new Map();
  for (const field of fields) {
    try {
      const snap = await getDocs(query(usersRef, where(field, '==', trimmed)));
      snap.forEach(d => {
        if (d.id !== currentUser.uid && !found.has(d.id)) found.set(d.id, { uid: d.id, ...d.data() });
      });
    } catch (e) { /* поле может отсутствовать у части документов — пропускаем */ }
  }
  return Array.from(found.values());
}

function renderSearchResults(results) {
  lastSearchResults = results;
  searchResultsEl.innerHTML = '';
  if (results.length === 0) {
    searchResultsEl.innerHTML = '<div class="search-empty">Никого не нашли. Проверьте правильность ввода.</div>';
    return;
  }
  results.forEach(user => {
    const alreadyStaged = stagedMembers.some(m => m.uid === user.uid);
    const item = document.createElement('div');
    item.className = 'search-result-item' + (newChatMode === 'group' && alreadyStaged ? ' added' : '');
    item.innerHTML = `
      <img class="avatar-small" src="${user.avatarUrl || DEFAULT_AVATAR}" alt="">
      <div class="search-result-info">
        <span class="search-result-name">${user.nickname || 'Пользователь'}</span>
        <span class="search-result-sub">${user.email || user.phone || ''}</span>
      </div>`;
    item.addEventListener('click', () => {
      if (newChatMode === 'private') {
        startPrivateChat(user);
      } else {
        addStagedMember(user);
        renderSearchResults(lastSearchResults);
      }
    });
    searchResultsEl.appendChild(item);
  });
}

function addStagedMember(user) {
  if (stagedMembers.some(m => m.uid === user.uid)) return;
  stagedMembers.push(user);
  renderStagedChips();
}
function removeStagedMember(uid) {
  stagedMembers = stagedMembers.filter(m => m.uid !== uid);
  renderStagedChips();
  renderSearchResults(lastSearchResults);
}
function renderStagedChips() {
  stagedMembersEl.innerHTML = '';
  stagedMembers.forEach(user => {
    const chip = document.createElement('div');
    chip.className = 'staged-chip';
    chip.innerHTML = `<img src="${user.avatarUrl || DEFAULT_AVATAR}" alt=""><span>${user.nickname || 'Пользователь'}</span>`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => removeStagedMember(user.uid));
    chip.appendChild(removeBtn);
    stagedMembersEl.appendChild(chip);
  });
}

async function startPrivateChat(otherUser) {
  const chatId = privateChatId(currentUser.uid, otherUser.uid);
  const chatRef = doc(db, 'chats', chatId);
  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      await setDoc(chatRef, {
        type: 'private',
        members: [currentUser.uid, otherUser.uid],
        memberInfo: {
          [currentUser.uid]: { nickname: currentUserData.nickname || 'Пользователь', avatarUrl: currentUserData.avatarUrl || '' },
          [otherUser.uid]: { nickname: otherUser.nickname || 'Пользователь', avatarUrl: otherUser.avatarUrl || '' }
        },
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (e) {
    alert('Не удалось открыть чат. Попробуйте ещё раз.');
    return;
  }
  selectChat(chatId, otherUser.nickname || 'Пользователь', { type: 'private', otherUid: otherUser.uid });
  closeNewChatModal();
}

async function createGroupChat() {
  if (stagedMembers.length === 0) return;
  const name = groupNameInput.value.trim() || 'Новая группа';
  const memberInfo = { [currentUser.uid]: { nickname: currentUserData.nickname || 'Пользователь', avatarUrl: currentUserData.avatarUrl || '' } };
  stagedMembers.forEach(u => { memberInfo[u.uid] = { nickname: u.nickname || 'Пользователь', avatarUrl: u.avatarUrl || '' }; });
  const membersArr = [currentUser.uid, ...stagedMembers.map(u => u.uid)];
  let docRef;
  try {
    docRef = await addDoc(collection(db, 'chats'), {
      type: 'group',
      name,
      members: membersArr,
      memberInfo,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    alert('Не удалось создать группу. Попробуйте ещё раз.');
    return;
  }
  selectChat(docRef.id, name, { type: 'group', memberCount: membersArr.length });
  closeNewChatModal();
}

function refreshActiveChatHighlight() {
  document.querySelectorAll('.chat-item').forEach(i => i.classList.toggle('active', i.dataset.chatId === activeChatId));
}

function selectChat(chatId, title, meta) {
  if (activeChatId === chatId) return;
  activeChatId = chatId;
  currentChatTitle.textContent = title;
  subscribeToMessages(chatId);
  updateChatHeaderMeta(meta || { type: 'general' });
  refreshActiveChatHighlight();
  if (window.innerWidth <= 768) closeMobileSidebar();
}

function updateChatHeaderMeta(meta) {
  if (unsubscribeHeaderPresence) { unsubscribeHeaderPresence(); unsubscribeHeaderPresence = null; }
  if (meta.type === 'private' && meta.otherUid) {
    chatHeaderAvatarWrap.style.display = 'flex';
    chatHeaderStatusDot.dataset.uid = meta.otherUid;
    chatHeaderStatusDot.classList.remove('online');
    unsubscribeHeaderPresence = onSnapshot(doc(db, 'users', meta.otherUid), snap => {
      const data = snap.exists() ? snap.data() : {};
      chatHeaderAvatar.src = data.avatarUrl || DEFAULT_AVATAR;
      presenceDataCache.set(meta.otherUid, data);
      refreshPresenceUI(meta.otherUid);
    });
  } else if (meta.type === 'group') {
    chatHeaderAvatarWrap.style.display = 'none';
    delete chatHeaderStatusDot.dataset.uid; // иначе периодическая ревалидация presence перепишет текст шапки
    chatHeaderSub.textContent = `${meta.memberCount || ''} участник(ов)`.trim();
    chatHeaderSub.classList.remove('offline');
  } else {
    chatHeaderAvatarWrap.style.display = 'none';
    delete chatHeaderStatusDot.dataset.uid; // иначе периодическая ревалидация presence перепишет текст шапки
    chatHeaderSub.textContent = meta.subtitle || 'Открытый чат для всех';
    chatHeaderSub.classList.remove('offline');
  }
}

function subscribeToChatList() {
  if (unsubscribeChatList) { unsubscribeChatList(); unsubscribeChatList = null; }
  const qRef = query(collection(db, 'chats'), where('members', 'array-contains', currentUser.uid), orderBy('updatedAt', 'desc'));
  unsubscribeChatList = onSnapshot(qRef, snap => {
    chatList.querySelectorAll('.dynamic-chat-item').forEach(el => el.remove());
    snap.forEach(docSnap => {
      const data = docSnap.data();
      chatList.appendChild(renderChatListItem(docSnap.id, data));
    });
    refreshActiveChatHighlight();
  }, (err) => {
    console.error('Ошибка подписки на список чатов (проверьте составной индекс Firestore: members array-contains + updatedAt desc):', err);
  });
}

function renderChatListItem(chatId, data) {
  const li = document.createElement('li');
  li.className = 'chat-item dynamic-chat-item';
  li.dataset.chatId = chatId;
  li.dataset.type = data.type;

  let iconHtml, name, preview;
  if (data.type === 'private') {
    const otherUid = (data.members || []).find(m => m !== currentUser.uid);
    const info = (data.memberInfo && data.memberInfo[otherUid]) || {};
    li.dataset.otherUid = otherUid || '';
    name = info.nickname || 'Пользователь';
    preview = data.lastMessage?.text || 'Нет сообщений';
    iconHtml = `<div class="avatar-wrap"><img class="chat-avatar" src="${info.avatarUrl || DEFAULT_AVATAR}" alt=""><span class="status-dot" data-uid="${otherUid || ''}"></span></div>`;
    if (otherUid) ensureUserStatusListener(otherUid);
  } else {
    name = data.name || 'Группа';
    preview = data.lastMessage?.text || `${(data.members || []).length} участников`;
    li.dataset.memberCount = (data.members || []).length;
    iconHtml = `<span class="chat-icon">👥</span>`;
  }

  li.innerHTML = `
    ${iconHtml}
    <div class="chat-item-text">
      <span class="chat-name">${name}</span>
      <span class="chat-preview">${preview}</span>
    </div>`;
  return li;
}

// Модальное окно "Новый чат"
function setNewChatMode(mode) {
  newChatMode = mode;
  modePrivateBtn.classList.toggle('active', mode === 'private');
  modeGroupBtn.classList.toggle('active', mode === 'group');
  groupNameGroup.style.display = mode === 'group' ? 'block' : 'none';
  createGroupBtn.style.display = mode === 'group' ? 'inline-flex' : 'none';
  stagedMembersEl.style.display = mode === 'group' ? 'flex' : 'none';
  searchHint.textContent = mode === 'private'
    ? 'Введите точное совпадение никнейма, email или номера телефона собеседника.'
    : 'Найдите и добавьте участников будущей группы, затем нажмите «Создать группу».';
}
function openNewChatModal() {
  setNewChatMode('private');
  stagedMembers = [];
  renderStagedChips();
  userSearchInput.value = '';
  searchResultsEl.innerHTML = '';
  groupNameInput.value = '';
  newChatModal.style.display = 'flex';
}
function closeNewChatModal() {
  newChatModal.style.display = 'none';
}
modePrivateBtn.addEventListener('click', () => setNewChatMode('private'));
modeGroupBtn.addEventListener('click', () => setNewChatMode('group'));
newChatBtn.addEventListener('click', openNewChatModal);
closeNewChatBtn.addEventListener('click', closeNewChatModal);
userSearchBtn.addEventListener('click', async () => {
  const results = await searchUsers(userSearchInput.value);
  renderSearchResults(results);
});
userSearchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); userSearchBtn.click(); }
});
createGroupBtn.addEventListener('click', createGroupChat);

// Чат
function subscribeToMessages(chatId) {
  if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
  messagesList.innerHTML = '';
  let firstBatch = true;
  const qRef = query(collection(db, 'messages'), where('chatId','==',chatId), orderBy('timestamp','asc'));
  unsubscribeMessages = onSnapshot(qRef, snap => {
    const wasAtBottom = isScrolledToBottom();
    let added = false;
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        addMessageToUI(change.doc.id, change.doc.data());
        added = true;
      } else if (change.type === 'modified') {
        updateMessageTimeInUI(change.doc.id, change.doc.data());
      }
    });
    if (added && (firstBatch || wasAtBottom)) scrollToBottom();
    firstBatch = false;
  }, (err) => {
    console.error('Ошибка подписки на сообщения (проверьте составной индекс Firestore: chatId == + timestamp asc):', err);
  });
}
function updateMessageTimeInUI(id, data) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;
  const timeEl = el.querySelector('.message-time');
  if (timeEl) timeEl.textContent = formatTime(data.timestamp);
}
function addMessageToUI(id, data) {
  if (document.getElementById(`msg-${id}`)) return;

  if (data.system) {
    const sysEl = document.createElement('div');
    sysEl.id = `msg-${id}`;
    sysEl.className = 'message system-message';
    const bubble = document.createElement('div');
    bubble.className = 'system-bubble';
    bubble.innerHTML = linkify(data.text);
    sysEl.appendChild(bubble);
    messagesList.appendChild(sysEl);
    return;
  }

  const isOwn = currentUser && data.userId === currentUser.uid;
  const msgEl = document.createElement('div');
  msgEl.id = `msg-${id}`;
  msgEl.className = `message ${isOwn ? 'own' : 'other'}`;

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'message-avatar-wrap avatar-wrap';
  const avatarImg = document.createElement('img');
  avatarImg.className = 'message-avatar';
  avatarImg.src = data.userAvatarUrl || DEFAULT_AVATAR;
  avatarImg.alt = 'avatar';
  const statusDot = document.createElement('span');
  statusDot.className = 'status-dot';
  if (data.userId) statusDot.dataset.uid = data.userId;
  avatarWrap.appendChild(avatarImg);
  avatarWrap.appendChild(statusDot);

  const body = document.createElement('div');
  body.className = 'message-body';
  const header = document.createElement('div');
  header.className = 'message-header';
  header.innerHTML = `<span class="message-username">${data.userName || 'Пользователь'}</span><span class="message-time">${formatTime(data.timestamp)}</span>`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  const emojiInfo = getEmojiOnlyInfo(data.text);
  if (emojiInfo) {
    bubble.classList.add('emoji-only');
    emojiInfo.graphemes.forEach(g => {
      const anim = document.createElement('span');
      anim.className = 'emoji-anim';
      bubble.appendChild(anim);
      renderAnimatedEmoji(anim, g);
    });
    bubble.addEventListener('click', () => {
      bubble.querySelectorAll('.emoji-anim').forEach((anim, i) => renderAnimatedEmoji(anim, emojiInfo.graphemes[i]));
    });
  } else {
    bubble.innerHTML = linkify(data.text);
  }
  body.appendChild(header);
  body.appendChild(bubble);

  msgEl.appendChild(avatarWrap);
  msgEl.appendChild(body);
  messagesList.appendChild(msgEl);

  if (data.userId) ensureUserStatusListener(data.userId);
}
async function sendMessage(text) {
  if (!currentUser || !currentUserData) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    await addDoc(collection(db, 'messages'), {
      text: trimmed,
      userId: currentUser.uid,
      userName: currentUserData.nickname || 'Пользователь',
      userAvatarUrl: currentUserData.avatarUrl || '',
      chatId: activeChatId,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    alert('Не удалось отправить сообщение. Проверьте подключение к интернету и попробуйте ещё раз.');
    return; // текст остаётся в поле ввода — пользователь не теряет написанное
  }
  messageInput.value = '';
  if (activeChatId !== 'general') {
    try {
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: { text: trimmed, senderId: currentUser.uid, timestamp: serverTimestamp() },
        updatedAt: serverTimestamp()
      });
    } catch (e) { /* не критично для отправки самого сообщения */ }
  }
}

// Эмодзи
const emojis = ['😀','😂','😍','😎','🥳','😢','😡','👍','👎','❤️','🔥','🎉','💡','✨','🙈','🍕','🚀','⭐','⚡','💬','✅','❌','🤔','👀','💪','🙏','🤗','😴','🤩','😇'];
function renderEmojiPanel() {
  emojiPanel.innerHTML = '';
  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    let hoverAnim = null;
    span.addEventListener('mouseenter', () => {
      const codepoint = emojiToNotoCodepoint(emoji);
      getEmojiLottie(codepoint).then(data => {
        if (data && window.lottie && span.matches(':hover')) {
          span.textContent = '';
          hoverAnim = lottie.loadAnimation({ container: span, renderer: 'svg', loop: true, autoplay: true, animationData: data });
        }
      });
    });
    span.addEventListener('mouseleave', () => {
      if (hoverAnim) { hoverAnim.destroy(); hoverAnim = null; }
      span.textContent = emoji;
    });
    span.addEventListener('click', () => {
      span.classList.remove('emoji-pop');
      void span.offsetWidth;
      span.classList.add('emoji-pop');
      messageInput.value += emoji;
      messageInput.focus();
      setTimeout(() => { emojiPanel.style.display = 'none'; }, 150);
    });
    emojiPanel.appendChild(span);
  });
}
renderEmojiPanel();
emojiBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'grid' : 'none';
});
document.addEventListener('click', () => { emojiPanel.style.display = 'none'; });

// Анимации фона
function clearAnimation() {
  const old = mainChat.querySelector('.animation-container');
  if (old) old.remove();
  if (animationInterval) clearInterval(animationInterval);
}
function startAnimation(type) {
  clearAnimation();
  if (type === 'none') return;
  const container = document.createElement('div');
  container.className = 'animation-container';
  mainChat.appendChild(container);
  const count = type === 'rain' ? 40 : 20;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = `particle ${type}`;
    const left = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = 4 + Math.random() * 6;
    particle.style.left = left + '%';
    particle.style.animationDelay = delay + 's';
    particle.style.animationDuration = duration + 's';
    container.appendChild(particle);
  }
  animationInterval = setInterval(() => {
    const container = mainChat.querySelector('.animation-container');
    if (!container) return;
    const newParticle = document.createElement('div');
    newParticle.className = `particle ${type}`;
    newParticle.style.left = Math.random() * 100 + '%';
    newParticle.style.animationDelay = '0s';
    newParticle.style.animationDuration = (4 + Math.random() * 6) + 's';
    container.appendChild(newParticle);
  }, 2000);
}

// Настройки
async function applyCurrentAnimation() {
  const anim = currentUserData.animation || 'none';
  animationSelect.value = anim;
  startAnimation(anim);
}
settingsBtn.addEventListener('click', () => {
  animationSelect.value = currentUserData.animation || 'none';
  settingsModal.style.display = 'flex';
});
closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
saveSettingsBtn.addEventListener('click', async () => {
  const newAnim = animationSelect.value;
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { animation: newAnim });
  } catch (e) {
    alert('Не удалось сохранить настройки. Попробуйте ещё раз.');
    return;
  }
  currentUserData.animation = newAnim;
  startAnimation(newAnim);
  settingsModal.style.display = 'none';
});

// Обработчики авторизации
authForm.addEventListener('submit', async (e) => {
  e.preventDefault(); clearAuthError();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const nickname = nicknameInput.value.trim();
  const regPhone = regPhoneInput.value.trim();
  if (!email||!password) return displayAuthError('Введите email и пароль');
  if (!isLoginMode && !nickname) return displayAuthError('Придумайте никнейм');
  try {
    isLoginMode ? await loginUser(email, password) : await registerUser(email, password, nickname, regPhone);
  } catch (err) {
    let msg='Ошибка'; if (err.code) {
      if (err.code.includes('email-already')) msg='Email занят';
      else if (err.code.includes('invalid-email')) msg='Неверный email';
      else if (err.code.includes('weak-password')) msg='Пароль минимум 6 символов';
      else if (err.code.includes('user-not-found')||err.code.includes('wrong-password')||err.code.includes('invalid-credential')) msg='Неверные данные';
    }
    displayAuthError(msg);
  }
});
switchLink.addEventListener('click', e=>{ e.preventDefault(); clearAuthError(); setLoginMode(false); });
logoutBtn.addEventListener('click', async ()=>{
  if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
  clearAnimation();
  stopPresenceHeartbeat();
  await setOnline(false);
  await signOut(auth);
});
messageForm.addEventListener('submit', e=>{ e.preventDefault(); sendMessage(messageInput.value); });
profileBtn.addEventListener('click', ()=>{
  profileNickname.value = currentUserData.nickname || '';
  profilePhone.value = currentUserData.phone || '';
  profileAvatarPreview.src = currentUserData.avatarUrl || DEFAULT_AVATAR;
  profileModal.style.display = 'flex';
});
closeModalBtn.addEventListener('click', ()=> profileModal.style.display='none');
avatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Пожалуйста, выберите файл изображения.'); avatarInput.value = ''; return; }
  try {
    const dataUrl = await compressImage(file);
    profileAvatarPreview.src = dataUrl;
  } catch (err) {
    alert('Не удалось загрузить изображение. Попробуйте другой файл.');
  }
  avatarInput.value = ''; // сбрасываем, чтобы повторный выбор того же файла тоже сработал
});
saveProfileBtn.addEventListener('click', async ()=>{
  const newNick = profileNickname.value.trim() || currentUserData.nickname;
  const newAvatar = profileAvatarPreview.src;
  const newPhone = profilePhone.value.trim();
  try {
    await updateProfile(newNick, newAvatar, newPhone);
  } catch (e) {
    alert('Не удалось сохранить профиль. Попробуйте ещё раз.');
    return;
  }
  profileModal.style.display = 'none';
});

// Переключение чата
chatList.addEventListener('click', e=>{
  const item = e.target.closest('.chat-item');
  if(!item) return;
  const id = item.dataset.chatId;
  const name = item.querySelector('.chat-name').textContent;
  const type = item.dataset.type || 'general';
  const meta = type === 'private'
    ? { type: 'private', otherUid: item.dataset.otherUid }
    : type === 'group'
      ? { type: 'group', memberCount: item.dataset.memberCount }
      : { type: 'general', subtitle: id === 'support' ? 'Мы поможем с любым вопросом' : 'Открытый чат для всех' };
  if (activeChatId !== id) {
    activeChatId = id;
    currentChatTitle.textContent = name;
    subscribeToMessages(id);
    updateChatHeaderMeta(meta);
  }
  refreshActiveChatHighlight();
  if(window.innerWidth<=768) closeMobileSidebar();
});

// Мобильное меню
function openMobileSidebar() {
  sidebar.classList.add('open');
  sidebarScrim.classList.add('show');
}
function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarScrim.classList.remove('show');
}
document.getElementById('menu-toggle').addEventListener('click', openMobileSidebar);
document.getElementById('close-sidebar').addEventListener('click', closeMobileSidebar);
sidebarScrim.addEventListener('click', closeMobileSidebar);

// Слежение за авторизацией
onAuthStateChanged(auth, async user => {
  authStateKnown = true;
  if (user) {
    currentUser = user;
    currentUserData = await loadUserData(user.uid);
    updateSidebarProfile();
    if (selfStatusDot) selfStatusDot.classList.add('online');
    showScreen(chatScreen);
    subscribeToMessages(activeChatId);
    subscribeToChatList();
    applyCurrentAnimation();
    startPresenceHeartbeat();
    maybeSendPhoneReminder(user.uid, currentUserData);
  } else {
    currentUser=null; currentUserData={nickname:'',avatarUrl:'',animation:'none'};
    if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
    if(unsubscribeChatList){unsubscribeChatList();unsubscribeChatList=null;}
    if(unsubscribeHeaderPresence){unsubscribeHeaderPresence();unsubscribeHeaderPresence=null;}
    clearAnimation();
    stopPresenceHeartbeat();
    clearUserStatusListeners();
    closeMobileSidebar();
    chatList.querySelectorAll('.dynamic-chat-item').forEach(el => el.remove());
    activeChatId = 'general';
    currentChatTitle.textContent = 'Общий чат';
    updateChatHeaderMeta({ type: 'general' });
    document.querySelectorAll('.chat-item').forEach(i=>i.classList.toggle('active', i.dataset.chatId==='general'));
    messagesList.innerHTML='';
    showScreen(authScreen);
    emailInput.value=''; passwordInput.value=''; nicknameInput.value=''; regPhoneInput.value='';
    clearAuthError(); setLoginMode(true);
  }
  maybeHideSplash();
});
setLoginMode(true);

// ============ Регистрация Service Worker + автообнаружение обновлений ============
// Идея: при каждой замене файлов на хостинге (например, при пуше на GitHub)
// браузер сам заметит, что sw.js изменился побайтово, скачает новую версию
// в фоне и поставит её в режим "waiting". Мы это ловим и показываем баннер
// с кнопкой "Обновить" — вручную сбрасывать кеш или что-либо ещё не нужно.
let swAlreadyReloading = false; // объявлен на уровне модуля — используется и ниже, и в showUpdateBanner
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(registration => {
      // Уже есть где-то в очереди новая версия, ждущая активации (например,
      // человек открыл вкладку уже после того, как обновление подгрузилось)
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration);
      }
      // Новая версия начала устанавливаться прямо сейчас, пока вкладка открыта
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // controller уже есть -> это не первая установка, а именно апдейт
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
          }
        });
      });
      // Активная вкладка не перечитывает sw.js сама по себе часами — подстёгиваем
      // проверку при возврате в приложение и раз в час на всякий случай.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {
      // Если регистрация не удалась (например, страница открыта как file://),
      // приложение продолжает работать в обычном режиме — просто без PWA-фич.
    });
  });

  // Как только новый SW реально взял управление страницей (после нашей
  // команды SKIP_WAITING) — перезагружаем один раз, чтобы подхватить свежие
  // index.html/app.js/style.css без ручного вмешательства пользователя.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swAlreadyReloading) return;
    swAlreadyReloading = true;
    window.location.reload();
  });
}

function showUpdateBanner(registration) {
  if (document.querySelector('.update-banner')) return; // уже показан
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  const text = document.createElement('span');
  text.textContent = 'Доступно обновление «Искры»';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Обновить';
  btn.addEventListener('click', () => {
    if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
    btn.disabled = true;
    btn.textContent = 'Обновляем…';
    // БАГФИКС: страховка на случай, если controllerchange по какой-то причине
    // не сработает (например, registration.waiting неожиданно оказался пуст) —
    // без этого кнопка зависла бы навсегда с надписью "Обновляем…", а
    // перезагрузки так и не произошло бы.
    setTimeout(() => {
      if (!swAlreadyReloading) { swAlreadyReloading = true; window.location.reload(); }
    }, 4000);
  });
  banner.appendChild(text);
  banner.appendChild(btn);
  document.body.insertBefore(banner, document.body.firstChild);
}
