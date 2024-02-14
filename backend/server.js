const WebSocket = require('ws');
const uuid = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

function noop() {}

function heartbeat() {
  if (this.isReady || (!this.isReady && balls.length < 75)){
    this.isAlive = true;
  }
  console.log("Pinging...");
}

const interval = setInterval(function ping() {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

let balls = [...Array(75).keys()].map(b => b+1);

function resetBalls(){
  balls = [...Array(75).keys()].map(b => b+1);
}

const cardPattern = [
  //blackout
  [[true, true, true, true, true],
   [true, true, true, true, true],
   [true, true, true, true, true],
   [true, true, true, true, true],
   [true, true, true, true, true]],
  //square
  [[true, true, true, true, true],
   [true, false, false, false, true],
   [true, false, false, false, true],
   [true, false, false, false, true],
   [true, true, true, true, true]],
  //cross
  [[true, false, false, false, true],
   [false, true, false, true, false],
   [false, false, true, false, false],
   [false, true, false, true, false],
   [true, false, false, false, true]],
  //diamond
  [[false, false, true, false, false],
   [false, true, false, true, false],
   [true, false, false, false, true],
   [false, true, false, true, false],
   [false, false, true, false, false]],
  //checkerboard
  [[true, false, true, false, true],
   [false, true, false, true, false],
   [true, false, true, false, true],
   [false, true, false, true, false],
   [true, false, true, false, true]],
  //B
  [[true, false, false, false, false],
   [true, false, false, false, false],
   [true, false, false, false, false],
   [true, false, false, false, false],
   [true, false, false, false, false]],
  //I
  [[false, true, false, false, false],
   [false, true, false, false, false],
   [false, true, false, false, false],
   [false, true, false, false, false],
   [false, true, false, false, false]],
  //N
  [[false, false, true, false, false],
   [false, false, true, false, false],
   [false, false, true, false, false],
   [false, false, true, false, false],
   [false, false, true, false, false]],
  //G
  [[false, false, false, true, false],
   [false, false, false, true, false],
   [false, false, false, true, false],
   [false, false, false, true, false],
   [false, false, false, true, false]],
  //O
  [[false, false, false, false, true],
   [false, false, false, false, true],
   [false, false, false, false, true],
   [false, false, false, false, true],
   [false, false, false, false, true]]
];

function shuffle(deck){
  for (let i = 0; i < deck.length; i++){
    let pick = i+Math.floor(Math.random() * (deck.length-i));
    let temp = deck[pick];
    deck[pick] = deck[i];
    deck[i] = temp;
  }
  return deck;
}

let drawingBalls = 0;//value for stopped timers

function pickBall(){
  if (balls.length > 0){
    shuffle(balls);
    console.log(`${balls.length-1} balls left`);
    showEveryone(JSON.stringify({newBall: balls.shift()}))
  } 
}

function getCardNumbers(num, count){
  return shuffle([...Array(15).keys()].map(b => b+num)).slice(0,count);
}

function generateCard(){
  return [getCardNumbers(1, 5),
          getCardNumbers(16, 5),
          getCardNumbers(31, 4),
          getCardNumbers(46, 5),
          getCardNumbers(61, 5)];
}

let users = 0, readyUsers = 0;

function showEveryone(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

function showEveryoneElse(ws, data) {
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

let winnerFound = false;

wss.on('connection', (ws) => {
  let id = uuid.v4();
  const arrival = new Date(Date.now());
  console.log(`User ${id} connected, ${arrival.toString()}`);
  ws.isAlive = true;
  users++;
  console.log(`${users} users now here`);
  console.log(`${balls.length} balls left`);
  
  let userCard = generateCard();
  ws.send(JSON.stringify({numbers: userCard}));
  showEveryone(JSON.stringify({userCount: [readyUsers, users]}));
  console.log(userCard);
  
  ws.isReady = false;
  ws.on('message', message => {
    let userAction = JSON.parse(message);
    if ("isReady" in userAction){
      if (!ws.isReady){
        ws.isReady = true;
        readyUsers++;
        checkReadyUsers();
      }
    }
    else if ("whoWon" in userAction && !winnerFound){
      let winningCard = userAction.whoWon;
      winningCard[2].splice(2,1);
      if (JSON.stringify(winningCard) == JSON.stringify(userCard)){
        ws.send(JSON.stringify({announcement: "You win"}));
        showEveryoneElse(ws, JSON.stringify({announcement: "You lose"}))
        winnerFound = true;

        clearInterval(drawingBalls);
        drawingBalls = 0;
        
        wss.clients.forEach(client => {
          client.isReady = false;
        });
        readyUsers = 0;
      }
    }
    console.log('received: %s', message);
  });

  ws.on('pong', heartbeat);
  
  ws.on('close', () => {
    const departure = new Date(Date.now());
    console.log(`User ${id} disconnected, ${departure.toString()}`);
    users--;
    
    if (ws.isReady) readyUsers--;
    
    if (readyUsers == 0){
      clearInterval(drawingBalls);
      drawingBalls = 0;
    }
    
    console.log(`${users} users left`);
    checkReadyUsers();
  });
});

function checkReadyUsers(){
  if (drawingBalls == 0){
    if (users > 0 && users === readyUsers){
      let chosenPattern = Math.floor(Math.random() * cardPattern.length);
      showEveryone(JSON.stringify({pattern: cardPattern[chosenPattern]}));
      resetBalls();
      drawingBalls = setInterval(pickBall, 1000);
      winnerFound = false;
    }
  }
  console.log("Sending user count")
  showEveryone(JSON.stringify({userCount: [readyUsers, users]}))
}


