// ================== КОНФИГУРАЦИЯ FIREBASE ==================
// Замените значения на свои из консоли Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDH4JqdICmjf_IzC2h58arcQiSAWkV4AcA",
  authDomain: "messenger-41f5f.firebaseapp.com",
  projectId: "messenger-41f5f",
  storageBucket: "messenger-41f5f.firebasestorage.app",
  messagingSenderId: "663121888236",
  appId: "1:663121888236:web:f5997f256fd153fde9b6c9",
  measurementId: "G-87QPL1SK7N"
};

// ================== ИМПОРТЫ FIREBASE ==================
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

// ================== ИНИЦИАЛИЗАЦИЯ ==================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== DOM ЭЛЕМЕНТЫ ==================
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

const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const menuToggle = document.getElementById('menu-toggle');
const chatList = document.getElementById('chat-list');
const currentChatTitle = document.getElementById('current-chat-title');
const messagesList = document.getElementById('messages-list');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const logoutBtn = document.getElementById('logout-btn');
const currentUserNickname = document.getElementById('current-user-nickname');

// ================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==================
let currentUser = null;
let currentUserData = null; // { nickname, email }
let activeChatId = 'general';
let unsubscribeMessages = null;
let isLoginMode = true;

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function clearAuthError() {
  authError.textContent = '';
}

function displayAuthError(message) {
  authError.textContent = message;
}

// Проверка, находится ли пользователь внизу чата (с погрешностью)
function isScrolledToBottom() {
  const container = messagesContainer;
  const threshold = 100;
  return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Переключение режима (вход/регистрация)
function setLoginMode(mode) {
  isLoginMode = mode;
  if (mode) {
    // Вход
    nicknameGroup.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'none';
    authToggle.innerHTML = 'Нет аккаунта? <a href="#" id="switch-to-register">Создать</a>';
  } else {
    // Регистрация
    nicknameGroup.style.display = 'block';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'inline-flex';
    authToggle.innerHTML = 'Уже есть аккаунт? <a href="#" id="switch-to-login">Войти</a>';
  }
  // Перепривязываем обработчик ссылки переключения
  const newSwitchLink = document.querySelector('#auth-toggle a');
  if (newSwitchLink) {
    newSwitchLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuthError();
      setLoginMode(!isLoginMode);
    });
  }
}

// ================== АВТОРИЗАЦИЯ ==================
// Регистрация
async function registerUser(email, password, nickname) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Сохраняем никнейм в Firestore
    await setDoc(doc(db, 'users', user.uid), {
      nickname: nickname,
      email: email,
      createdAt: serverTimestamp()
    });
    return user;
  } catch (error) {
    throw error;
  }
}

// Вход
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

// Загрузка данных пользователя из Firestore
async function loadUserData(uid) {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return userDoc.data();
  } else {
    // Если данных нет, создаём базовые (на случай, если пропустили сохранение)
    const defaultData = {
      nickname: 'Пользователь',
      email: currentUser.email || ''
    };
    await setDoc(userDocRef, defaultData);
    return defaultData;
  }
}

// Обработчик отправки формы авторизации
async function handleAuthSubmit(e) {
  e.preventDefault();
  clearAuthError();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const nickname = nicknameInput.value.trim();

  if (!email || !password) {
    displayAuthError('Введите email и пароль');
    return;
  }

  if (!isLoginMode && !nickname) {
    displayAuthError('Придумайте никнейм');
    return;
  }

  try {
    if (isLoginMode) {
      await loginUser(email, password);
    } else {
      await registerUser(email, password, nickname);
    }
  } catch (error) {
    console.error('Auth error:', error);
    // Обработка ошибок Firebase
    let message = 'Ошибка аутентификации';
    if (error.code === 'auth/email-already-in-use') {
      message = 'Email уже используется';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Некорректный email';
    } else if (error.code === 'auth/weak-password') {
      message = 'Пароль должен быть не менее 6 символов';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      message = 'Неверный email или пароль';
    } else if (error.code === 'auth/invalid-credential') {
      message = 'Неверные учётные данные';
    }
    displayAuthError(message);
  }
}

// Выход
async function handleLogout() {
  try {
    // Отписываемся от сообщений
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }
    await signOut(auth);
    // Переключение на экран авторизации произойдёт в слушателе onAuthStateChanged
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// ================== ЧАТ ==================
// Подписка на сообщения выбранного чата
function subscribeToMessages(chatId) {
  // Отписываемся от предыдущей подписки
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  // Очищаем список сообщений
  messagesList.innerHTML = '';

  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    // Обрабатываем изменения
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const messageData = change.doc.data();
        addMessageToUI(change.doc.id, messageData);
      }
      // Удаление и изменение можно не реализовывать для простоты
    });

    // Автопрокрутка, если пользователь был внизу (или при первоначальной загрузке)
    if (isScrolledToBottom() || snapshot.docChanges().some(c => c.type === 'added')) {
      scrollToBottom();
    }
  }, (error) => {
    console.error('Ошибка подписки на сообщения:', error);
  });
}

// Добавление одного сообщения в DOM
function addMessageToUI(id, messageData) {
  // Проверяем, нет ли уже сообщения с таким id (на случай дублирования)
  if (document.getElementById(`msg-${id}`)) return;

  const isOwn = currentUser && messageData.userId === currentUser.uid;
  const messageEl = document.createElement('div');
  messageEl.id = `msg-${id}`;
  messageEl.className = `message ${isOwn ? 'own' : 'other'}`;

  const headerEl = document.createElement('div');
  headerEl.className = 'message-header';

  const usernameEl = document.createElement('span');
  usernameEl.className = 'message-username';
  usernameEl.textContent = messageData.userName || 'Пользователь';

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = formatTime(messageData.timestamp);

  headerEl.appendChild(usernameEl);
  headerEl.appendChild(timeEl);

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'message-bubble';
  bubbleEl.textContent = messageData.text;

  messageEl.appendChild(headerEl);
  messageEl.appendChild(bubbleEl);

  messagesList.appendChild(messageEl);
}

// Отправка сообщения
async function sendMessage(text) {
  if (!currentUser || !currentUserData) {
    alert('Вы не авторизованы');
    return;
  }

  const trimmedText = text.trim();
  if (!trimmedText) return;

  try {
    await addDoc(collection(db, 'messages'), {
      text: trimmedText,
      userId: currentUser.uid,
      userName: currentUserData.nickname || 'Пользователь',
      chatId: activeChatId,
      timestamp: serverTimestamp()
    });
    // Очистка поля ввода
    messageInput.value = '';
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    alert('Не удалось отправить сообщение');
  }
}

// Переключение чата (в данный момент только один)
function switchChat(chatId, chatName) {
  if (activeChatId === chatId) return;
  activeChatId = chatId;
  currentChatTitle.textContent = chatName;
  // Обновляем активный элемент в списке
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.toggle('active', item.dataset.chatId === chatId);
  });
  // Подписываемся заново
  subscribeToMessages(chatId);
}

// ================== СОБЫТИЯ ИНТЕРФЕЙСА ==================
// Форма авторизации
authForm.addEventListener('submit', handleAuthSubmit);

// Кнопки Войти / Зарегистрироваться (вызывают submit формы)
loginBtn.addEventListener('click', () => authForm.dispatchEvent(new Event('submit')));
registerBtn.addEventListener('click', () => authForm.dispatchEvent(new Event('submit')));

// Переключение режимов через ссылку
switchLink.addEventListener('click', (e) => {
  e.preventDefault();
  clearAuthError();
  setLoginMode(false);
});

// Кнопка выхода
logoutBtn.addEventListener('click', handleLogout);

// Отправка сообщения
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
});

// Мобильное меню: открытие/закрытие сайдбара
menuToggle.addEventListener('click', () => {
  sidebar.classList.add('open');
});
closeSidebar.addEventListener('click', () => {
  sidebar.classList.remove('open');
});

// Выбор чата из списка (делегирование)
chatList.addEventListener('click', (e) => {
  const chatItem = e.target.closest('.chat-item');
  if (!chatItem) return;
  const chatId = chatItem.dataset.chatId;
  const chatName = chatItem.querySelector('.chat-name').textContent;
  switchChat(chatId, chatName);
  // На мобильных закрываем сайдбар после выбора
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
  }
});

// ================== СЛЕЖЕНИЕ ЗА СОСТОЯНИЕМ АВТОРИЗАЦИИ ==================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Пользователь вошёл
    currentUser = user;
    try {
      currentUserData = await loadUserData(user.uid);
      if (currentUserData) {
        currentUserNickname.textContent = currentUserData.nickname;
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      currentUserData = { nickname: 'Пользователь', email: user.email };
      currentUserNickname.textContent = 'Пользователь';
    }
    showScreen(chatScreen);
    // Запускаем подписку на общий чат
    subscribeToMessages(activeChatId);
  } else {
    // Пользователь вышел
    currentUser = null;
    currentUserData = null;
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }
    messagesList.innerHTML = '';
    showScreen(authScreen);
    // Очищаем поля
    emailInput.value = '';
    passwordInput.value = '';
    nicknameInput.value = '';
    clearAuthError();
    // Устанавливаем режим входа по умолчанию
    setLoginMode(true);
  }
});

// ================== ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА ==================
setLoginMode(true);

// Закрываем сайдбар при клике вне его на мобильных
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== menuToggle) {
      sidebar.classList.remove('open');
    }
  }
});