const socket=io();const $=id=>document.getElementById(id);let myHand=[],state=null,myId=null,pendingWild=-1;
const show=(id,on)=>$(id).classList.toggle("hidden",!on);
function name(){return $("name").value.trim()||"Player"}
function toast(t){$("toast").textContent=t;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2600)}
$("create").onclick=()=>socket.emit("createRoom",{name:name()});
$("join").onclick=()=>socket.emit("joinRoom",{code:$("roomCode").value,name:name()});
$("start").onclick=()=>socket.emit("startGame");
$("draw").onclick=()=>socket.emit("drawCard");
$("restart").onclick=()=>{
  if(state?.winner){
    socket.emit("restartGame");
  } else {
    toast("O‘yin tugagandan keyin qayta boshlash mumkin.");
  }
};

$("exit").onclick=()=>{
  if(confirm("Xonadan chiqmoqchimisiz?")){
    socket.emit("leaveRoom");
  }
};
};
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText($("codeText").textContent);toast("Xona kodi nusxalandi!")}catch(e){toast("Kod: "+$("codeText").textContent)}};
socket.on("connect",()=>myId=socket.id);
socket.on("joined",({code,host})=>{show("lobby",false);show("roomPanel",true);$("codeText").textContent=code;show("start",host);});
socket.on("errorMessage",toast);socket.on("notice",toast);
socket.on("state",s=>{state=s;renderState()});
socket.on("hand",h=>{myHand=h;renderHand()});
function renderState(){
  if(!state)return;
  if(!state.started){show("roomPanel",true);$("playerList").innerHTML=state.players.map(p=>`<div class="person"><span>${esc(p.name)} ${p.host?"👑":""}</span><span>Ulandi ✓</span></div>`).join("");$("waiting").textContent=state.players.length+"/10 o‘yinchi. "+(state.players.length<2?"Yana do‘st kutilyapti.":"O‘yin boshlashga tayyor!");return;}
  show("roomPanel",false);show("game",true);
  $("players").innerHTML=state.players.map((p,i)=>`<div class="player ${i===state.current?"active":""}">${esc(p.name)} · ${p.count} ta</div>`).join("");
  const me=state.players.findIndex(p=>p.id===myId);
  $("turn").textContent=state.winner?state.winner+" g‘olib!":(state.current===me?"Sizning navbatingiz":"Navbat: "+state.players[state.current].name);
  $("discard").innerHTML=state.top?`<div class="face ${state.top.color==="wild"?state.activeColor:state.top.color}">${esc(state.top.value)}</div>`:"";
  $("status").textContent=state.winner?"O‘yin tugadi.":"Faol rang: "+state.activeColor;
  $("draw").disabled=state.current!==me||!!state.winner;
  renderHand();
}
function renderHand(){
  $("count").textContent=myHand.length+" ta";
  if(!state||!state.started)return;
  const me=state.players.findIndex(p=>p.id===myId),myTurn=state.current===me&&!state.winner;
  $("hand").innerHTML="";
  myHand.forEach((c,i)=>{const b=document.createElement("button");b.className="card "+c.color;b.textContent=c.value;b.disabled=!myTurn;b.onclick=()=>{if(c.color==="wild"){pendingWild=i;show("colors",true);$("status").textContent="Wild karta uchun rang tanlang.";}else socket.emit("playCard",{index:i});};$("hand").appendChild(b);});
}
document.querySelectorAll("#colors button").forEach(b=>b.onclick=()=>{if(pendingWild>=0){socket.emit("playCard",{index:pendingWild,color:b.dataset.color});pendingWild=-1;show("colors",false);}});
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
if(window.Telegram?.WebApp){Telegram.WebApp.ready();Telegram.WebApp.expand();try{Telegram.WebApp.setHeaderColor("#071e22");Telegram.WebApp.setBackgroundColor("#071e22");}catch(e){}}
