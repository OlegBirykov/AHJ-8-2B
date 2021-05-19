const http = require('http');
const Koa = require('koa');
const cors = require('koa2-cors');
const WS = require('ws');

const app = new Koa();

app.use(cors());

const users = new Map();

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws) => {
//  const errCallback = (err) => {
//    if (err) {
  // TODO: handle error
//    }
//  };
  const sendUserList = () => {
    const json = JSON.stringify({
      event: 'users',
      users: Array.from(users.values()),
    });

    Array.from(wsServer.clients)
      .filter((o) => o.readyState === WS.OPEN)
      .forEach((o) => o.send(json));
  };

  ws.on('message', (msg) => {
    const req = JSON.parse(msg);
    const res = {};

    switch (req.event) {
      case 'connect':
        res.event = Array.from(users.values()).includes(req.name) ? 'noconnect' : 'connect';
        res.name = req.name;
        ws.send(JSON.stringify(res));
        if (res.event === 'noconnect') {
          return;
        }

        users.set(ws, req.name);
        sendUserList();
        break;

      case 'message':
        break;
      default:
    }
  });

  ws.on('error', () => {
    // console.log('ошибочка вышла');
  });

  ws.on('close', () => {
    users.delete(ws);
    sendUserList();
  });
});

server.listen(port);
