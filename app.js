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
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, deleteField, runTransaction, Timestamp } from 'firebase/firestore';

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
const appVersionAuthEl = document.getElementById('app-version-auth');
const appVersionSidebarEl = document.getElementById('app-version-sidebar');
const messagesContainer = document.getElementById('messages-container');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const composerLockedNotice = document.getElementById('composer-locked-notice');
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
const settingsTabChatBtn = document.getElementById('settings-tab-chat-btn');
const settingsTabUpdateBtn = document.getElementById('settings-tab-update-btn');
const settingsTabChatPanel = document.getElementById('settings-tab-chat');
const settingsTabUpdatePanel = document.getElementById('settings-tab-update');
const updateStatusCard = document.getElementById('update-status-card');
const updateStatusIcon = document.getElementById('update-status-icon');
const updateStatusTitle = document.getElementById('update-status-title');
const updateStatusSubtitle = document.getElementById('update-status-subtitle');
const checkUpdateBtn = document.getElementById('check-update-btn');
const updateAllBtn = document.getElementById('update-all-btn');
const updateListEl = document.getElementById('update-list');
const settingsUpdateDot = document.getElementById('settings-update-dot');
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
const statusNavBtn = document.getElementById('status-nav-btn');
const statusModal = document.getElementById('status-modal');
const closeStatusModalBtn = document.getElementById('close-status-modal');
const myStatusRow = document.getElementById('my-status-row');
const statusAddForm = document.getElementById('status-add-form');
const statusTextInput = document.getElementById('status-text-input');
const statusImageInput = document.getElementById('status-image-input');
const statusImagePreview = document.getElementById('status-image-preview');
const statusPublishBtn = document.getElementById('status-publish-btn');
const statusCancelBtn = document.getElementById('status-cancel-btn');
const statusListEl = document.getElementById('status-list');
const statusViewer = document.getElementById('status-viewer');
const statusViewerAvatar = document.getElementById('status-viewer-avatar');
const statusViewerName = document.getElementById('status-viewer-name');
const statusViewerTime = document.getElementById('status-viewer-time');
const statusViewerClose = document.getElementById('status-viewer-close');
const statusViewerImage = document.getElementById('status-viewer-image');
const statusViewerText = document.getElementById('status-viewer-text');
const statusViewerViewersWrap = document.getElementById('status-viewer-viewers');
const statusViewersList = document.getElementById('status-viewers-list');

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
let unsubscribeStatuses = null;
let currentStatuses = []; // все активные (не старше 24ч) статусы из подписки
let pendingStatusImage = ''; // сжатое изображение перед публикацией статуса
let statusCleanupInterval = null;

const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

// ============ Индикатор "печатает…" ============
let activeChatMeta = { type: 'general' };
let chatHeaderBaseSub = '';
let chatHeaderBaseOffline = false;
let unsubscribeTyping = null;
let typingRawData = {}; // сырые данные документа typing/{chatId}: uid -> Timestamp
let othersTyping = new Set(); // uid других пользователей, которые печатают прямо сейчас (свежие записи)
let isTypingActive = false; // отправили ли мы уже свой "печатает" в текущий чат
let typingStopTimeout = null;
let typingBubbleEl = null;
let typingKeepAliveInterval = null;
const TYPING_IDLE_MS = 3000; // пауза в наборе текста, после которой считаем что человек перестал печатать
const TYPING_STALE_MS = 8000; // на случай если чужая вкладка закрылась и не успела отправить "стоп" — не показываем индикатор вечно
const TYPING_KEEPALIVE_MS = 4000; // обновление метки времени, пока человек печатает без пауз дольше TYPING_STALE_MS

// ============ Версия приложения ============
const APP_VERSION = '10.2.0';
const versionLabel = `Версия Искры ${APP_VERSION}`;
if (appVersionAuthEl) appVersionAuthEl.textContent = versionLabel;
if (appVersionSidebarEl) appVersionSidebarEl.textContent = versionLabel;

// ============ История обновлений (для вкладки "Обновление и безопасность") ============
// Пополняется вручную при каждом релизе — одной строкой выше по версии.
// Отображается в настройках как накопленный список уже установленных обновлений;
// самая свежая запись должна совпадать с APP_VERSION.
const UPDATE_CHANGELOG = [
  {
    version: '10.2.0',
    date: '28.08.2026',
    notes: [
      'Новая вкладка «Обновление и безопасность» в настройках',
      'Ручная проверка обновлений и установка всех накопленных обновлений одним нажатием',
      'История обновлений теперь хранится в приложении, а не только во всплывающем баннере'
    ]
  },
  {
    version: '10.1.3',
    date: '—',
    notes: [
      'Повышена стабильность статусов «в сети» / «не в сети»',
      'Быстрый повторный запрос статуса при обрыве связи вместо ожидания следующего тика',
      'Статус «офлайн» теперь дублируется при закрытии вкладки на iOS и мобильных браузерах',
      'Статус «в сети» при восстановлении соединения отправляется мгновенно'
    ]
  },
  {
    version: '10.1.2',
    date: '—',
    notes: [
      'Ускорен запуск приложения: анимация эмодзи (lottie-web) теперь загружается только при реальной необходимости'
    ]
  },
  {
    version: '10.1.1',
    date: '—',
    notes: [
      'Добавлены фоновые анимации чата: сакура, дождь, листья',
      'Исправлены мелкие ошибки в групповых чатах'
    ]
  },
  {
    version: '10.1.0',
    date: '—',
    notes: [
      'Добавлены статусы (бета) — фото и текст на 24 часа',
      'Добавлено создание групповых чатов',
      'Добавлен поиск собеседников по никнейму, email или телефону'
    ]
  }
];

// ============ Оптимизация для слабых ПК/ноутбуков и телефонов ============
// Определяем один раз при загрузке, "слабое" ли устройство: мало ядер CPU,
// мало оперативной памяти, тач-экран (телефоны/планшеты — там всегда нет
// ховера, и обычно GPU слабее, чем у настольного ПК) или системная настройка
// "уменьшить анимации". По этому классу CSS сам снижает интенсивность самых
// дорогих эффектов (backdrop-filter blur и т.п.), а JS ниже уменьшает число
// частиц фоновой анимации — так одна и та же кодовая база остаётся плавной
// и на мощном ПК, и на бюджетном телефоне.
const isTouchDevice = window.matchMedia('(hover:none), (pointer:coarse)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isLowPowerDevice = isTouchDevice || prefersReducedMotion
  || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
  || (navigator.deviceMemory && navigator.deviceMemory <= 4);
if (isLowPowerDevice) document.documentElement.classList.add('low-power');

// lottie-web грузим лениво: он нужен только для анимации эмодзи по наведению
// (актуально на ПК/ноутбуках с мышью), а весит ощутимо — на слабых
// устройствах и телефонах (где наведения нет вовсе) незачем тратить на него
// память и время CPU при каждом старте приложения.
let lottieLoadPromise = null;
function loadLottieForce() {
  if (window.lottie) return Promise.resolve(true);
  if (!lottieLoadPromise) {
    lottieLoadPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
  return lottieLoadPromise;
}
function ensureLottieLoaded() {
  if (isTouchDevice) return Promise.resolve(false); // на тач-устройствах ховера нет — не грузим вообще
  return loadLottieForce();
}

// ============ Чат поддержки: только чтение ============
// В чате поддержки теперь публикуются новости, обновления и исправления —
// это односторонний канал информации, писать туда нельзя.
const SUPPORT_CHAT_ID = 'support';
function updateComposerAccess(chatId) {
  const locked = chatId === SUPPORT_CHAT_ID;
  messageForm.style.display = locked ? 'none' : 'flex';
  composerLockedNotice.classList.toggle('show', locked);
}

// ============ Splash screen ============
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

// БАГФИКС (безопасность): раньше никнеймы, названия групп, тексты сообщений
// и статусов вставлялись через innerHTML БЕЗ экранирования. Любой пользователь
// мог зарегистрироваться с никнеймом вида `<img src=x onerror=alert(1)>` или
// отправить такое в сообщении — это выполнилось бы в браузере всех остальных
// (классическая stored-XSS). Теперь весь пользовательский текст обязательно
// экранируется перед вставкой в HTML.
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function linkify(text) {
  const escaped = escapeHtml(text);
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  return escaped.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
// ============ Реальные анимированные эмодзи (Google Noto Animated Emoji) ============
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
// БАГФИКС (утечка производительности, особенно заметна на телефонах): раньше
// при повторном вызове для уже занятого контейнера (например, пользователь
// несколько раз подряд тапнул по эмодзи-сообщению, чтобы переиграть анимацию)
// предыдущий экземпляр Lottie-плеера не уничтожался — он просто терял свой
// DOM-узел (container.textContent = emoji перезаписывал разметку), но сам
// плеер молча продолжал работать в фоне и жечь CPU/батарею. При частых тапах
// таких "невидимых" плееров могло накопиться много. Теперь перед созданием
// новой анимации существующий экземпляр явно уничтожается через .destroy().
function renderAnimatedEmoji(container, emoji, { loop = false } = {}) {
  if (container._lottieInstance) {
    container._lottieInstance.destroy();
    container._lottieInstance = null;
  }
  container.textContent = emoji;
  const codepoint = emojiToNotoCodepoint(emoji);
  // Эта анимация — сама суть крупных emoji-only сообщений (не только hover-эффект),
  // поэтому здесь lottie грузим всегда, включая телефоны — в отличие от
  // подсветки эмодзи в панели наведением, которая на тач-экранах вообще не нужна.
  Promise.all([getEmojiLottie(codepoint), loadLottieForce()]).then(([data, ok]) => {
    if (data && ok && window.lottie && container.isConnected) {
      container.textContent = '';
      container._lottieInstance = lottie.loadAnimation({ container, renderer: 'svg', loop, autoplay: true, animationData: data });
    }
  });
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23343450"/%3E%3C/svg%3E';

function getEmojiOnlyInfo(text) {
  const stripped = (text || '').replace(/\s+/g, '');
  if (!stripped) return null;
  const emojiOnlyRegex = /^(\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic})*\ufe0f?)+$/u;
  if (!emojiOnlyRegex.test(stripped)) return null;
  let graphemes;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    graphemes = Array.from(new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(stripped), s => s.segment);
  } else {
    graphemes = Array.from(stripped);
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
// БАГФИКС (совместимость с телефоном): раньше сжатие изображения всегда шло
// через <img> + <canvas>, а Canvas игнорирует EXIF-тег ориентации, который
// камеры телефонов почти всегда пишут в файл (в отличие от скриншотов или
// вебкамер на ноутбуке, где такого тега обычно нет). В результате фото,
// снятое прямо на телефон (особенно в портретном режиме), после сжатия
// оказывалось повёрнутым на 90/180 градусов — и в аватаре, и в статусе.
// Теперь мы в первую очередь используем createImageBitmap с опцией
// imageOrientation:'from-image' (она поддерживается всеми современными
// мобильными и десктопными браузерами и сама поворачивает пиксели по EXIF
// перед тем как мы их нарисуем на canvas). Старый способ через Image()
// оставлен как запасной вариант для редких браузеров без этой опции.
function compressImage(file, maxW=200, maxH=200, quality=0.7) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .then(bitmap => {
        const canvas = document.createElement('canvas');
        let { width, height } = bitmap;
        // БАГФИКС: раньше маленькие исходники (меньше maxW/maxH) всё равно
        // проходили через canvas без апскейла — это не портило качество, но
        // приводило к путанице при отладке. Явно не увеличиваем изображение,
        // если оно и так меньше целевого размера — качество только теряется
        // от лишнего прохода через JPEG-кодирование, а не приобретается.
        if (width > maxW || height > maxH) {
          if (width > height) { height *= maxW/width; width = maxW; }
          else { width *= maxH/height; height = maxH; }
        }
        canvas.width = Math.round(width); canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas.toDataURL('image/jpeg', quality);
      })
      .catch(() => compressImageLegacy(file, maxW, maxH, quality));
  }
  return compressImageLegacy(file, maxW, maxH, quality);
}
function compressImageLegacy(file, maxW=200, maxH=200, quality=0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Файл повреждён или это не изображение'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          if (width > height) { height *= maxW/width; width = maxW; }
          else { width *= maxH/height; height = maxH; }
        }
        canvas.width = Math.round(width); canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
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
    setChatHeaderBase(isOnline ? 'в сети' : 'не в сети', !isOnline);
  }
}
setInterval(() => { presenceDataCache.forEach((_, uid) => refreshPresenceUI(uid)); }, 15000);

function ensureUserStatusListener(uid) {
  if (!uid) return;
  // БАГФИКС (видимость статуса онлайн/офлайн): раньше при повторном вызове
  // для уже отслеживаемого uid (например, точка статуса нового сообщения
  // или нового пункта в списке чатов от человека, за которым мы и так уже
  // следим) функция сразу выходила и ничего не делала. В итоге у ТОЛЬКО ЧТО
  // добавленного в DOM элемента не было своего актуального состояния —
  // точка оставалась в состоянии по умолчанию (невидима), пока не придёт
  // следующее обновление presence с сервера (до 25с) или не сработает общий
  // 15-секундный интервал синхронизации. Теперь при каждом вызове мы сразу
  // же применяем уже известное из кэша состояние к текущему DOM.
  if (userStatusListeners.has(uid)) { refreshPresenceUI(uid); return; }
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
// БАГФИКС (стабильность онлайн-статуса): раньше при обрыве связи ошибка
// записи просто проглатывалась и следующая попытка происходила только на
// очередном 25-секундном тике — в сумме человек мог напрасно висеть
// "офлайн" у собеседников почти все 50с таймаута из-за одной короткой
// просадки сети. Теперь при неудаче делаем один быстрый повтор через 3с,
// не дожидаясь общего интервала.
async function setOnline(state, isRetry) {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { online: state, lastActive: serverTimestamp() });
  } catch (e) {
    if (!isRetry) setTimeout(() => setOnline(state, true), 3000);
  }
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
// БАГФИКС (стабильность статуса на мобильных): 'beforeunload' на iOS Safari
// и в большинстве мобильных браузеров срабатывает ненадёжно — при закрытии
// вкладки/уходе в другое приложение событие часто не приходит вовсе, и
// человек ещё до 50с висел "в сети", уже покинув приложение. 'pagehide'
// поддерживается кроссбраузерно и на мобильных, поэтому слушаем оба.
function markOfflineOnLeave() { setOnline(false); }
window.addEventListener('beforeunload', markOfflineOnLeave);
window.addEventListener('pagehide', markOfflineOnLeave);
// БАГФИКС (быстрое восстановление статуса): раньше после обрыва и
// восстановления сети собственный статус "в сети" обновлялся только на
// следующем тике heartbeat (до 25с простоя). Теперь при возврате
// соединения (событие 'online') статус отправляется сразу.
window.addEventListener('online', () => { if (currentUser && !document.hidden) setOnline(true); });

// ============ Личные и групповые чаты ============
function privateChatId(uidA, uidB) {
  return 'priv_' + [uidA, uidB].sort().join('_');
}

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
      <img class="avatar-small" src="${escapeHtml(user.avatarUrl || DEFAULT_AVATAR)}" alt="">
      <div class="search-result-info">
        <span class="search-result-name">${escapeHtml(user.nickname || 'Пользователь')}</span>
        <span class="search-result-sub">${escapeHtml(user.email || user.phone || '')}</span>
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
    chip.innerHTML = `<img src="${escapeHtml(user.avatarUrl || DEFAULT_AVATAR)}" alt=""><span>${escapeHtml(user.nickname || 'Пользователь')}</span>`;
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
    // БАГФИКС (гонка при одновременном открытии чата): раньше здесь было
    // "прочитать через getDoc, и если документа нет — создать через setDoc".
    // Если два человека одновременно первый раз открывали переписку друг с
    // другом, оба могли успеть прочитать "документа ещё нет" ДО того, как
    // кто-то из них его создал, и тогда второй setDoc пытался перезаписать
    // уже существующий документ с другим createdBy — Правила Firestore
    // корректно это отклоняли (защищая исходного автора чата), но человек
    // при этом видел ошибку "Не удалось открыть чат" на пустом месте.
    // runTransaction делает "прочитать и создать" атомарно: если второй
    // клиент столкнётся с уже создающимся документом, Firestore сам
    // повторит его транзакцию — и при повторном чтении он увидит, что чат
    // уже существует, и просто ничего не станет создавать.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(chatRef);
      if (!snap.exists()) {
        tx.set(chatRef, {
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
    });
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
  // Прежде чем переключиться, сообщаем остальным, что мы прекратили печатать
  // в чате, который покидаем — иначе наш индикатор "печатает…" мог бы
  // "зависнуть" там до истечения TYPING_STALE_MS.
  stopTypingSignal();
  activeChatId = chatId;
  currentChatTitle.textContent = title;
  subscribeToMessages(chatId);
  subscribeToTyping(chatId);
  updateChatHeaderMeta(meta || { type: 'general' });
  updateComposerAccess(chatId);
  refreshActiveChatHighlight();
  if (window.innerWidth <= 768) closeMobileSidebar();
}

function updateChatHeaderMeta(meta) {
  if (unsubscribeHeaderPresence) { unsubscribeHeaderPresence(); unsubscribeHeaderPresence = null; }
  activeChatMeta = meta;
  if (meta.type === 'private' && meta.otherUid) {
    chatHeaderAvatarWrap.style.display = 'flex';
    chatHeaderStatusDot.dataset.uid = meta.otherUid;
    chatHeaderStatusDot.classList.remove('online');
    // БАГФИКС: раньше при переключении на личный чат аватар и подзаголовок
    // ("N участников" / "не в сети" от предыдущего чата) на мгновение
    // оставались от прошлого выбранного чата, пока не придёт первый ответ
    // onSnapshot — на медленной сети это было заметно. Теперь сбрасываем их
    // сразу же, синхронно, ещё до прихода данных.
    chatHeaderAvatar.src = DEFAULT_AVATAR;
    setChatHeaderBase('…', false);
    unsubscribeHeaderPresence = onSnapshot(doc(db, 'users', meta.otherUid), snap => {
      const data = snap.exists() ? snap.data() : {};
      chatHeaderAvatar.src = data.avatarUrl || DEFAULT_AVATAR;
      presenceDataCache.set(meta.otherUid, data);
      refreshPresenceUI(meta.otherUid);
    });
  } else if (meta.type === 'group') {
    chatHeaderAvatarWrap.style.display = 'none';
    delete chatHeaderStatusDot.dataset.uid;
    chatHeaderStatusDot.classList.remove('online');
    setChatHeaderBase(`${meta.memberCount || ''} участник(ов)`.trim(), false);
  } else {
    chatHeaderAvatarWrap.style.display = 'none';
    delete chatHeaderStatusDot.dataset.uid;
    chatHeaderStatusDot.classList.remove('online');
    setChatHeaderBase(meta.subtitle || 'Открытый чат для всех', false);
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
    iconHtml = `<div class="avatar-wrap"><img class="chat-avatar" src="${escapeHtml(info.avatarUrl || DEFAULT_AVATAR)}" alt=""><span class="status-dot" data-uid="${escapeHtml(otherUid || '')}"></span></div>`;
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
      <span class="chat-name">${escapeHtml(name)}</span>
      <span class="chat-preview">${escapeHtml(preview)}</span>
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
  typingBubbleEl = null; // старый элемент индикатора уже удалён вместе с innerHTML
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
    // Новые сообщения вставляются перед индикатором "печатает…", если он
    // сейчас показан на экране — он должен оставаться самым нижним элементом.
    if (typingBubbleEl && typingBubbleEl.isConnected) messagesList.appendChild(typingBubbleEl);
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
  const nameSpan = document.createElement('span');
  nameSpan.className = 'message-username';
  nameSpan.textContent = data.userName || 'Пользователь';
  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(data.timestamp);
  header.appendChild(nameSpan);
  header.appendChild(timeSpan);

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
    bubble.innerHTML = linkify(data.text); // linkify экранирует HTML перед вставкой ссылок
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
  // Чат поддержки — read-only канал новостей/обновлений: запрет на отправку
  // продублирован здесь (а не только скрытием формы), чтобы писать в него
  // было нельзя в принципе, независимо от того, как вызвана функция.
  if (activeChatId === SUPPORT_CHAT_ID) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  // Сообщение отправляется — сразу гасим свой индикатор "печатает…", не
  // дожидаясь таймаута бездействия (как в WhatsApp/Telegram).
  stopTypingSignal();

  // БАГФИКС: раньше chatId для обновления lastMessage/updatedAt читался из
  // глобальной activeChatId уже ПОСЛЕ await addDoc(...). Если человек успевал
  // переключиться на другой чат, пока сообщение ещё летело на сервер (что
  // занимает какое-то время при плохой сети), то итоговый updateDoc() уходил
  // не в тот чат — превью последнего сообщения и порядок сортировки в списке
  // чатов портились у чата, в который человек только что переключился, хотя
  // само сообщение на самом деле отправлялось в другой чат. Теперь id чата
  // фиксируется один раз в начале функции и используется везде внутри неё,
  // независимо от того, куда переключится пользователь дальше.
  const targetChatId = activeChatId;

  // БЫСТРАЯ ОТПРАВКА: поле ввода очищается сразу, не дожидаясь ответа сервера
  // (см. предыдущий фикс) — как в Telegram/WhatsApp.
  messageInput.value = '';
  messageInput.focus();

  try {
    await addDoc(collection(db, 'messages'), {
      text: trimmed,
      userId: currentUser.uid,
      userName: currentUserData.nickname || 'Пользователь',
      userAvatarUrl: currentUserData.avatarUrl || '',
      chatId: targetChatId,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    // Текст возвращаем в поле, только если пользователь всё ещё в том же
    // чате — иначе текст неотправленного сообщения из ОДНОГО чата подставился
    // бы в поле ввода СОВСЕМ ДРУГОГО чата, в который человек уже переключился.
    if (activeChatId === targetChatId) {
      messageInput.value = trimmed;
      messageInput.focus();
    }
    alert('Не удалось отправить сообщение. Проверьте подключение к интернету и попробуйте ещё раз.');
    return;
  }
  if (targetChatId !== 'general' && targetChatId !== 'support') {
    try {
      await updateDoc(doc(db, 'chats', targetChatId), {
        lastMessage: { text: trimmed, senderId: currentUser.uid, timestamp: serverTimestamp() },
        updatedAt: serverTimestamp()
      });
    } catch (e) { /* не критично для отправки самого сообщения */ }
  }
}

// ============ Индикатор "печатает…" (как в WhatsApp) ============
// Пока пользователь набирает сообщение, в Firestore обновляется документ
// typing/{chatId} вида { [uid]: serverTimestamp() }. Остальные участники
// чата подписаны на этот документ и, если запись свежая, показывают
// анимированные три точки внизу переписки и текст "печатает…" в шапке.
function typingDocRef(chatId) { return doc(db, 'typing', chatId); }

async function setTypingState(chatId, active) {
  if (!currentUser) return;
  try {
    if (active) {
      await setDoc(typingDocRef(chatId), { [currentUser.uid]: serverTimestamp() }, { merge: true });
    } else {
      await updateDoc(typingDocRef(chatId), { [currentUser.uid]: deleteField() });
    }
  } catch (e) {
    // Не критично: если запись "печатает" не ушла — просто никто её не увидит.
    // Если не получилось её убрать (например, документа ещё не существует) —
    // она сама перестанет считаться актуальной через TYPING_STALE_MS.
  }
}
function handleTypingInput() {
  if (!currentUser || activeChatId === SUPPORT_CHAT_ID) return;
  if (!isTypingActive) {
    isTypingActive = true;
    setTypingState(activeChatId, true);
    // БАГФИКС (индикатор гас у собеседника посреди набора длинного
    // сообщения): раньше serverTimestamp() в Firestore записывался только
    // один раз, в момент самого первого нажатия клавиши в этой "сессии"
    // набора текста — дальше каждое следующее нажатие лишь откладывало
    // локальный таймаут "когда считать, что человек остановился", но саму
    // запись в базе не обновляло. Если человек печатал без паузы дольше
    // TYPING_STALE_MS (8с) — например, длинное сообщение — эта метка
    // времени "протухала", и получатель видел, что индикатор "печатает…"
    // погас, хотя набор текста и не думал прекращаться. Теперь, пока идёт
    // непрерывный набор, метка времени в Firestore периодически обновляется.
    typingKeepAliveInterval = setInterval(() => setTypingState(activeChatId, true), TYPING_KEEPALIVE_MS);
  }
  if (typingStopTimeout) clearTimeout(typingStopTimeout);
  typingStopTimeout = setTimeout(stopTypingSignal, TYPING_IDLE_MS);
}
function stopTypingSignal() {
  if (typingStopTimeout) { clearTimeout(typingStopTimeout); typingStopTimeout = null; }
  if (typingKeepAliveInterval) { clearInterval(typingKeepAliveInterval); typingKeepAliveInterval = null; }
  if (!isTypingActive || !currentUser) return;
  isTypingActive = false;
  setTypingState(activeChatId, false);
}

function subscribeToTyping(chatId) {
  if (unsubscribeTyping) { unsubscribeTyping(); unsubscribeTyping = null; }
  typingRawData = {};
  othersTyping.clear();
  updateTypingUI();
  if (chatId === SUPPORT_CHAT_ID) return; // read-only канал — печатать туда нельзя, индикатор не нужен
  unsubscribeTyping = onSnapshot(typingDocRef(chatId), snap => {
    typingRawData = snap.exists() ? snap.data() : {};
    recomputeOthersTyping();
  }, () => { /* нет прав или сети — просто не показываем индикатор */ });
}
function stopTypingSubscription() {
  if (unsubscribeTyping) { unsubscribeTyping(); unsubscribeTyping = null; }
  typingRawData = {};
  othersTyping.clear();
  updateTypingUI();
}
// Помимо живых обновлений onSnapshot, периодически перепроверяем "свежесть"
// последних известных записей — на случай, если у печатавшего человека
// закрылась вкладка/пропала сеть до того, как он успел отправить "стоп"
// (deleteField). Так индикатор не залипнет навсегда, а погаснет сам, максимум
// через TYPING_STALE_MS.
function recomputeOthersTyping() {
  const now = Date.now();
  let changed = false;
  const fresh = new Set();
  Object.entries(typingRawData).forEach(([uid, ts]) => {
    if (!currentUser || uid === currentUser.uid) return;
    const ms = ts && ts.toMillis ? ts.toMillis() : 0;
    if (ms && (now - ms) < TYPING_STALE_MS) fresh.add(uid);
  });
  if (fresh.size !== othersTyping.size || Array.from(fresh).some(uid => !othersTyping.has(uid))) changed = true;
  othersTyping = fresh;
  if (changed) updateTypingUI();
}
setInterval(() => { if (unsubscribeTyping) recomputeOthersTyping(); }, 3000);

function updateTypingUI() {
  renderTypingBubble();
  applyChatHeaderSubText();
}
function typingHeaderText() {
  if (activeChatMeta.type === 'private') return 'печатает…';
  const names = Array.from(othersTyping).map(uid => (presenceDataCache.get(uid) && presenceDataCache.get(uid).nickname) || 'Кто-то');
  if (names.length === 1) return `${names[0]} печатает…`;
  const shown = names.slice(0, 2).join(', ');
  const rest = names.length - 2;
  return `Печатают: ${shown}${rest > 0 ? ' и ещё ' + rest : ''}`;
}
function setChatHeaderBase(text, offline) {
  chatHeaderBaseSub = text;
  chatHeaderBaseOffline = !!offline;
  applyChatHeaderSubText();
}
function applyChatHeaderSubText() {
  if (othersTyping.size > 0 && activeChatId !== SUPPORT_CHAT_ID) {
    chatHeaderSub.textContent = typingHeaderText();
    chatHeaderSub.classList.remove('offline');
    chatHeaderSub.classList.add('typing');
  } else {
    chatHeaderSub.textContent = chatHeaderBaseSub;
    chatHeaderSub.classList.toggle('offline', chatHeaderBaseOffline);
    chatHeaderSub.classList.remove('typing');
  }
}
function renderTypingBubble() {
  const shouldShow = othersTyping.size > 0 && activeChatId !== SUPPORT_CHAT_ID;
  if (!shouldShow) {
    if (typingBubbleEl) { typingBubbleEl.remove(); typingBubbleEl = null; }
    return;
  }
  const wasAtBottom = isScrolledToBottom();
  if (!typingBubbleEl) {
    const firstUid = Array.from(othersTyping)[0];
    const avatarUrl = (presenceDataCache.get(firstUid) && presenceDataCache.get(firstUid).avatarUrl) || DEFAULT_AVATAR;
    typingBubbleEl = document.createElement('div');
    typingBubbleEl.className = 'message other typing-indicator-message';
    typingBubbleEl.innerHTML = `
      <div class="message-avatar-wrap avatar-wrap"><img class="message-avatar" src="${escapeHtml(avatarUrl)}" alt=""></div>
      <div class="typing-bubble"><span></span><span></span><span></span></div>`;
  }
  // Индикатор всегда должен оставаться самым нижним элементом переписки.
  messagesList.appendChild(typingBubbleEl);
  if (wasAtBottom) scrollToBottom();
}

messageInput.addEventListener('input', handleTypingInput);
messageInput.addEventListener('blur', stopTypingSignal);

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
      // На тач-устройствах ensureLottieLoaded() ничего не грузит (там нет
      // ховера — событие mouseenter туда и не долетит), lottie-web
      // подтягивается лениво только на ПК/ноутбуках при первом наведении.
      Promise.all([getEmojiLottie(codepoint), ensureLottieLoaded()]).then(([data, ok]) => {
        if (data && ok && window.lottie && span.matches(':hover')) {
          span.textContent = '';
          hoverAnim = lottie.loadAnimation({ container: span, renderer: 'svg', loop: true, autoplay: true, animationData: data });
        }
      });
    });
    span.addEventListener('mouseleave', () => {
      if (hoverAnim) { hoverAnim.destroy(); hoverAnim = null; }
      span.textContent = emoji;
    });
    // БАГФИКС: клик по эмодзи не останавливал всплытие события, поэтому оно
    // долетало до document-обработчика ниже (закрывающего панель по клику
    // вне её) и закрывало панель СРАЗУ ЖЕ, в тот же тик — запланированная
    // ниже задержка в 150мс на анимацию "эмодзи подпрыгнул" не успевала
    // отработать визуально, панель исчезала мгновенно. Теперь клик по
    // эмодзи не всплывает дальше документа.
    span.addEventListener('click', (e) => {
      e.stopPropagation();
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
  // БАГФИКС: переменную обязательно обнуляем, а не только очищаем интервал —
  // иначе следующая проверка `if (animationInterval)` где-либо могла бы
  // ошибочно решить, что анимация всё ещё активна.
  animationInterval = null;
}
// БАГФИКС (производительность, особенно заметно на телефонах): раньше каждая
// "частица" фоновой анимации (снежинка/капля/листик), включая те, что
// добавлялись каждые 2 секунды через setInterval, навсегда оставалась в DOM —
// её CSS-анимация падения заканчивалась, но сам элемент никто не удалял.
// За долгую сессию в чате накапливались тысячи невидимых, но всё ещё живых
// в DOM-дереве элементов, что нагружало CPU/GPU и заметно сажало батарею —
// особенно на телефонах, где ресурсов меньше, чем на ноутбуке/десктопе.
// Теперь каждая частица сама удаляет себя из DOM по событию 'animationend'.
// БАГФИКС (стабильность на слабых ПК/ноутбуках и телефонах): фоновая
// анимация не должна тратить CPU/GPU, пока вкладка свёрнута/не видна —
// раньше setInterval продолжал плодить частицы и в фоне, впустую нагружая
// систему и сажая батарею. Теперь при уходе со вкладки анимация полностью
// останавливается, а при возврате — восстанавливается с текущими настройками.
let animationPausedByVisibility = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
      animationPausedByVisibility = true;
    }
  } else if (animationPausedByVisibility) {
    animationPausedByVisibility = false;
    if (currentUserData) startAnimation(currentUserData.animation || 'none');
  }
});

function startAnimation(type) {
  clearAnimation();
  // При системной настройке "уменьшить анимации" фоновые частицы вообще не
  // запускаем — это явный сигнал пользователя не тратить ресурсы на подобные
  // эффекты, а не только сделать их короче.
  if (type === 'none' || document.hidden || prefersReducedMotion) return;
  const container = document.createElement('div');
  container.className = 'animation-container';
  mainChat.appendChild(container);

  function spawnParticle(targetContainer, delaySeconds) {
    const particle = document.createElement('div');
    particle.className = `particle ${type}`;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = delaySeconds + 's';
    particle.style.animationDuration = (4 + Math.random() * 6) + 's';
    particle.addEventListener('animationend', () => particle.remove());
    targetContainer.appendChild(particle);
  }

  // На слабых устройствах (см. isLowPowerDevice выше) частиц меньше и
  // спавнятся они реже — ощутимо снижает нагрузку на CPU/GPU там, где это
  // критичнее всего, оставляя эффект достаточно заметным визуально.
  const baseCount = type === 'rain' ? 40 : 20;
  const count = isLowPowerDevice ? Math.round(baseCount / 2) : baseCount;
  const spawnIntervalMs = isLowPowerDevice ? 3200 : 2000;
  for (let i = 0; i < count; i++) {
    spawnParticle(container, Math.random() * 5);
  }
  animationInterval = setInterval(() => {
    const liveContainer = mainChat.querySelector('.animation-container');
    if (!liveContainer) return;
    spawnParticle(liveContainer, 0);
  }, spawnIntervalMs);
}

// Настройки
async function applyCurrentAnimation() {
  const anim = currentUserData.animation || 'none';
  animationSelect.value = anim;
  startAnimation(anim);
}
function setSettingsTab(tab) {
  const isUpdateTab = tab === 'update';
  settingsTabChatBtn.classList.toggle('active', !isUpdateTab);
  settingsTabUpdateBtn.classList.toggle('active', isUpdateTab);
  settingsTabChatPanel.style.display = isUpdateTab ? 'none' : 'flex';
  settingsTabUpdatePanel.style.display = isUpdateTab ? 'flex' : 'none';
  if (isUpdateTab) renderUpdateTab();
}
settingsTabChatBtn.addEventListener('click', () => setSettingsTab('chat'));
settingsTabUpdateBtn.addEventListener('click', () => setSettingsTab('update'));

settingsBtn.addEventListener('click', () => {
  animationSelect.value = currentUserData.animation || 'none';
  setSettingsTab('chat');
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
  avatarInput.value = '';
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
      : { type: 'general', subtitle: id === 'support' ? 'Новости, обновления и исправления' : 'Открытый чат для всех' };
  selectChat(id, name, meta);
  // selectChat() выходит раньше времени, если тапнули по уже активному чату
  // (id не меняется) — но на телефоне сайдбар всё равно должен закрыться в
  // любом случае, поэтому закрываем его отдельно, вне зависимости от того,
  // сработала ли внутренняя логика selectChat().
  if (window.innerWidth <= 768) closeMobileSidebar();
});

// ============ Статусы (БЕТА) — как в WhatsApp: текст/фото на 24 часа ============
// БАГФИКС (главный баг статусов: свой статус не появлялся сразу после
// публикации): раньше запрос фильтровался и сортировался по полю createdAt,
// а оно записывается через serverTimestamp(). Пока Firestore не подтвердит
// запись сервером, локально (оптимистично) это поле равно null — а null не
// проходит фильтр "> cutoff", поэтому только что опубликованный статус на
// секунду-другую пропадал из списка (а на медленной сети — заметно дольше),
// хотя publishStatus() отработал без ошибок. Поле expireAt, наоборот,
// вычисляется на клиенте (Timestamp.fromMillis(...)) и никогда не бывает
// null даже до подтверждения сервером — фильтруем и сортируем по нему.
function subscribeToStatuses() {
  if (unsubscribeStatuses) return; // уже подписаны
  const nowTs = Timestamp.fromMillis(Date.now());
  const qRef = query(collection(db, 'statuses'), where('expireAt', '>', nowTs), orderBy('expireAt', 'desc'));
  unsubscribeStatuses = onSnapshot(qRef, snap => {
    currentStatuses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (statusModal.style.display !== 'none') renderStatusModalContent();
    refreshOpenStatusViewer();
  }, (err) => {
    console.error('Ошибка подписки на статусы:', err);
  });
  cleanupExpiredStatuses();
  if (!statusCleanupInterval) {
    statusCleanupInterval = setInterval(cleanupExpiredStatuses, 5 * 60 * 1000);
  }
}
function stopStatusSubscription() {
  if (unsubscribeStatuses) { unsubscribeStatuses(); unsubscribeStatuses = null; }
  if (statusCleanupInterval) { clearInterval(statusCleanupInterval); statusCleanupInterval = null; }
  currentStatuses = [];
}
async function cleanupExpiredStatuses() {
  try {
    const nowTs = Timestamp.fromMillis(Date.now());
    const expiredQuery = query(collection(db, 'statuses'), where('expireAt', '<=', nowTs));
    const snap = await getDocs(expiredQuery);
    if (snap.empty) return;
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'statuses', d.id)).catch(() => {})));
  } catch (e) {
    console.error('Ошибка фоновой очистки просроченных статусов:', e);
  }
}

function latestStatusPerUser(excludeSelf) {
  const map = new Map();
  currentStatuses.forEach(s => {
    if (excludeSelf && s.userId === currentUser.uid) return;
    if (!map.has(s.userId)) map.set(s.userId, s);
  });
  return Array.from(map.values());
}

function openStatusModal() {
  statusModal.style.display = 'flex';
  hideStatusAddForm();
  subscribeToStatuses();
  renderStatusModalContent();
}
function closeStatusModal() {
  statusModal.style.display = 'none';
}
function renderStatusModalContent() {
  const myLatest = currentStatuses.find(s => s.userId === currentUser.uid);
  myStatusRow.innerHTML = '';
  const myRow = document.createElement('div');
  myRow.className = 'status-row my-status';
  if (myLatest) {
    const viewerCount = Object.keys(myLatest.viewedBy || {}).length;
    myRow.innerHTML = `
      <div class="status-avatar-ring"><img src="${escapeHtml(myLatest.imageUrl || currentUserData.avatarUrl || DEFAULT_AVATAR)}" alt=""></div>
      <div class="status-info">
        <span class="status-name">Мой статус</span>
        <span class="status-meta">${escapeHtml(formatTime(myLatest.createdAt))} · просмотров: ${viewerCount}</span>
      </div>`;
    myRow.addEventListener('click', () => openStatusViewer(myLatest));
  } else {
    myRow.innerHTML = `
      <div class="status-add-icon">＋</div>
      <div class="status-info">
        <span class="status-name">Добавить статус</span>
        <span class="status-meta">Текст или фото, будет видно 24 часа</span>
      </div>`;
    myRow.addEventListener('click', () => showStatusAddForm());
  }
  myStatusRow.appendChild(myRow);

  const others = latestStatusPerUser(true);
  statusListEl.innerHTML = '';
  if (others.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = 'Пока никто не опубликовал статус.';
    statusListEl.appendChild(empty);
  } else {
    others.forEach(s => {
      const viewed = !!(s.viewedBy && s.viewedBy[currentUser.uid]);
      const row = document.createElement('div');
      row.className = 'status-row' + (viewed ? ' viewed' : '');
      row.innerHTML = `
        <div class="status-avatar-ring"><img src="${escapeHtml(s.imageUrl || s.userAvatarUrl || DEFAULT_AVATAR)}" alt=""></div>
        <div class="status-info">
          <span class="status-name">${escapeHtml(s.userName || 'Пользователь')}</span>
          <span class="status-meta">${escapeHtml(formatTime(s.createdAt))}</span>
        </div>`;
      row.addEventListener('click', () => openStatusViewer(s));
      statusListEl.appendChild(row);
    });
  }
}

function showStatusAddForm() {
  statusAddForm.style.display = 'flex';
  statusTextInput.value = '';
  statusImageInput.value = '';
  pendingStatusImage = '';
  statusImagePreview.style.display = 'none';
  statusImagePreview.src = '';
}
function hideStatusAddForm() {
  statusAddForm.style.display = 'none';
}

// БАГФИКС (лимит размера документа Firestore): один документ не может
// превышать 1 МиБ. Качество, которое нужно для читаемого статуса (см. ниже),
// на очень "тяжёлых" фото (например, детальный скриншот с мелким текстом)
// иногда даёт base64-строку в сотни килобайт и может подойти к лимиту.
// Раньше это привело бы к тому, что publishStatus() падал с общей ошибкой
// "Не удалось опубликовать статус" уже ПОСЛЕ того, как пользователь заполнил
// форму — неприятный сюрприз в самом конце. Теперь если сжатая картинка
// всё ещё слишком большая, мы автоматически пересжимаем её ступенчато с
// понижением качества/размера, пока она не влезет в безопасный лимит.
const STATUS_IMAGE_SAFE_BYTES = 700 * 1024; // запас под остальные поля документа
async function compressImageForStatus(file) {
  const attempts = [
    [1280, 1280, 0.9],
    [1280, 1280, 0.75],
    [960, 960, 0.7],
    [720, 720, 0.65]
  ];
  let result = null;
  for (const [w, h, q] of attempts) {
    result = await compressImage(file, w, h, q);
    if (result.length <= STATUS_IMAGE_SAFE_BYTES) return result;
  }
  return result; // если совсем не влезло — вернём самый лёгкий вариант, publishStatus сам сообщит об ошибке
}
statusImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Пожалуйста, выберите файл изображения.'); statusImageInput.value = ''; return; }
  try {
    // БАГФИКС (качество картинок в статусах): раньше фото в статусах сжималось
    // до 480×480 с качеством JPEG 0.7 — этого хватало для аватара, но для
    // статуса (где часто фотографируют текст, скриншоты, афиши) этого было
    // мало: буквы превращались в кашу. Теперь для статусов используем до
    // 1280×1280 и качество до 0.9 — заметно чётче, текст на фото читается.
    pendingStatusImage = await compressImageForStatus(file);
    statusImagePreview.src = pendingStatusImage;
    statusImagePreview.style.display = 'block';
  } catch (err) {
    alert('Не удалось загрузить изображение. Попробуйте другой файл.');
  }
});

async function publishStatus() {
  const text = statusTextInput.value.trim();
  if (!text && !pendingStatusImage) { alert('Добавьте текст или фото для статуса.'); return; }
  try {
    await addDoc(collection(db, 'statuses'), {
      userId: currentUser.uid,
      userName: currentUserData.nickname || 'Пользователь',
      userAvatarUrl: currentUserData.avatarUrl || '',
      text: text || '',
      imageUrl: pendingStatusImage || '',
      viewedBy: {},
      createdAt: serverTimestamp(),
      expireAt: Timestamp.fromMillis(Date.now() + STATUS_LIFETIME_MS)
    });
  } catch (e) {
    alert('Не удалось опубликовать статус. Попробуйте ещё раз.');
    return;
  }
  hideStatusAddForm();
}

let openStatusViewerId = null; // id статуса, который сейчас открыт в просмотрщике (для живого обновления)
function openStatusViewer(status) {
  const isReopen = openStatusViewerId === status.id;
  openStatusViewerId = status.id;
  statusViewer.style.display = 'flex';
  statusViewerAvatar.src = status.userAvatarUrl || DEFAULT_AVATAR;
  statusViewerName.textContent = status.userId === currentUser.uid ? 'Мой статус' : (status.userName || 'Пользователь');
  statusViewerTime.textContent = formatTime(status.createdAt);
  if (status.imageUrl) {
    statusViewerImage.src = status.imageUrl;
    statusViewerImage.style.display = 'block';
  } else {
    statusViewerImage.style.display = 'none';
    statusViewerImage.src = '';
  }
  statusViewerText.textContent = status.text || '';

  const isOwn = status.userId === currentUser.uid;
  if (isOwn) {
    statusViewerViewersWrap.style.display = 'block';
    const entries = Object.entries(status.viewedBy || {}).sort((a, b) => {
      const at = a[1]?.at?.toMillis ? a[1].at.toMillis() : 0;
      const bt = b[1]?.at?.toMillis ? b[1].at.toMillis() : 0;
      return bt - at;
    });
    statusViewersList.innerHTML = '';
    if (entries.length === 0) {
      const none = document.createElement('div');
      none.className = 'status-viewer-viewer-item';
      none.textContent = 'Пока никто не смотрел';
      statusViewersList.appendChild(none);
    } else {
      entries.forEach(([uid, info]) => {
        const item = document.createElement('div');
        item.className = 'status-viewer-viewer-item';
        item.innerHTML = `<img src="${escapeHtml(info.avatarUrl || DEFAULT_AVATAR)}" alt=""><span>${escapeHtml(info.nickname || 'Пользователь')}</span><span class="viewer-time">${escapeHtml(formatTime(info.at))}</span>`;
        statusViewersList.appendChild(item);
      });
    }
  } else {
    statusViewerViewersWrap.style.display = 'none';
    // БАГФИКС (дублирующиеся записи о просмотре): раньше эта запись отправлялась
    // при каждом вызове openStatusViewer(), а после добавления живого обновления
    // (refreshOpenStatusViewer) эта функция стала вызываться повторно, пока окно
    // просмотра открыто. Из-за задержки между отправкой updateDoc() и приходом
    // подтверждённых данных обратно через onSnapshot поле status.viewedBy ещё
    // какое-то время оставалось "старым", и условие ниже могло сработать
    // повторно — в базу летело несколько записей о просмотре одного и того же
    // человека подряд. Теперь при повторном открытии/обновлении уже открытого
    // статуса запись не отправляется повторно.
    if (!isReopen && (!status.viewedBy || !status.viewedBy[currentUser.uid])) {
      updateDoc(doc(db, 'statuses', status.id), {
        [`viewedBy.${currentUser.uid}`]: {
          at: serverTimestamp(),
          nickname: currentUserData.nickname || 'Пользователь',
          avatarUrl: currentUserData.avatarUrl || ''
        }
      }).catch(() => { /* не критично — в следующий раз просто попробуем снова */ });
    }
  }
}
function closeStatusViewer() {
  openStatusViewerId = null;
  statusViewer.style.display = 'none';
}
// БАГФИКС (статусы не обновлялись в реальном времени во время просмотра):
// раньше при обновлении подписки (кто-то новый посмотрел статус, счётчик
// "просмотров: N" должен вырасти) обновлялось только содержимое модалки со
// списком статусов, но НЕ уже открытое окно просмотра. Владелец статуса
// видел устаревшее число просмотров, пока не закрывал и не открывал окно
// заново. Также если статус истёк (или его удалили) прямо во время
// просмотра — окно раньше просто продолжало показывать protuhший статус.
// Теперь окно просмотра само подхватывает актуальные данные при каждом
// обновлении подписки на статусы.
function refreshOpenStatusViewer() {
  if (!openStatusViewerId || statusViewer.style.display === 'none') return;
  const fresh = currentStatuses.find(s => s.id === openStatusViewerId);
  if (!fresh) { closeStatusViewer(); return; }
  openStatusViewer(fresh);
}

statusNavBtn.addEventListener('click', openStatusModal);
closeStatusModalBtn.addEventListener('click', closeStatusModal);
statusCancelBtn.addEventListener('click', hideStatusAddForm);
statusPublishBtn.addEventListener('click', publishStatus);
statusViewerClose.addEventListener('click', closeStatusViewer);

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
    subscribeToTyping(activeChatId);
    subscribeToChatList();
    applyCurrentAnimation();
    startPresenceHeartbeat();
    maybeSendPhoneReminder(user.uid, currentUserData);
  } else {
    stopTypingSignal();
    stopTypingSubscription();
    currentUser=null; currentUserData={nickname:'',avatarUrl:'',animation:'none'};
    if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
    if(unsubscribeChatList){unsubscribeChatList();unsubscribeChatList=null;}
    if(unsubscribeHeaderPresence){unsubscribeHeaderPresence();unsubscribeHeaderPresence=null;}
    stopStatusSubscription();
    closeStatusModal();
    closeStatusViewer();
    clearAnimation();
    stopPresenceHeartbeat();
    clearUserStatusListeners();
    closeMobileSidebar();
    chatList.querySelectorAll('.dynamic-chat-item').forEach(el => el.remove());
    activeChatId = 'general';
    currentChatTitle.textContent = 'Общий чат';
    updateChatHeaderMeta({ type: 'general' });
    updateComposerAccess('general');
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
let swAlreadyReloading = false;
let swRegistration = null;      // текущая регистрация SW — нужна вкладке "Обновление и безопасность"
let updateAvailable = false;    // есть ли скачанное и готовое к установке обновление

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(registration => {
      swRegistration = registration;
      if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdateAvailable(registration);
      }
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdateAvailable(registration);
          }
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {
      // Если регистрация не удалась (например, страница открыта как file://),
      // приложение продолжает работать в обычном режиме — просто без PWA-фич.
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swAlreadyReloading) return;
    swAlreadyReloading = true;
    window.location.reload();
  });
}

// Вызывается, когда браузер скачал и подготовил новую версию приложения
// (SW встал в состояние "waiting"). Показывает всплывающий баннер, зажигает
// точку-уведомление на шестерёнке настроек и обновляет вкладку
// "Обновление и безопасность", если она сейчас открыта.
function onUpdateAvailable(registration) {
  updateAvailable = true;
  showUpdateBanner(registration);
  if (settingsUpdateDot) settingsUpdateDot.style.display = 'block';
  if (settingsTabUpdatePanel && settingsTabUpdatePanel.style.display !== 'none') {
    renderUpdateTab();
  }
}

// Активирует скачанное обновление и перезагружает страницу. Общая точка
// входа и для баннера, и для кнопок во вкладке настроек.
function applyPendingUpdate(onStart) {
  if (!swRegistration || !swRegistration.waiting) return;
  if (onStart) onStart();
  swRegistration.waiting.postMessage('SKIP_WAITING');
  setTimeout(() => {
    if (!swAlreadyReloading) { swAlreadyReloading = true; window.location.reload(); }
  }, 4000);
}

function showUpdateBanner(registration) {
  if (document.querySelector('.update-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  const text = document.createElement('span');
  text.textContent = 'Доступно обновление «Искры»';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Обновить';
  btn.addEventListener('click', () => {
    applyPendingUpdate(() => {
      btn.disabled = true;
      btn.textContent = 'Обновляем…';
    });
  });
  banner.appendChild(text);
  banner.appendChild(btn);
  document.body.insertBefore(banner, document.body.firstChild);
}

// ============ Вкладка настроек "Обновление и безопасность" ============
let updateTabChecking = false;
const openUpdateItemVersions = new Set(); // какие карточки сейчас развёрнуты — сохраняем между перерисовками

function renderUpdateTab() {
  if (!updateStatusCard) return;

  updateStatusCard.classList.toggle('checking', updateTabChecking);
  updateStatusCard.classList.toggle('has-update', updateAvailable);
  updateStatusIcon.textContent = updateTabChecking ? '🔄' : (updateAvailable ? '⬇️' : '🛡️');
  updateStatusTitle.textContent = `Версия Искры ${APP_VERSION}`;
  if (updateTabChecking) {
    updateStatusSubtitle.textContent = 'Проверяем наличие обновлений…';
  } else if (updateAvailable) {
    updateStatusSubtitle.textContent = 'Найдено обновление, готово к установке';
  } else {
    updateStatusSubtitle.textContent = 'У вас установлена последняя версия';
  }
  checkUpdateBtn.disabled = updateTabChecking;
  checkUpdateBtn.textContent = updateTabChecking ? 'Проверяем…' : 'Проверить обновления';
  updateAllBtn.disabled = !updateAvailable;

  updateListEl.innerHTML = '';

  if (updateAvailable) {
    updateListEl.appendChild(buildUpdateItem({
      version: null,
      date: 'Сегодня',
      notes: ['Новая версия «Искры» скачана и готова к установке.', 'Полный список изменений появится в истории после установки.'],
      pending: true
    }));
  }

  UPDATE_CHANGELOG.forEach(entry => {
    updateListEl.appendChild(buildUpdateItem({
      version: entry.version,
      date: entry.date,
      notes: entry.notes,
      pending: false
    }));
  });

  if (!updateListEl.children.length) {
    const empty = document.createElement('div');
    empty.className = 'update-empty';
    empty.textContent = 'История обновлений пока пуста.';
    updateListEl.appendChild(empty);
  }
}

function buildUpdateItem({ version, date, notes, pending }) {
  const key = pending ? 'pending' : version;
  const item = document.createElement('div');
  item.className = 'update-item' + (pending ? ' pending' : '');
  if (openUpdateItemVersions.has(key)) item.classList.add('open');

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'update-item-header';

  const info = document.createElement('div');
  info.className = 'update-item-info';
  const versionRow = document.createElement('span');
  versionRow.className = 'update-item-version';
  versionRow.textContent = pending ? 'Новое обновление' : `Версия ${version}`;
  const badge = document.createElement('span');
  badge.className = 'update-item-badge ' + (pending ? 'pending' : 'installed');
  badge.textContent = pending ? 'Готово к установке' : 'Установлено';
  versionRow.appendChild(badge);
  const dateEl = document.createElement('span');
  dateEl.className = 'update-item-date';
  dateEl.textContent = date;
  info.appendChild(versionRow);
  info.appendChild(dateEl);

  const arrow = document.createElement('span');
  arrow.className = 'update-item-arrow';
  arrow.textContent = '▾';

  header.appendChild(info);
  header.appendChild(arrow);
  header.addEventListener('click', () => {
    item.classList.toggle('open');
    if (item.classList.contains('open')) openUpdateItemVersions.add(key);
    else openUpdateItemVersions.delete(key);
  });

  const body = document.createElement('div');
  body.className = 'update-item-body';
  const list = document.createElement('ul');
  list.className = 'update-item-notes';
  notes.forEach(noteText => {
    const li = document.createElement('li');
    li.textContent = noteText;
    list.appendChild(li);
  });
  body.appendChild(list);

  if (pending) {
    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.className = 'btn btn-primary update-item-install-btn';
    installBtn.textContent = 'Скачать и установить';
    installBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyPendingUpdate(() => {
        installBtn.disabled = true;
        installBtn.textContent = 'Устанавливаем…';
      });
    });
    body.appendChild(installBtn);
  }

  item.appendChild(header);
  item.appendChild(body);
  return item;
}

checkUpdateBtn.addEventListener('click', () => {
  if (updateTabChecking || !('serviceWorker' in navigator)) return;
  updateTabChecking = true;
  renderUpdateTab();
  const finish = () => {
    updateTabChecking = false;
    renderUpdateTab();
  };
  if (swRegistration) {
    swRegistration.update().then(() => {
      // Если update() нашёл новую версию, onUpdateAvailable() уже выставит
      // updateAvailable = true через событие 'updatefound' до того, как
      // сработает этот then — небольшая пауза даёт этому шансу случиться.
      setTimeout(finish, 700);
    }).catch(finish);
  } else {
    setTimeout(finish, 700);
  }
});

updateAllBtn.addEventListener('click', () => {
  applyPendingUpdate(() => {
    updateAllBtn.disabled = true;
    updateAllBtn.textContent = 'Обновляем…';
  });
});
