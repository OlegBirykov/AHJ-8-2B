const http = require('http');
const WS = require('ws');

const users = new Map();
const messages = [];

const port = process.env.PORT || 7070;
const server = http.createServer();
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws) => {
  const sendUserList = () => {
    const res = {
      event: 'users',
      users: Array.from(users.values()),
    };

    Array.from(wsServer.clients)
      .filter((o) => o.readyState === WS.OPEN)
      .forEach((o) => o.send(JSON.stringify(res)));
  };

  ws.on('message', (msg) => {
    const req = JSON.parse(msg);
    let res;
    let message;

    switch (req.event) {
      case 'connect':
        res = {
          event: Array.from(users.values()).includes(req.name) ? 'noconnect' : 'connect',
          name: req.name,
        };
        ws.send(JSON.stringify(res));
        if (res.event === 'noconnect') {
          return;
        }

        users.set(ws, req.name);
        sendUserList();
        break;

      case 'message':
        message = {
          text: req.text,
          name: users.get(ws),
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

      default:
    }
  });

  ws.on('close', () => {
    users.delete(ws);
    sendUserList();
  });
});

server.listen(port);
