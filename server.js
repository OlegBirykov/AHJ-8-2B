const http = require('http');
const WS = require('ws');

const users = new Map();
const messages = [];
const timeout = 20;

const timer = () => users.forEach((state, ws, map) => {
  const userState = {
    name: state.name,
    time: state.time - 1,
  };
  map.set(ws, userState);

  if (!userState.time) {
    ws.close();
  }
});

setInterval(timer, 1000);

const port = process.env.PORT || 7070;
const server = http.createServer();
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws) => {
  const sendUserList = () => {
    const res = {
      event: 'users',
      users: Array.from(users.values()).map((item) => item.name),
    };

    Array.from(wsServer.clients)
      .filter((o) => o.readyState === WS.OPEN)
      .forEach((o) => o.send(JSON.stringify(res)));
  };

  ws.on('message', (msg) => {
    const req = JSON.parse(msg);
    let res;
    let message;

    if (users.has(ws)) {
      const userState = users.get(ws);
      userState.time = timeout;
      users.set(ws, userState);
    }

    switch (req.event) {
      case 'connect':
        res = {
          event: Array.from(users.values()).find((item) => item.name === req.name) ? 'noconnect' : 'connect',
          name: req.name,
        };
        ws.send(JSON.stringify(res));
        if (res.event === 'noconnect') {
          return;
        }

        users.set(ws, {
          name: req.name,
          time: timeout,
        });
        sendUserList();
        break;

      case 'message':
        message = {
          text: req.text,
          name: users.get(ws).name,
          time: Date.now(),
        };

        if (messages.length && messages[messages.length - 1].time === message.time) {
          message.time++;
        }
        messages.push(message);

        res = {
          event: 'new-message',
        };
        Array.from(wsServer.clients)
          .filter((o) => o.readyState === WS.OPEN)
          .forEach((o) => o.send(JSON.stringify(res)));
        break;

      case 'request-messages':
        res = {
          event: 'messages',
          messages: messages.filter((o) => o.time > req.time),
        };
        ws.send(JSON.stringify(res));
        break;

      case 'ping':
        res = {
          event: 'pong',
        };
        ws.send(JSON.stringify(res));
        break;

      default:
    }
  });

  ws.on('error', () => {
    ws.close();
  });

  ws.on('close', () => {
    users.delete(ws);
    sendUserList();
  });
});

server.listen(port);
