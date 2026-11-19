const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/health", (_,res)=>res.json({ok:true, app:"UNO multiplayer"}));

const rooms = new Map();
const COLORS = ["red","yellow","green","blue"];
const makeDeck = () => {
  const d=[];
  for(const color of COLORS){
    d.push({color,value:"0"});
    for(let n=1;n<=9;n++) d.push({color,value:String(n)},{color,value:String(n)});
    for(const value of ["⦸","+2","⇄"]) d.push({color,value},{color,value});
  }
  for(let i=0;i<4;i++) d.push({color:"wild",value:"WILD"},{color:"wild",value:"+4"});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
};
const take=(g)=>{if(!g.deck.length){const top=g.discard.pop();g.deck=g.discard.splice(0);for(let i=g.deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[g.deck[i],g.deck[j]]=[g.deck[j],g.deck[i]];}g.discard=[top];}return g.deck.pop();};
const roomCode=()=>Math.random().toString(36).slice(2,7).toUpperCase();
function publicState(room){
  const g=room.game;
  return {
    code:room.code, players:room.players.map((p,i)=>({id:p.id,name:p.name,count:g?g.hands[i].length:0,host:p.id===room.host})),
    started:!!g, current:g?g.current:null, direction:g?g.direction:1,
    top:g?g.discard[g.discard.length-1]:null, activeColor:g?g.activeColor:null,
    winner:g?g.winner:null
  };
}
function emitRoom(room){io.to(room.code).emit("state",publicState(room));}
function sendHands(room){room.players.forEach((p,i)=>io.to(p.id).emit("hand",room.game?room.game.hands[i]:[]));}
function startGame(room){
  const deck=makeDeck(),hands=room.players.map(()=>[]);
  for(let k=0;k<7;k++) hands.forEach(h=>h.push(deck.pop()));
  let first=deck.pop();while(first.color==="wild"||["+2","+4","⇄","⦸"].includes(first.value)){deck.unshift(first);first=deck.pop();}
  room.game={deck,hands,discard:[first],current:0,direction:1,activeColor:first.color,winner:null};
}
function canPlay(g,c){const t=g.discard[g.discard.length-1];return c.color==="wild"||c.color===g.activeColor||c.value===t.value;}
function advance(g,n=1){g.current=(g.current+g.direction*n+g.hands.length*10)%g.hands.length;}
function play(room,socket,index,color){
  const g=room.game,pi=room.players.findIndex(p=>p.id===socket.id);
  if(!g||g.winner||pi!==g.current||!Number.isInteger(index)||index<0||index>=g.hands[pi].length)return;
  const hand=g.hands[pi],card=hand[index];if(!canPlay(g,card))return socket.emit("notice","Bu kartni tashlab bo‘lmaydi.");
  if(card.value==="+4"&&hand.some(c=>c.color===g.activeColor&&c.color!=="wild"))return socket.emit("notice","+4 uchun qo‘lingizda faol rangdagi karta bo‘lmasligi kerak.");
  if(card.color==="wild"&&!COLORS.includes(color))return socket.emit("notice","Wild karta uchun rang tanlang.");
  hand.splice(index,1);g.discard.push(card);g.activeColor=card.color==="wild"?color:card.color;
  if(!hand.length)g.winner=room.players[pi].name;
  if(g.winner){emitRoom(room);sendHands(room);return;}
  let skip=0,draw=0;
  if(card.value==="⦸")skip=1;
  if(card.value==="⇄"){g.direction*=-1;if(g.hands.length===2)skip=1;}
  if(card.value==="+2")draw=2;
  if(card.value==="+4")draw=4;
  if(draw){advance(g);for(let k=0;k<draw;k++)g.hands[g.current].push(take(g));skip=1;}
  advance(g,1+skip);
  emitRoom(room);sendHands(room);
}
io.on("connection",socket=>{
  socket.on("restartGame",()=>{
  const room=[...rooms.values()].find(r=>
    r.players.some(p=>p.id===socket.id)
  );

  if(!room  !room.game  !room.game.winner) return;

  if(room.host!==socket.id) {
    return socket.emit("notice","Faqat xona egasi qayta boshlashi mumkin.");
  }

  startGame(room);
  emitRoom(room);
  sendHands(room);
});
  socket.on("createRoom",({name})=>{
    let code;do{code=roomCode();}while(rooms.has(code));
    const player={id:socket.id,name:String(name||"Player").slice(0,18)};
    const room={code,host:socket.id,players:[player],game:null};rooms.set(code,room);socket.join(code);
    socket.emit("joined",{code,host:true});emitRoom(room);
  });
  socket.on("joinRoom",({code,name})=>{
    code=String(code||"").trim().toUpperCase();const room=rooms.get(code);
    if(!room)return socket.emit("errorMessage","Bunday xona topilmadi.");
    if(room.game)return socket.emit("errorMessage","O‘yin boshlangan. Yangi xona oching.");
    if(room.players.length>=10)return socket.emit("errorMessage","Xona to‘la (maksimum 10 kishi).");
    if(room.players.some(p=>p.id===socket.id))return;
    room.players.push({id:socket.id,name:String(name||"Player").slice(0,18)});socket.join(code);
    socket.emit("joined",{code,host:false});emitRoom(room);
  });
  socket.on("startGame",()=>{
    const room=[...rooms.values()].find(r=>r.host===socket.id);
    if(!room)return socket.emit("notice","Faqat xona egasi o‘yinni boshlashi mumkin.");
    if(room.players.length<2)return socket.emit("notice","O‘yin uchun kamida 2 kishi kerak.");
    if(room.game)return;
    startGame(room);emitRoom(room);sendHands(room);
  });
  socket.on("drawCard",()=>{
    const room=[...rooms.values()].find(r=>r.players.some(p=>p.id===socket.id));if(!room||!room.game)return;
    const g=room.game,pi=room.players.findIndex(p=>p.id===socket.id);if(pi!==g.current||g.winner)return;
    g.hands[pi].push(take(g));advance(g);emitRoom(room);sendHands(room);
  });
  socket.on("playCard",({index,color})=>{
    const room=[...rooms.values()].find(r=>r.players.some(p=>p.id===socket.id));if(room)play(room,socket,index,color);
  });
  socket.on("disconnect",()=>{
    for(const [code,room] of rooms){
      const i=room.players.findIndex(p=>p.id===socket.id);if(i<0)continue;
      room.players.splice(i,1);
      if(!room.players.length){rooms.delete(code);continue;}
      if(room.host===socket.id)room.host=room.players[0].id;
      if(room.game){room.game.hands.splice(i,1);if(room.game.current>i)room.game.current--;if(room.game.current>=room.players.length)room.game.current=0;if(room.players.length<2)room.game=null;}
      emitRoom(room);sendHands(room);
    }
  });
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("UNO server listening on "+PORT));
