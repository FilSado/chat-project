const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

let users = new Map(); // nickname -> ws

app.use(express.static(path.join(__dirname, '../client/dist')));

// Обработчик корневого маршрута — просто для проверки
app.get('/', (req, res) => {
  res.send('Сервер WebSocket работает! Перейди в клиентское приложение для чата.');
});

function broadcastUsers() {
  const userList = Array.from(users.keys());
  const data = JSON.stringify({ type: 'users', users: userList });
  users.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function broadcastMessage(nick, message) {
  const data = JSON.stringify({ 
    type: 'message', 
    nickname: nick, 
    message,
    timestamp: Date.now()
  });
  users.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  let userNick = null;

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'join') {
        if (users.has(data.nickname)) {
          ws.send(JSON.stringify({ type: 'join_ack', success: false }));
        } else {
          userNick = data.nickname;
          users.set(userNick, ws);
          ws.send(JSON.stringify({ type: 'join_ack', success: true }));
          broadcastUsers();
          broadcastMessage('Server', `${userNick} присоединился к чату`);
        }
      } else if (data.type === 'message' && userNick) {
        broadcastMessage(userNick, data.message);
      }
    } catch (e) {
      console.error('Ошибка обработки сообщения:', e);
    }
  });

  ws.on('close', () => {
    if (userNick) {
      users.delete(userNick);
      broadcastUsers();
      broadcastMessage('Server', `${userNick} покинул чат`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
