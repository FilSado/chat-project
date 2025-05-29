import './style.css';

const modal = document.getElementById('modal');
const nickInput = document.getElementById('nickname-input');
const submitNick = document.getElementById('submit-nick');
const errorMsg = document.getElementById('error-msg');

const chatContainer = document.getElementById('chat-container');
const usersList = document.getElementById('users-list');
const chatWindow = document.getElementById('chat-window');
const messageInput = document.getElementById('message-input');
const messageForm = document.getElementById('message-form');

let socket;
let nickname = null;

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function connectWS(nick) {
  // Замените на ваш реальный адрес WebSocket сервера
  socket = new WebSocket('ws://localhost:3000');

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'join', nickname: nick }));
  });

  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'join_ack') {
      if (data.success) {
        modal.style.display = 'none';
        chatContainer.style.display = 'flex';
        nickname = nick;
        errorMsg.style.display = 'none';
      } else {
        errorMsg.textContent = 'Псевдоним занят, выберите другой.';
        errorMsg.style.display = 'block';
      }
    } else if (data.type === 'users') {
      updateUsersList(data.users);
    } else if (data.type === 'message') {
      addMessage(data.nickname, data.message, data.timestamp);
    }
  });

  socket.addEventListener('close', () => {
    alert('Соединение с сервером потеряно');
    window.location.reload();
  });
}

function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.classList.add(user === nickname ? 'you' : '');

    const circle = document.createElement('div');
    circle.classList.add('user-circle');
    userDiv.appendChild(circle);

    const span = document.createElement('span');
    span.textContent = user === nickname ? 'You' : user;
    userDiv.appendChild(span);

    usersList.appendChild(userDiv);
  });
}

function addMessage(user, message, timestamp) {
  const msgEl = document.createElement('div');
  msgEl.classList.add('message');
    msgEl.classList.add(user === nickname ? 'you' : 'other');

  const header = document.createElement('div');
  header.classList.add('message-header');

  const nameSpan = document.createElement('span');
  nameSpan.textContent = user === nickname ? 'You' : user;

  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatDate(timestamp || Date.now());

  header.appendChild(nameSpan);
  header.appendChild(timeSpan);

  const text = document.createElement('div');
  text.classList.add('message-text');
  text.innerHTML = parseMessage(message);

  msgEl.appendChild(header);
  msgEl.appendChild(text);

  chatWindow.appendChild(msgEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function parseMessage(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => `${url}`);
}

submitNick.addEventListener('click', () => {
  const nick = nickInput.value.trim();
  if (nick) {
    errorMsg.style.display = 'none';
    connectWS(nick);
  } else {
    errorMsg.textContent = 'Пожалуйста, введите псевдоним.';
    errorMsg.style.display = 'block';
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'message', message: msg }));
    messageInput.value = '';
  }
});

messageInput.addEventListener('input', () => {
  if (messageInput.value.length > 500) {
    messageInput.value = messageInput.value.slice(0, 500);
  }
});
