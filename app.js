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
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM-элементы
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authForm = document.getElementById('auth-form');
const nicknameGroup = document.getElementById('nickname-group');
const nicknameInput = document.getElementById('nickname');
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
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const saveProfileBtn = document.getElementById('save-profile');
const closeModalBtn = document.getElementById('close-modal');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const currentUserNickname = document.getElementById('current-user-nickname');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji-panel');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const animationSelect = document.getElementById('animation-select');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const mainChat = document.getElementById('main-chat');

let currentUser = null;
let currentUserData = { nickname: '', avatarUrl: '', animation: 'none' };
let activeChatId = 'general';
let unsubscribeMessages = null;
let isLoginMode = true;
let animationInterval = null;

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

function setLoginMode(mode) {
  isLoginMode = mode;
  if (mode) {
    nicknameGroup.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'none';
    authToggle.innerHTML = 'Нет аккаунта? <a href="#" id="switch-to-register">Создать</a>';
  } else {
    nicknameGroup.style.display = 'block';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'inline-flex';
    authToggle.innerHTML = 'Уже есть аккаунт? <a href="#" id="switch-to-login">Войти</a>';
  }
  const newLink = document.querySelector('#auth-toggle a');
  if (newLink) newLink.addEventListener('click', e => { e.preventDefault(); clearAuthError(); setLoginMode(!isLoginMode); });
}

// Аутентификация
async function registerUser(email, password, nickname) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), { nickname, email, avatarUrl: '', animation: 'none', createdAt: serverTimestamp() });
  return cred.user;
}
async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
async function loadUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return snap.data();
  const def = { nickname: 'Пользователь', email: '', avatarUrl: '', animation: 'none' };
  await setDoc(doc(db, 'users', uid), def);
  return def;
}

// Профиль и аватар
async function updateProfile(nickname, avatarUrl) {
  if (!currentUser) return;
  await updateDoc(doc(db, 'users', currentUser.uid), { nickname, avatarUrl });
  currentUserData.nickname = nickname;
  currentUserData.avatarUrl = avatarUrl;
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
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
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

// Чат
function subscribeToMessages(chatId) {
  if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
  messagesList.innerHTML = '';
  const qRef = query(collection(db, 'messages'), where('chatId','==',chatId), orderBy('timestamp','asc'));
  unsubscribeMessages = onSnapshot(qRef, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') addMessageToUI(change.doc.id, change.doc.data());
    });
    if (isScrolledToBottom() || snap.docChanges().some(c => c.type==='added')) scrollToBottom();
  });
}
function addMessageToUI(id, data) {
  if (document.getElementById(`msg-${id}`)) return;
  const isOwn = currentUser && data.userId === currentUser.uid;
  const msgEl = document.createElement('div');
  msgEl.id = `msg-${id}`;
  msgEl.className = `message ${isOwn ? 'own' : 'other'}`;

  const avatarImg = document.createElement('img');
  avatarImg.className = 'message-avatar';
  avatarImg.src = data.userAvatarUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23444"/%3E%3C/svg%3E';
  avatarImg.alt = 'avatar';

  const body = document.createElement('div');
  body.className = 'message-body';
  const header = document.createElement('div');
  header.className = 'message-header';
  header.innerHTML = `<span class="message-username">${data.userName || 'Пользователь'}</span><span class="message-time">${formatTime(data.timestamp)}</span>`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = linkify(data.text);
  body.appendChild(header);
  body.appendChild(bubble);

  msgEl.appendChild(avatarImg);
  msgEl.appendChild(body);
  messagesList.appendChild(msgEl);
}
async function sendMessage(text) {
  if (!currentUser || !currentUserData) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, 'messages'), {
    text: trimmed,
    userId: currentUser.uid,
    userName: currentUserData.nickname || 'Пользователь',
    userAvatarUrl: currentUserData.avatarUrl || '',
    chatId: activeChatId,
    timestamp: serverTimestamp()
  });
  messageInput.value = '';
}

// Эмодзи
const emojis = ['😀','😂','😍','😎','🥳','😢','😡','👍','👎','❤️','🔥','🎉','💡','✨','🙈','🍕','🚀','⭐','⚡','💬','✅','❌','🤔','👀','💪','🙏','🤗','😴','🤩','😇'];
function renderEmojiPanel() {
  emojiPanel.innerHTML = '';
  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.addEventListener('click', () => {
      messageInput.value += emoji;
      messageInput.focus();
      emojiPanel.style.display = 'none';
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
  // Периодически пересоздаём для бесконечности
  animationInterval = setInterval(() => {
    const container = mainChart.querySelector('.animation-container');
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
  await updateDoc(doc(db, 'users', currentUser.uid), { animation: newAnim });
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
  if (!email||!password) return displayAuthError('Введите email и пароль');
  if (!isLoginMode && !nickname) return displayAuthError('Придумайте никнейм');
  try {
    isLoginMode ? await loginUser(email, password) : await registerUser(email, password, nickname);
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
loginBtn.addEventListener('click', ()=>authForm.dispatchEvent(new Event('submit')));
registerBtn.addEventListener('click', ()=>authForm.dispatchEvent(new Event('submit')));
switchLink.addEventListener('click', e=>{ e.preventDefault(); clearAuthError(); setLoginMode(false); });
logoutBtn.addEventListener('click', async ()=>{ 
  if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;} 
  clearAnimation();
  await signOut(auth); 
});
messageForm.addEventListener('submit', e=>{ e.preventDefault(); sendMessage(messageInput.value); });
profileBtn.addEventListener('click', ()=>{
  profileNickname.value = currentUserData.nickname || '';
  profileAvatarPreview.src = currentUserData.avatarUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23444"/%3E%3C/svg%3E';
  profileModal.style.display = 'flex';
});
closeModalBtn.addEventListener('click', ()=> profileModal.style.display='none');
avatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const dataUrl = await compressImage(file);
  profileAvatarPreview.src = dataUrl;
});
saveProfileBtn.addEventListener('click', async ()=>{
  const newNick = profileNickname.value.trim() || currentUserData.nickname;
  const newAvatar = profileAvatarPreview.src;
  await updateProfile(newNick, newAvatar);
  profileModal.style.display = 'none';
});

// Переключение чата
document.getElementById('chat-list').addEventListener('click', e=>{
  const item = e.target.closest('.chat-item');
  if(!item) return;
  const id = item.dataset.chatId;
  const name = item.querySelector('.chat-name').textContent;
  if(activeChatId!==id) { activeChatId=id; document.getElementById('current-chat-title').textContent=name; subscribeToMessages(id); }
  document.querySelectorAll('.chat-item').forEach(i=>i.classList.toggle('active', i.dataset.chatId===id));
  if(window.innerWidth<=768) document.getElementById('sidebar').classList.remove('open');
});

// Мобильное меню
document.getElementById('menu-toggle').addEventListener('click', ()=> document.getElementById('sidebar').classList.add('open'));
document.getElementById('close-sidebar').addEventListener('click', ()=> document.getElementById('sidebar').classList.remove('open'));

// Слежение за авторизацией
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    currentUserData = await loadUserData(user.uid);
    updateSidebarProfile();
    showScreen(chatScreen);
    subscribeToMessages(activeChatId);
    applyCurrentAnimation();
  } else {
    currentUser=null; currentUserData={nickname:'',avatarUrl:'',animation:'none'};
    if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
    clearAnimation();
    messagesList.innerHTML='';
    showScreen(authScreen);
    emailInput.value=''; passwordInput.value=''; nicknameInput.value='';
    clearAuthError(); setLoginMode(true);
  }
});
setLoginMode(true);