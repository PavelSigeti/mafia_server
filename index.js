import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-test,Content-Type,Accept,Access-Control-Allow-Headers');
  next();
});

app.get('/current/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({
    'users_list': playerList,
    'data': playerList,
    'type': status,
    'place': mafTarget,
  }));
});

app.get('/restart', (req, res) => {
  reset();
  const resp = {'type': 'restart'};
  io.to('room').emit('chat_message', resp);
  res.send(true);
});

const httpServer = createServer(app);
const io = new Server(httpServer, { 
    cors: {
        option: '*',
    }
 });

let playerList = {};
let adminSid = null;
let role10 = ['Мирный житель', 'Мирный житель', 'Мирный житель', 'Мирный житель', 'Мирный житель', 'Мирный житель', 'Мафия', 'Мафия', 'Шериф', 'Дон мафии'];
let role8 = [
  'Мирный житель', 'Мирный житель', 'Мирный житель', 'Мирный житель', 'Мирный житель', 
  'Мафия', 
  'Шериф', 
  'Дон мафии'
];
let role = role8;
let mafTargets = [];
let mafTarget = null;
let status = 'joined_list';

function reset() {
  playerList = {};
  adminSid = null;
  role = role8;
  mafTargets = [];
  mafTarget = null;
  status = 'joined_list';
}

io.on('connection', (socket) => {
  console.log('Подключен клиент:', socket.id);

  const resp = { type: status, data: playerList };
  io.to(socket.id).emit('chat_message', resp);
  socket.join('room');

  socket.on('disconnect', () => {
    console.log('Клиент отключен:', socket.id);
    // io.leave(socket.id, 'room');
  });

  socket.on('message', (data) => {
    console.log(`Сообщение message от клиента ${socket.id}: ${data}`);

    if (data.username && typeof data.username === 'string' && Object.keys(playerList).length < 10) {
      playerList[socket.id] = data;
      playerList[socket.id]['sid'] = socket.id;
      playerList[socket.id].admin = 'false';

      if (adminSid === null) {
        adminSid = socket.id;
        playerList[socket.id].admin = 'true';
      }

      const resp = { type: 'joined_list', data: playerList };
      io.to(socket.id).emit('chat_message', { type: 'user_data', sid: socket.id, admin: playerList[socket.id].admin, username: data.username });
      io.to('room').emit('chat_message', resp);
    } else if (data.username && typeof data.username === 'string' && Object.keys(playerList).length === 10) {
      io.to('room').emit('chat_message', 'player_list_is_full');
    }
  });

  socket.on('start', (data) => {
    console.log(`Сообщение start от клиента ${socket.id}: ${data}`);

    if (data === 'start') {
      const keys = Object.keys(playerList);
      let shuffledPlayerList = {};

      keys.sort(() => Math.random() - 0.5);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const player = playerList[key];
        player.number = i + 1;
        shuffledPlayerList[key] = player;
      }

      if (Object.keys(shuffledPlayerList).length <= 8) {
        role = role8.sort(() => Math.random() - 0.5);
      } else if (Object.keys(shuffledPlayerList).length === 10) {
        role = role10.sort(() => Math.random() - 0.5);
      }

      for (const [sid, data] of Object.entries(shuffledPlayerList)) {
        data.role = role.pop();
        data.status = 'alive';
        data.admin = false;
      }
      shuffledPlayerList[adminSid].admin = true;
      playerList = shuffledPlayerList;
      
      const resp = {'type': 'users_data', 'data': playerList};
      status = 'user_data';
      io.to('room').emit('chat_message', resp);
    }

    if (data === 'night') {
      const resp = {'type': 'night_start'};
      status = 'night_start';

      io.to('room').emit('chat_message', resp);
    }

    if (data === 'don') {
      const resp = {'type': 'don'};
      status = 'don';

      io.to('room').emit('chat_message', resp);
    }

    if (data === 'restart') {
      reset();
      const resp = {'type': 'restart'};

      io.to('room').emit('chat_message', resp);
    }

    if (data === 'morning') {
      const resp = {'type': 'morning', 'place': mafTarget};
      status = 'morning';

      io.to('room').emit('chat_message', resp);
    }

 });

  const getResult = (arr) => {
    let result = 0;

    if(arr[0] === arr[1]) {
      result = arr[0];
    }

    if(arr.length === 3) {
      if(result !== arr[2]) {
          result = 0;
      }
    }

    return result;
  };

 socket.on('kill', (data) => {
    console.log(`Сообщение kill от клиента ${socket.id}: ${data}`);

    let mafCount = 2;

    if(playerList.length === 10) {
      mafCount = 3;
    }

    if (mafTargets.length < mafCount) {
      mafTargets.push(data);
    }

    if(mafTargets.length === mafCount) {
      mafTarget = getResult(mafTargets);

      const resp = {'type': 'killed_player', 'place': mafTarget};
      status = 'killed_player';

      io.to('room').emit('chat_message', resp);
    }



 });

});

httpServer.listen(8000);