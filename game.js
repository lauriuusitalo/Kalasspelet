
(function(){
"use strict";
const cv=document.getElementById('game');
const ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;
const TS=32, COLS=25, ROWS=14, W=COLS*TS, H=ROWS*TS;

// ===================== STATE =====================
const DIFF={easy:{time:9*60,label:'Lätt'},normal:{time:7*60,label:'Normal'},hard:{time:5*60,label:'Svår'}};
let difficulty='normal';
let TOTAL_TIME=DIFF[difficulty].time;
let state='menu';
let timeLeft=TOTAL_TIME, lastTs=0, coins=90, sceneIndex=0;
const quests={cat:'none',bread:'none',horse:'none',letter:'none',backpack:'none',gateKey:'none',gate:'closed',zorro:'home'};
const coinsTaken={};
let coinPickups=0;
let bonusMom=false;
let bonusPoints=0;
let ridingTalk=false;     // NPC blir överraskad om Olivia rider
let horseEatTimer=0;      // visar hästens läte vid morotslandet
const catEntity={scene:3,x:18*TS,y:12*TS};
const horseEntity={scene:4,x:14*TS,y:12*TS};
const backpackEntity={scene:2,x:13*TS,y:7*TS};   // Pappa Lauris bortglömda ryggsäck på marknaden
const keyEntity={scene:4,x:14*TS,y:7*TS};        // gömd nyckel vid trädet mitt på Festtorget
const zorroEntity={scene:0,x:22*TS,y:11*TS};     // Zorro (devon rex) i Olivias kvarter
// guldmynt utspridda i världen (6 mynt styck) — vissa gömda bakom träd/hus
const worldCoins=[
  [{c:20,r:12},{c:4,r:3}],
  [{c:22,r:12},{c:2,r:6}],
  [{c:18,r:12},{c:16,r:3}],
  [{c:6,r:12},{c:22,r:11},{c:9,r:3}],
  [{c:20,r:12},{c:5,r:3}],
  [{c:5,r:5},{c:19,r:5},{c:12,r:9},{c:4,r:11},{c:20,r:11}], // bonus: Hemlig trädgård
  [{c:6,r:6},{c:18,r:6},{c:12,r:11}],                       // bonus: Mysig bakgård
];
let now=0; // animation time
const keys={};
let interactTarget=null;

const list=[
  {id:'klanning',label:'👗 Festklänning',got:false},
  {id:'tarta',label:'🎂 Tårta',got:false},
  {id:'godis',label:'🍬 Godispåsar',got:false},
  {id:'present',label:'🪅 Piñata',got:false},
  {id:'ballong',label:'🎈 Ballonger',got:false},
];
const owned={};
let notifiedDone=false;

const player={x:8*TS,y:9*TS,speed:1.9,dir:'down',moving:false,step:0};

// ===================== PIXEL SPRITES =====================
// 12 wide x 16 tall character matrices
const M_DOWN=[
"....HHHH....","..HHHHHHHH..",".HHHHHHHHHH.",".HHSSSSSSHH.",
".HSSSSSSSSH.",".HSESSSSESH.",".HSSSSSSSSH.",".HSSSmmSSSH.",
"..SSSSSSSS..","..DDDDDDDD..",".SDDDDDDDDS.",".SDDDDDDDDS.",
"..DDDDDDDD..","..DDDDDDDD..","...LL..LL...","...BB..BB..."];
const M_DOWN_B=[
"....HHHH....","..HHHHHHHH..",".HHHHHHHHHH.",".HHSSSSSSHH.",
".HSSSSSSSSH.",".HSESSSSESH.",".HSSSSSSSSH.",".HSSSmmSSSH.",
"..SSSSSSSS..","..DDDDDDDD..",".SDDDDDDDDS.",".SDDDDDDDDS.",
"..DDDDDDDD..","..DDDDDDDD..","..LL....LL..","..BB....BB.."];
const M_UP=[
"....HHHH....","..HHHHHHHH..",".HHHHHHHHHH.",".HHHHHHHHHH.",
".HHHHHHHHHH.",".HHHHHHHHHH.",".HHHHHHHHHH.",".HHHHHHHHHH.",
"..HHHHHHHH..","..DDDDDDDD..",".SDDDDDDDDS.",".SDDDDDDDDS.",
"..DDDDDDDD..","..DDDDDDDD..","...LL..LL...","...BB..BB..."];
const M_UP_B=[
"....HHHH....","..HHHHHHHH..",".HHHHHHHHHH.",".HHHHHHHHHH.",
".HHHHHHHHHH.",".HHHHHHHHHH.",".HHHHHHHHHH.",".HHHHHHHHHH.",
"..HHHHHHHH..","..DDDDDDDD..",".SDDDDDDDDS.",".SDDDDDDDDS.",
"..DDDDDDDD..","..DDDDDDDD..","..LL....LL..","..BB....BB.."];
const M_SIDE=[
"....HHHH....","..HHHHHHHH..",".HHHHHHHHHH.",".HHHSSSSSS..",
".HHHSSSESS..",".HHHSSSSSS..",".HHHSSmSSS..","..HHSSSSS...",
"..SSSSSSSS..","..DDDDDDDD..","..DDDDDDDDS.","..DDDDDDDDS.",
"..DDDDDDDD..","..DDDDDDDD..","...LLLL.....","...BBBB....."];
const M_SIDE_B=[
"....HHHH....","..HHHHHHHH..",".HHHHHHHHHH.",".HHHSSSSSS..",
".HHHSSSESS..",".HHHSSSSSS..",".HHHSSmSSS..","..HHSSSSS...",
"..SSSSSSSS..","..DDDDDDDD..","..DDDDDDDDS.","..DDDDDDDDS.",
"..DDDDDDDD..","..DDDDDDDD..","..LL..LL....","..BB..BB...."];

function pal(H,h,D,d,B,S){return {H,h,S:S||'#f4cba2',s:'#e0ad82',E:'#2a1a12',m:'#c0504a',D,d,L:'#efe9da',B,'.':null};}
const PAL={
  olivia: pal('#8a4b1e','#6a3815','#ef72a8','#cc4f86','#e03b2c'),
  mamma:  pal('#4a3326','#34241a','#8a63e8','#6a45c0','#5b3f9c'),
  granne: pal('#b8742a','#94591c','#3fa46d','#2c7d50','#7a5230'),
  keeper: pal('#6a4a2a','#4a3318','#e0a23c','#b87d1f','#5b3f1c'),
  boy:    pal('#5a3a1e','#3f2914','#3f7fd0','#2c5ea0','#333333'),
  girl:   pal('#c98a3a','#a06a22','#ef6a4a','#c84d33','#7a3f2a'),
  baker:  pal('#9a9a9a','#777777','#ececec','#c8c8c8','#666666'),
  host:   pal('#d04a8a','#a83468','#f0c040','#c89a20','#d04a4a'),
};

function spr(mat,p,x,y,s,flip){
  for(let r=0;r<mat.length;r++){const row=mat[r];
    for(let c=0;c<row.length;c++){
      const ch=flip?row[row.length-1-c]:row[c];const col=p[ch];
      if(col){ctx.fillStyle=col;ctx.fillRect((x+c*s)|0,(y+r*s)|0,s,s);}
    }}
}
// draw character: feet at (fx,fy)
function drawChar(p,dir,moving,step,fx,fy){
  const s=3, w=12*s, h=16*s;
  const bob=moving?(Math.floor(step)%2?-2:0):0;
  let mat, flip=false;
  const f=Math.floor(step)%2===1;
  if(dir==='down') mat= (moving&&f)?M_DOWN_B:M_DOWN;
  else if(dir==='up') mat=(moving&&f)?M_UP_B:M_UP;
  else { mat=(moving&&f)?M_SIDE_B:M_SIDE; flip=(dir==='left'); }
  // shadow
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath();ctx.ellipse(fx,fy-2,15,5,0,0,7);ctx.fill();
  spr(mat,p,fx-w/2,fy-h+bob,s,flip);
}

// ===================== SCENES =====================
function rnd(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return ()=>(s=s*16807%2147483647)/2147483647;}
function hash(x,y){let n=(x*374761393+y*668265263)|0;n=(n^(n>>13))*1274126177;return ((n^(n>>16))>>>0)/4294967295;}

// shops
const shops={
 klader:{name:'👗 Klädbutiken',desc:'Fina kläder till festen!',items:[
   {id:'klanning',name:'Festklänning',price:35,listId:'klanning',col:'#ef72a8'},
   {id:'hatt',name:'Fin hatt',price:20,col:'#5b8def'},
   {id:'skor',name:'Glittriga skor',price:25,col:'#f0c040'}]},
 mat:{name:'🛒 Mataffären',desc:'Tårta, godis och annat gott.',items:[
   {id:'tarta',name:'Födelsedagstårta',price:40,listId:'tarta',col:'#f6b5cf'},
   {id:'godis',name:'Godispåsar',price:20,listId:'godis',col:'#e85a8a'},
   {id:'frukt',name:'Fruktkorg',price:15,col:'#e0532e'}]},
 leksak:{name:'🧸 Leksaksaffären',desc:'Allt för kalaset — och en färgglad piñata!',items:[
   {id:'present',name:'Piñata',price:30,listId:'present',col:'#3fa46d'},
   {id:'spel',name:'Tv-spel',price:35,col:'#3a3a55'},
   {id:'nalle',name:'Mjukis-nalle',price:18,col:'#b07a3a'}]},
 glasstand:{name:'🍦 Glasståndet',desc:'Krämig hemgjord glass! Unna dig — 30 mynt styck, köp så många du vill.',items:[
   {id:'glass_jord',name:'Jordgubbsglass 🍓',price:30,repeat:true,col:'#f6b5cf'},
   {id:'glass_chok',name:'Chokladglass 🍫',price:30,repeat:true,col:'#7a4a2a'},
   {id:'glass_vanilj',name:'Vaniljglass 🍦',price:30,repeat:true,col:'#fff0b0'}]},
 fruktstand:{name:'🍓 Bär & Frukt',desc:'Färska bär och frukter från trakten.',items:[
   {id:'bar',name:'Bär',price:10,col:'#a83fd0'},
   {id:'frukt2',name:'Frukt',price:12,col:'#e0532e'}]},
 blomstand:{name:'💐 Blomståndet',desc:'Vackra handbundna buketter.',items:[
   {id:'blommor',name:'Blombukett',price:18,mom:true,col:'#ff6fae'},
   {id:'krans',name:'Blomkrans',price:14,col:'#ffd24a'}]},
 smyckestand:{name:'💍 Handgjorda smycken',desc:'Unika halsband och armband.',items:[
   {id:'halsband',name:'Halsband',price:15,col:'#f0c040'},
   {id:'armband',name:'Armband',price:12,col:'#5be0e0'}]},
 fest:{name:'🎈 Festbutiken',desc:'Allt för det perfekta kalaset!',items:[
   {id:'ballong',name:'Ballonger',price:15,listId:'ballong',col:'#e0532e'},
   {id:'serpentin',name:'Serpentiner',price:12,col:'#3fa46d'},
   {id:'ljus',name:'Tårtljus',price:8,col:'#f0c040'}]},
};

// Scene definitions
const scenes=[
 { name:'Olivias kvarter', seed:11, grass1:'#5aa84a',grass2:'#4f9b41',path:'#caa66a',flower:'#ef72a8',terrain:'garden',
   houses:[
     {tx:3,ty:2,tw:5,th:4,wall:'#e7c08a',roof:'#c0392b',name:'Hemmet'},
     {tx:15,ty:2,tw:4,th:3,wall:'#bcd6e8',roof:'#2e6da4',name:'Granne'},
     {tx:20,ty:5,tw:4,th:3,wall:'#d8c0e0',roof:'#7c4dd6',name:'Granne'} ],
   npcs:[
     {x:10*TS,y:10*TS,pal:'mamma',name:'Mamma',dir:'down',win:true,
      line:'Grattis på födelsedagen, Olivia! 🎂 Ditt ridkalas på ridskolan börjar klockan 12 — men vi måste handla allt först! På listan: festklänning, tårta, godispåsar, piñata och ballonger. Jag kunde bara ge dig 90 mynt — det räcker inte! Plocka mynt och hjälp folk i stan för att tjäna mer. Var hemma INNAN klockan slår 12 — du har 5 minuter! Skynda dig.'},
     {x:17*TS,y:9*TS,pal:'girl',name:'Wilma',dir:'left',
      line:'*snyft* 😿 Hej bästis...'} ] },

 { name:'Torghandeln', seed:23, grass1:'#67ab53',grass2:'#5c9e49',path:'#b8b2a0',flower:'#ffd24a',terrain:'plaza',
   fountain:{cx:12.5*TS,cy:7*TS,tx:11,ty:6,tw:3,th:2},
   stalls:[
     {cx:4*TS,cy:5*TS,kind:'fruit',name:'Bär & Frukt',shop:'fruktstand'},
     {cx:8*TS,cy:4*TS,kind:'flower',name:'Blommor',shop:'blomstand'},
     {cx:17*TS,cy:4*TS,kind:'clothes',name:'Handgjorda kläder',shop:'klader'},
     {cx:21*TS,cy:5*TS,kind:'jewel',name:'Smycken',shop:'smyckestand'},
     {cx:13*TS,cy:12*TS,kind:'icecream',name:'Glasstånd',shop:'glasstand'} ],
   houses:[],
   npcs:[
     {x:10*TS,y:13*TS,pal:'keeper',name:'Glassförsäljaren',dir:'down',
      line:'Smaka på min hemgjorda glass! 🍦 Bara 30 mynt — unna dig något gott på torget!'},
     {x:8*TS,y:11*TS,pal:'boy',name:'Sampo',dir:'right',holdingIce:true,
      line:'Mmm, glassen här är ljuvlig! 🍦 Grattis på födelsedagen, Olivia — din farbror Sampo ses på ridkalaset i kväll!'},
     {x:16*TS,y:12*TS,pal:'girl',name:'Hanna',dir:'left',holdingIce:true,
      line:'Vilken god glass! 😋 Grattis Olivia, vi ses på ridkalaset!'},
     {x:22*TS,y:7*TS,pal:'granne',name:'Laura',dir:'up',
      line:'Vilka vackra smycken... 💍 Grattis Olivia! Din faster Laura kommer förstås på ridkalaset i kväll.'},
     {x:19*TS,y:9*TS,pal:'granne',name:'Stina',dir:'down',
      line:'Grattis Olivia! 🎉 Vilket mysigt torg, eller hur? Festklänningen finns i klädeståndet. Och glöm inte ballongerna i festbutiken längst bort! 🎈'} ] },

 { name:'Marknadsgatan', seed:37, grass1:'#7bb44a',grass2:'#6fa83f',path:'#d2b074',flower:'#e0532e',terrain:'market',
   houses:[
     {tx:4,ty:2,tw:5,th:4,wall:'#f3d79a',roof:'#e8920c',name:'Mataffär',shop:'mat'},
     {tx:16,ty:2,tw:4,th:3,wall:'#e8c8a0',roof:'#a8651c',name:'Bageri'} ],
   npcs:[
     {x:11*TS,y:8*TS,pal:'baker',name:'Bagaren',dir:'down',
      line:'Doften av nybakat! Tårtan i mataffären är världens godaste. Missa inte godispåsarna heller!'},
     {x:19*TS,y:10*TS,pal:'girl',name:'Elisa',dir:'left',
      line:'Grattis Olivia! 😊 Det är jag som driver ridskolan där ditt ridkalas hålls i kväll. Skynda dig så hinner du handla allt innan klockan 12!'} ] },

 { name:'Stadsparken', seed:53, grass1:'#4f9e44',grass2:'#458a3b',path:'#c2a86a',flower:'#5b8def',terrain:'park',
   pond:{tx:1,ty:11,tw:4,th:3},
   gateNorth:true,
   houses:[
     {tx:3,ty:2,tw:5,th:4,wall:'#cfeaf0',roof:'#1f9e8a',name:'Leksaksaffär',shop:'leksak'} ],
   npcs:[
     {x:9*TS,y:9*TS,pal:'girl',name:'Alivia',dir:'right',
      line:'Grattis Olivia! 🪅 Leksaksaffären har de finaste piñatorna. En sådan får inte saknas på ditt kalas!'},
     {x:13*TS,y:5*TS,pal:'keeper',name:'Trädgårdsvakten',dir:'down',
      line:'Bakom grinden där uppe ligger Бабушка och Дедушкаs datcha — full med bonuspoäng! Men jag tappade min nyckel borta vid Festtorget...'} ] },

 { name:'Festtorget', seed:71, grass1:'#6cae52',grass2:'#5fa047',path:'#c8b2d0',flower:'#ffd24a',terrain:'festival',
   fixedTrees:[{c:13,r:6}],
   houses:[
     {tx:4,ty:2,tw:5,th:4,wall:'#ffd0e8',roof:'#c0398f',name:'Festbutik',shop:'fest'},
     {tx:17,ty:2,tw:4,th:3,wall:'#fff0c0',roof:'#e0a800',name:'Tält'} ],
   npcs:[
     {x:11*TS,y:9*TS,pal:'host',name:'Festfixaren',dir:'down',
      line:'Ballonger, serpentiner och ljus — allt för festen finns här inne! Ha det så kul i kväll! 🎊'},
     {x:18*TS,y:11*TS,pal:'boy',name:'Pappa',dir:'left',
      line:'Åh nej, jag har tappat min ryggsäck på Marknadsgatan! 🎒 Det ligger något viktigt i den. Hittar du den får du 25 mynt — och då kan jag komma på ditt kalas!'} ] },

 { name:'Бабушка & Дедушка', seed:90, grass1:'#6db86a',grass2:'#5fa85e',path:'#cdb27a',flower:'#ff7ec0',terrain:'garden',
   bonus:true, stalls:[], noPath:true,
   houses:[{tx:1,ty:2,tw:4,th:4,wall:'#e3c08a',roof:'#9c5a2a',name:'Дача'}],
   greenhouse:{tx:11,ty:2,tw:4,th:3},
   fields:[{tx:6,ty:3,tw:4,th:2,kind:'carrot'},{tx:16,ty:3,tw:4,th:2,kind:'potato'}],
   npcs:[
     {x:8*TS,y:9*TS,pal:'granne',name:'Бабушка',dir:'down',bonus:true,
      line:'Privet, Olivia! Grattis på födelsedagen! Välkommen till vår datcha med växthus och grönsaksland. Vi ser så fram emot ditt kalas!'},
     {x:15*TS,y:10*TS,pal:'keeper',name:'Дедушка',dir:'down',mustache:true,
      line:'Grattis, lilla vän! Ta gärna lite potatis och morötter från landet. Vi ses på ridkalaset!'} ] },

  { name:'Kikka & Jorma', seed:91, grass1:'#6cae52',grass2:'#5fa047',path:'#c8b08a',flower:'#ffd24a',terrain:'garden',
   bonus:true, houses:[], stalls:[], noPath:true, treeBorder:true,
   meadow:{cx:4*TS,cy:12*TS}, picnic:{cx:12*TS,cy:8*TS},
   npcs:[
     {x:8*TS,y:6*TS,pal:'granne',name:'Kikka',dir:'down',bonus:true,
      line:'Vad trevligt att du hittade hit till din farmor Kikkas äng! Här gömmer sig några mynt bland blommorna — och lite extra bonuspoäng till dig! Vi ses på ridkalaset, gullet.'},
     {x:21*TS,y:11*TS,pal:'keeper',name:'Jorma',dir:'down',hammock:true,
      line:'*farfar Jorma tittar upp från korsordet* Hej Olivia, grattis! Sju bokstäver för "stor fest"... KALASET, så klart! Vi ses på ridkalaset i kväll.'} ] },
];
// scen-utgångar (vänster/höger/upp/ner) — gör världen 2D med dolda bonusrum
scenes[0].exits={right:1};
scenes[1].exits={left:0,right:2,down:6};
scenes[2].exits={left:1,right:3};
scenes[3].exits={left:2,right:4,up:5};
scenes[4].exits={left:3};
scenes[5].exits={down:3};
scenes[6].exits={up:1};

// build terrain + collision per scene (cached)
const built=[];
function buildScene(i){
  if(built[i]) return built[i];
  const sc=scenes[i];
  const grid=[]; const blocked=[]; const trees=[]; const flowers=[]; const bushes=[];
  const R=rnd(sc.seed);
  for(let r=0;r<ROWS;r++){grid[r]=[];blocked[r]=[];for(let c=0;c<COLS;c++){grid[r][c]='G';blocked[r][c]=false;}}
  // horizontal walking path (street) — kan stängas av per scen
  if(!sc.noPath) for(let c=0;c<COLS;c++){grid[9][c]='P';grid[10][c]='P';}
  // pond
  if(sc.pond){const p=sc.pond;for(let r=p.ty;r<p.ty+p.th;r++)for(let c=p.tx;c<p.tx+p.tw;c++){if(r<ROWS&&c<COLS){grid[r][c]='W';blocked[r][c]=true;}}}
  // plaza stone area for town
  if(sc.terrain==='plaza'){for(let r=7;r<12;r++)for(let c=4;c<21;c++)if(grid[r][c]==='G')grid[r][c]='S';}
  // houses footprint blocked (door open)
  sc.houses.forEach(h=>{
    h.doorCol=h.tx+Math.floor(h.tw/2); h.doorRow=h.ty+h.th-1;
    for(let r=h.ty;r<h.ty+h.th;r++)for(let c=h.tx;c<h.tx+h.tw;c++){
      if(r<ROWS&&c<COLS){ if(!(c===h.doorCol&&r===h.doorRow)) blocked[r][c]=true; }
    }
    h.doorX=h.doorCol*TS+TS/2; h.doorY=(h.doorRow+1)*TS;
  });
  // stalls block their table row
  (sc.stalls||[]).forEach(st=>{const col=Math.floor(st.cx/TS),row=Math.floor((st.cy-12)/TS);
    for(let c=col-1;c<=col+1;c++){if(row>=0&&row<ROWS&&c>=0&&c<COLS)blocked[row][c]=true;}});
  // fountain blocked
  if(sc.fountain){const f=sc.fountain;for(let r=f.ty;r<f.ty+f.th;r++)for(let c=f.tx;c<f.tx+f.tw;c++){if(r<ROWS&&c<COLS)blocked[r][c]=true;}}
  // greenhouse blocked
  if(sc.greenhouse){const g=sc.greenhouse;for(let r=g.ty;r<g.ty+g.th;r++)for(let c=g.tx;c<g.tx+g.tw;c++){if(r<ROWS&&c<COLS)blocked[r][c]=true;}}
  // trees: border line top + scattered
  function addTree(c,r){ if(r<0||r>=ROWS||c<0||c>=COLS)return; if(grid[r][c]!=='G')return; if(!sc.noPath&&r>=9&&r<=10)return;
    blocked[r][c]=true; trees.push({c,r}); }
  function treeNear(c,r){return trees.some(t=>Math.abs(t.c-c)<=1&&Math.abs(t.r-r)<=1);}
  // aldrig träd framför en dörr (dörrkolumn ±1, från dörren och några rader ner)
  function nearDoor(c,r){return sc.houses.some(h=>{const dc=h.tx+Math.floor(h.tw/2);return Math.abs(c-dc)<=1 && r>=h.ty+h.th-1 && r<=h.ty+h.th+2;});}
  const up=sc.exits&&sc.exits.up!=null, down=sc.exits&&sc.exits.down!=null;
  if(sc.treeBorder){
    // trädram runt hela bilden, med öppning där en utgång finns
    for(let c=0;c<COLS;c+=2){ if(!(up&&c>=10&&c<=14)) addTree(c,0); if(!(down&&c>=10&&c<=14)) addTree(c,ROWS-1); }
    for(let r=2;r<ROWS-1;r+=2){ addTree(0,r); addTree(COLS-1,r); }
  } else if(!up){ for(let c=0;c<COLS;c+=2) addTree(c,0); }
  (sc.fixedTrees||[]).forEach(t=>addTree(t.c,t.r)); // fasta dekorationsträd (t.ex. bredvid nyckeln)
  const tdens= sc.terrain==='park'?16:8;
  // utspridda träd: aldrig intill varandra, fria kanter, och aldrig framför en dörr
  if(!sc.treeBorder) for(let k=0;k<tdens;k++){const c=3+Math.floor(R()*(COLS-7)),r=5+Math.floor(R()*4);
    if(!treeNear(c,r)&&!nearDoor(c,r)) addTree(c,r);}
  // bushes
  for(let k=0;k<8;k++){const c=Math.floor(R()*COLS),r=11+Math.floor(R()*3);if(grid[r]&&grid[r][c]==='G'&&!blocked[r][c]){bushes.push({c,r});}}
  // flowers (deco, not blocked)
  for(let k=0;k<26;k++){const c=Math.floor(R()*COLS),r=4+Math.floor(R()*(ROWS-4));if(grid[r][c]==='G'&&!blocked[r][c]&&!(r>=9&&r<=10)){flowers.push({c,r});}}
  built[i]={grid,blocked,trees,flowers,bushes};
  return built[i];
}

// ===================== TILE DRAW =====================
function drawTile(code,sc,c,r){
  const x=c*TS,y=r*TS;
  if(code==='G'){
    ctx.fillStyle=((c+r)&1)?sc.grass1:sc.grass2; ctx.fillRect(x,y,TS,TS);
    const hv=hash(c,r);
    ctx.fillStyle='rgba(0,0,0,.10)';
    if(hv>0.7){ctx.fillRect(x+ (hv*20|0),y+8,3,7);ctx.fillRect(x+4,y+18,3,7);}
    if(hv<0.3){ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x+18,y+6,5,3);}
  } else if(code==='P'){
    ctx.fillStyle=sc.path; ctx.fillRect(x,y,TS,TS);
    ctx.fillStyle='rgba(0,0,0,.08)';
    const hv=hash(c,r);
    ctx.fillRect(x+(hv*22|0),y+(hv*22|0),4,4);ctx.fillRect(x+20,y+10,3,3);
    ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x+6,y+22,4,2);
  } else if(code==='S'){
    ctx.fillStyle='#bcb6a4'; ctx.fillRect(x,y,TS,TS);
    ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,TS-1,TS-1);
    ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+3,y+3,TS-6,3);
  } else if(code==='W'){
    ctx.fillStyle='#2f6fb0'; ctx.fillRect(x,y,TS,TS);
    ctx.fillStyle='#4f8fce';
    const o=Math.sin(now*2+c+r)*4;
    ctx.fillRect(x+4,y+8+o,12,3); ctx.fillRect(x+16,y+20-o,10,3);
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x+6,y+9+o,5,1);
  }
}

function drawTree(c,r){ drawTreePx(c*TS,r*TS); }
function drawTreePx(x,y){
  // trunk
  ctx.fillStyle='#6b4423';ctx.fillRect(x+TS/2-4,y+TS-14,8,16);
  ctx.fillStyle='#5a3618';ctx.fillRect(x+TS/2-4,y+TS-14,3,16);
  // canopy blocks
  const cx=x+TS/2, cy=y+TS/2-2;
  ctx.fillStyle='#2f7d2f';
  ctx.fillRect(cx-16,cy-14,32,24);ctx.fillRect(cx-12,cy-20,24,10);ctx.fillRect(cx-20,cy-6,40,12);
  ctx.fillStyle='#3a942f';
  ctx.fillRect(cx-12,cy-12,20,16);ctx.fillRect(cx-8,cy-18,14,8);
  ctx.fillStyle='#52ad3c';
  ctx.fillRect(cx-8,cy-10,9,9);ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(cx-6,cy-8,4,3);
}
function drawBush(c,r){
  const x=c*TS,y=r*TS;
  ctx.fillStyle='#2f7d2f';ctx.fillRect(x+3,y+12,26,16);
  ctx.fillStyle='#3a942f';ctx.fillRect(x+6,y+9,18,12);
  ctx.fillStyle='#52ad3c';ctx.fillRect(x+9,y+11,8,6);
}
function drawFlower(c,r,col){ drawFlowerPx(c*TS+TS/2,r*TS+TS/2,col); }
function drawFlowerPx(x,y,col){
  ctx.fillStyle='#2e7d2e';ctx.fillRect(x-1,y,2,8);
  ctx.fillStyle=col;ctx.fillRect(x-4,y-5,3,3);ctx.fillRect(x+1,y-5,3,3);ctx.fillRect(x-4,y-1,3,3);ctx.fillRect(x+1,y-1,3,3);
  ctx.fillStyle='#ffe27a';ctx.fillRect(x-1,y-2,2,2);
}
function drawMeadow(cx,cy){
  const cols=['#ff5d8f','#ffd23f','#5b8def','#a06ae0','#ff8a3a','#ffffff'];
  for(let i=0;i<16;i++){const a=i*2.39,rr=8+(i%4)*11;
    drawFlowerPx(cx+Math.cos(a)*rr*1.7, cy+Math.sin(a)*rr, cols[i%6]);}
}
function drawBlanket(cx,cy){
  for(let i=0;i<8;i++)for(let j=0;j<8;j++){ctx.fillStyle=((i+j)&1)?'#e0473f':'#f3ece0';ctx.fillRect(cx-32+i*8,cy-32+j*8,8,8);}
  ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=2;ctx.strokeRect(cx-32,cy-32,64,64);
  // korg
  ctx.fillStyle='#a9712e';ctx.fillRect(cx-11,cy-6,22,15);ctx.fillStyle='#8a5a22';ctx.fillRect(cx-11,cy-6,22,3);
  ctx.strokeStyle='#7a4e1e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy-6,11,Math.PI,0);ctx.stroke();
  // lite mat
  ctx.fillStyle='#ffd24a';ctx.beginPath();ctx.arc(cx+19,cy+14,4,0,7);ctx.fill();
  ctx.fillStyle='#e0532e';ctx.beginPath();ctx.arc(cx-17,cy+15,4,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(cx-4,cy+12,8,6);
}

function drawCat(x,y){
  const b=Math.sin(now*4)*1;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y,9,3,0,0,7);ctx.fill();
  ctx.fillStyle='#f4f4f4';ctx.fillRect(x-8,y-12+b,16,10); // body (vit)
  ctx.fillRect(x-10,y-16+b,9,8); // head
  ctx.fillStyle='#ffb6cf';ctx.fillRect(x-10,y-19+b,2,4);ctx.fillRect(x-5,y-19+b,2,4); // ears (rosa)
  ctx.fillStyle='#2a6a3a';ctx.fillRect(x-8,y-14+b,1,1);ctx.fillRect(x-4,y-14+b,1,1); // eyes (gröna)
  ctx.fillStyle='#f4f4f4';ctx.fillRect(x+7,y-14+b,3,2);ctx.fillRect(x+9,y-18+b,2,5); // tail
  ctx.fillStyle='#d8d8d8';ctx.fillRect(x-6,y-10+b,4,3);
}
function drawZorro(x,y){
  const b=Math.sin(now*4+1)*1;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y,9,3,0,0,7);ctx.fill();
  ctx.fillStyle='#5a5e66';ctx.fillRect(x-8,y-12+b,16,10);   // kropp (mörkgrå)
  ctx.fillStyle='#e8e8ec';ctx.fillRect(x-4,y-8+b,9,6);      // vit bringa/mage
  ctx.fillStyle='#5a5e66';ctx.fillRect(x-10,y-16+b,9,8);    // huvud
  ctx.fillStyle='#e8e8ec';ctx.fillRect(x-8,y-14+b,4,4);     // vit nos
  // stora devon rex-öron
  ctx.fillStyle='#5a5e66';ctx.fillRect(x-11,y-21+b,4,6);ctx.fillRect(x-4,y-21+b,4,6);
  ctx.fillStyle='#9aa0aa';ctx.fillRect(x-10,y-20+b,2,3);ctx.fillRect(x-3,y-20+b,2,3);
  ctx.fillStyle='#2a6a3a';ctx.fillRect(x-9,y-14+b,1,1);ctx.fillRect(x-5,y-14+b,1,1); // gröna ögon
  ctx.fillStyle='#5a5e66';ctx.fillRect(x+7,y-13+b,3,2);ctx.fillRect(x+9,y-18+b,2,6); // svans
}
function drawHorse(x,y,flip,walking,step){
  const b=Math.sin(now*3)*1, Y=v=>v+b;
  const coat='#dcc28c', shade='#c2a868', dark='#4f3b22', mane1='#efe3bf', maneD='#39301c';
  // shadow (oberoende av riktning)
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x,y,18,5,0,0,7);ctx.fill();
  ctx.save();
  if(flip){ctx.translate(2*x,0);ctx.scale(-1,1);} // vänd hästen åt rörelsehållet
  // tail (flowing, ljus med mörk kärna)
  ctx.fillStyle=maneD;ctx.fillRect(x-22,Y(y-26),5,22);
  ctx.fillStyle=mane1;ctx.fillRect(x-21,Y(y-24),2,18);
  // ben (animerad gångcykel)
  const legX=[-14,-5,4,13], frame=walking?(Math.floor(step)%2):-1;
  for(let i=0;i<4;i++){const lifted=walking&&(((i===0||i===3)?0:1)===frame);
    const lx=x+legX[i], len=lifted?10:13;
    ctx.fillStyle=coat;ctx.fillRect(lx,Y(y-13),5,len);
    ctx.fillStyle=dark;ctx.fillRect(lx,Y(y-13+len-3),5,3);}
  // body
  ctx.fillStyle=coat;ctx.fillRect(x-18,Y(y-30),38,18);
  ctx.fillStyle=shade;ctx.fillRect(x-18,Y(y-16),38,4); // mage-skugga
  // dorsal-stripe längs ryggen (typiskt fjordhäst)
  ctx.fillStyle=maneD;ctx.fillRect(x-18,Y(y-30),38,2);
  // neck
  ctx.fillStyle=coat;ctx.beginPath();
  ctx.moveTo(x+8,Y(y-30));ctx.lineTo(x+15,Y(y-50));ctx.lineTo(x+27,Y(y-48));ctx.lineTo(x+22,Y(y-28));ctx.closePath();ctx.fill();
  // head
  ctx.fillStyle=coat;ctx.fillRect(x+22,Y(y-52),14,13);
  ctx.fillStyle=shade;ctx.fillRect(x+31,Y(y-47),5,8); // mule
  ctx.fillStyle=dark;ctx.fillRect(x+33,Y(y-43),2,3); // näsborre
  // öron
  ctx.fillStyle=coat;ctx.fillRect(x+22,Y(y-57),4,6);ctx.fillRect(x+29,Y(y-57),4,6);
  ctx.fillStyle=maneD;ctx.fillRect(x+23,Y(y-56),1,4);ctx.fillRect(x+30,Y(y-56),1,4);
  // öga
  ctx.fillStyle='#140d06';ctx.fillRect(x+28,Y(y-49),2,2);
  // stående fjordman med mörk mittstrimma, längs nackkammen
  for(let t=0;t<=11;t++){
    const mx=x+9+t*(14/11), my=(y-30)-t*(20/11);
    ctx.fillStyle=mane1;ctx.fillRect(mx-2,Y(my-6),5,7);
    ctx.fillStyle=maneD;ctx.fillRect(mx,Y(my-6),1,7); // mörk kärna
  }
  // pannlugg
  ctx.fillStyle=maneD;ctx.fillRect(x+27,Y(y-55),2,5);
  ctx.restore();
}
function drawCoin(x,y){
  const b=Math.sin(now*3+x)*2;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y+8,7,3,0,0,7);ctx.fill();
  ctx.fillStyle='#caa11e';ctx.beginPath();ctx.ellipse(x,y+b,6,8,0,0,7);ctx.fill();
  ctx.fillStyle='#ffd84a';ctx.beginPath();ctx.ellipse(x,y+b,4,6,0,0,7);ctx.fill();
  ctx.fillStyle='#fff2a8';ctx.fillRect(x-1,y-3+b,2,6);
}
function drawFountain(f){
  const x=f.cx,y=f.cy;
  // kullersten runt fontänen
  ctx.save();
  ctx.beginPath();ctx.ellipse(x,y+10,70,44,0,0,7);ctx.clip();
  const cs=['#9a948a','#878276','#a8a39a','#7c776d','#928c82'];
  for(let yy=-46;yy<=46;yy+=9){const off=((yy/9)&1)*6;
    for(let xx=-72;xx<=72;xx+=12){
      ctx.fillStyle=cs[Math.abs((xx*3+yy*7))%5];
      ctx.beginPath();ctx.ellipse(x+xx+off,y+10+yy,5,4,0,0,7);ctx.fill();}}
  ctx.restore();
  ctx.fillStyle='#8a8a7c';ctx.beginPath();ctx.ellipse(x,y+6,42,20,0,0,7);ctx.fill();
  ctx.fillStyle='#9a9a8e';ctx.beginPath();ctx.ellipse(x,y,42,22,0,0,7);ctx.fill();
  ctx.fillStyle='#3f8fce';ctx.beginPath();ctx.ellipse(x,y,33,16,0,0,7);ctx.fill();
  ctx.fillStyle='#5fa6e0';ctx.beginPath();ctx.ellipse(x,y-1,33,15,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;
  for(let i=1;i<=2;i++){ctx.beginPath();ctx.ellipse(x,y,10*i+Math.sin(now*2)*2,5*i,0,0,7);ctx.stroke();}
  ctx.fillStyle='#b5b5a8';ctx.fillRect(x-5,y-28,10,26);
  ctx.fillStyle='#9a9a8e';ctx.fillRect(x-8,y-30,16,4);
  ctx.fillStyle='#bfe3ff';
  for(let i=0;i<7;i++){const a=now*3+i;const dx=Math.cos(a)*11;const dy=-Math.abs(Math.sin(a))*16-12;ctx.fillRect((x+dx)|0,(y+dy)|0,2,3);}
  ctx.fillStyle='#dff3ff';ctx.fillRect(x-2,y-33,4,6);
}
function drawBackpack(x,y){
  const b=Math.sin(now*3)*1.5;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y+8,9,3,0,0,7);ctx.fill();
  ctx.fillStyle='#c0392b';ctx.fillRect(x-8,y-12+b,16,18); // väska
  ctx.fillStyle='#9c2d22';ctx.fillRect(x-8,y-2+b,16,3);   // skugga
  ctx.fillStyle='#e0532e';ctx.fillRect(x-6,y-16+b,12,6);  // topplock
  ctx.fillStyle='#f0c040';ctx.fillRect(x-4,y-2+b,8,5);    // ficka
  ctx.fillStyle='#5a2018';ctx.fillRect(x-1,y-12+b,2,16);  // remmar mitt
  ctx.fillStyle='#3a1610';ctx.fillRect(x-7,y-1+b,2,2);ctx.fillRect(x+5,y-1+b,2,2); // spännen
}
function drawKey(x,y){
  const b=Math.sin(now*3)*2;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y+6,6,2,0,0,7);ctx.fill();
  ctx.fillStyle='#e8c84a';ctx.beginPath();ctx.arc(x-4,y-2+b,5,0,7);ctx.fill();
  ctx.fillStyle='#caa11e';ctx.beginPath();ctx.arc(x-4,y-2+b,2,0,7);ctx.fill();
  ctx.fillStyle='#e8c84a';ctx.fillRect(x-1,y-3+b,10,3);ctx.fillRect(x+7,y+b,2,4);ctx.fillRect(x+4,y+b,2,4);
}
function drawGate(open){
  const gy=1.6*TS;
  ctx.fillStyle='#7a5230';
  for(let c=0;c<COLS;c++){ if(c>=11&&c<=13)continue;
    const x=c*TS; ctx.fillRect(x+2,gy-6,TS-4,5);ctx.fillRect(x+2,gy+4,TS-4,5);
    if(c%2===0)ctx.fillRect(x+TS/2-2,gy-12,4,24); }
  ctx.fillStyle='#5a3618';ctx.fillRect(11*TS-2,gy-16,5,30);ctx.fillRect(14*TS-3,gy-16,5,30);
  if(open){
    ctx.fillStyle='#8a5a2b';ctx.fillRect(11*TS,gy-14,6,26);
    ctx.fillStyle='#2e7d2e';ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('▲ Datcha',12.5*TS,gy-22);
  } else {
    ctx.fillStyle='#9a6a3a';ctx.fillRect(11*TS+3,gy-12,3*TS-8,6);ctx.fillRect(11*TS+3,gy+6,3*TS-8,6);
    for(let i=0;i<5;i++){ctx.fillStyle='#9a6a3a';ctx.fillRect(11*TS+6+i*16,gy-12,4,24);}
    ctx.fillStyle='#caa11e';ctx.beginPath();ctx.arc(12.5*TS,gy,3,0,7);ctx.fill();
  }
}
function drawGreenhouse(gh){
  const x=gh.tx*TS,y=gh.ty*TS,w=gh.tw*TS,hh=gh.th*TS,base=y+hh*0.32;
  ctx.fillStyle='#cfe8ea';ctx.fillRect(x,base,w,y+hh-base);
  ctx.fillStyle='#bfe0e3';ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+w/2,y);ctx.lineTo(x+w,base);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(70,160,80,.55)';for(let i=0;i<gh.tw;i++)ctx.fillRect(x+8+i*TS,y+hh-15,8,11);
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;
  for(let i=1;i<gh.tw;i++){ctx.beginPath();ctx.moveTo(x+i*TS,base);ctx.lineTo(x+i*TS,y+hh);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(x,base+(y+hh-base)*0.5);ctx.lineTo(x+w,base+(y+hh-base)*0.5);ctx.stroke();
  ctx.fillStyle='#8a9a9a';ctx.fillRect(x+w/2-7,y+hh-18,14,18);
  ctx.strokeStyle='rgba(80,110,110,.8)';ctx.lineWidth=2;ctx.strokeRect(x,base,w,y+hh-base);
}
function drawField(f){
  const x=f.tx*TS,y=f.ty*TS,w=f.tw*TS,hh=f.th*TS;
  ctx.fillStyle='#6b4a2a';ctx.fillRect(x,y,w,hh);
  ctx.fillStyle='#5a3d22';for(let r=4;r<hh;r+=9)ctx.fillRect(x,y+r,w,2);
  const n=f.tw*2;
  if(f.kind==='potato'){
    for(let i=0;i<n;i++){const px=x+10+i*16;ctx.fillStyle='#3a8a3a';ctx.beginPath();ctx.arc(px,y+hh/2+2,6,0,7);ctx.fill();
      ctx.fillStyle='#4fae3c';ctx.fillRect(px-3,y+hh/2-3,6,6);}
  } else {
    for(let i=0;i<n;i++){const px=x+10+i*16;
      ctx.fillStyle='#3a8a3a';ctx.fillRect(px-1,y+hh/2-9,2,9);ctx.fillStyle='#2e7d2e';ctx.fillRect(px-4,y+hh/2-8,2,7);ctx.fillRect(px+2,y+hh/2-8,2,7);
      ctx.fillStyle='#e07a2e';ctx.beginPath();ctx.moveTo(px-3,y+hh/2);ctx.lineTo(px+3,y+hh/2);ctx.lineTo(px,y+hh/2+9);ctx.closePath();ctx.fill();}
  }
  ctx.fillStyle='rgba(20,12,40,.6)';const lbl=f.kind==='potato'?'Potatisland':'Morotsland';const lw=lbl.length*6+8;
  ctx.fillRect(x+w/2-lw/2,y-13,lw,12);
  ctx.fillStyle='#fff';ctx.font='10px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lbl,x+w/2,y-7);
}
// hängmatta-duk mellan två (riktiga) träd; figuren ritas separat som vanlig karaktär
function drawHammockCloth(x,y){
  ctx.strokeStyle='#7a5230';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x,y-30);ctx.lineTo(x,y-20);ctx.moveTo(x,y+30);ctx.lineTo(x,y+18);ctx.stroke();
  ctx.fillStyle='#b53f6e';ctx.beginPath();ctx.ellipse(x+2,y+2,19,27,0,0,7);ctx.fill();
  ctx.fillStyle='#e57aa0';ctx.beginPath();ctx.ellipse(x,y+2,17,25,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(150,50,95,.5)';ctx.lineWidth=1;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x-13,y+2+i*8);ctx.lineTo(x+13,y+2+i*8);ctx.stroke();}
}
function drawStallGoods(kind,x,ty){
  if(kind==='fruit'){const cols=['#e0532e','#d8b020','#a83fd0','#e07a2e'];
    for(let i=0;i<6;i++){ctx.fillStyle=cols[i%4];ctx.beginPath();ctx.arc(x-30+i*12,ty+4,4,0,7);ctx.fill();}}
  else if(kind==='flower'){const cols=['#ef72a8','#ffd24a','#5b8def','#e0532e','#a06ae0'];
    for(let i=0;i<6;i++){ctx.fillStyle='#2e7d2e';ctx.fillRect(x-30+i*12,ty,2,9);ctx.fillStyle=cols[i%5];ctx.beginPath();ctx.arc(x-29+i*12,ty,4,0,7);ctx.fill();}}
  else if(kind==='clothes'){const cols=['#ef72a8','#5b8def','#4fae3c'];
    for(let i=0;i<3;i++){ctx.fillStyle=cols[i];ctx.beginPath();ctx.moveTo(x-26+i*24,ty-4);ctx.lineTo(x-34+i*24,ty+10);ctx.lineTo(x-18+i*24,ty+10);ctx.closePath();ctx.fill();}}
  else if(kind==='jewel'){const cols=['#f0c040','#5be0e0','#ef72a8','#a06ae0'];
    for(let i=0;i<5;i++){ctx.fillStyle=cols[i%4];ctx.fillRect(x-28+i*12,ty+2,5,5);ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(x-27+i*12,ty+3,2,2);}}
  else if(kind==='icecream'){const cols=['#f6b5cf','#fff0b0','#b5e3c0'];
    for(let i=0;i<3;i++){ctx.fillStyle='#d8a05a';ctx.beginPath();ctx.moveTo(x-22+i*20,ty);ctx.lineTo(x-26+i*20,ty+10);ctx.lineTo(x-18+i*20,ty+10);ctx.closePath();ctx.fill();
      ctx.fillStyle=cols[i];ctx.beginPath();ctx.arc(x-22+i*20,ty-2,5,0,7);ctx.fill();}}
}
function drawStall(st){
  const x=st.cx,y=st.cy;
  const kc={fruit:'#e0532e',flower:'#ef72a8',clothes:'#7c5cf0',jewel:'#f0c040',icecream:'#4fb0c9'}[st.kind]||'#e0532e';
  ctx.fillStyle='#7a5230';ctx.fillRect(x-44,y-40,5,34);ctx.fillRect(x+39,y-40,5,34); // posts
  ctx.fillStyle='#9a6b3a';ctx.fillRect(x-46,y-18,92,10); // table
  ctx.fillStyle='#7d5328';ctx.fillRect(x-46,y-9,92,3);
  drawStallGoods(st.kind,x,y-24);
  ctx.fillStyle='#b98e5e';ctx.fillRect(x-44,y-44,88,5); // back board
  for(let i=0;i<8;i++){ctx.fillStyle=i%2?kc:'#f3ece0';ctx.fillRect(x-48+i*12,y-60,12,16);} // awning
  for(let i=0;i<8;i++){ctx.fillStyle=i%2?kc:'#f3ece0';ctx.beginPath();ctx.moveTo(x-48+i*12,y-44);ctx.lineTo(x-36+i*12,y-44);ctx.lineTo(x-42+i*12,y-38);ctx.closePath();ctx.fill();} // scallop
  const sw=Math.max(70,st.name.length*7+12);
  ctx.fillStyle='#3a2614';ctx.fillRect(x-sw/2,y-76,sw,14);
  ctx.fillStyle='#f5e2b8';ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(st.name,x,y-69);
}
function drawHouse(h){
  const x=h.tx*TS, y=h.ty*TS, w=h.tw*TS, hh=h.th*TS;
  const wallTop=y+hh*0.42;
  // wall
  ctx.fillStyle=h.wall; ctx.fillRect(x,wallTop,w,y+hh-wallTop);
  // brick lines
  ctx.fillStyle='rgba(0,0,0,.08)';
  for(let yy=wallTop+10;yy<y+hh;yy+=10) ctx.fillRect(x,yy,w,1);
  // roof (trapezoid)
  ctx.fillStyle=h.roof;
  ctx.beginPath();ctx.moveTo(x-6,wallTop);ctx.lineTo(x+w*0.18,y);ctx.lineTo(x+w*0.82,y);ctx.lineTo(x+w+6,wallTop);ctx.closePath();ctx.fill();
  // shingle lines
  ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;
  for(let i=1;i<4;i++){const yy=y+(wallTop-y)*i/4;ctx.beginPath();ctx.moveTo(x-6+ (i*3),yy);ctx.lineTo(x+w+6-(i*3),yy);ctx.stroke();}
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x+w*0.18,y+2,w*0.64,2);
  // door
  const dx=h.doorCol*TS+4, dw=TS-8, dy=y+hh-TS+4, dh=TS-4;
  ctx.fillStyle='#6b4423';ctx.fillRect(dx,dy,dw,dh);
  ctx.fillStyle='#5a3618';ctx.fillRect(dx,dy,dw,3);
  ctx.fillStyle='#ffd86b';ctx.fillRect(dx+dw-6,dy+dh/2,3,3);
  // windows
  ctx.fillStyle='#bfe3ff';
  const wy=wallTop+8;
  ctx.fillRect(x+8,wy,14,14); ctx.fillRect(x+w-22,wy,14,14);
  ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;
  ctx.strokeRect(x+8,wy,14,14);ctx.strokeRect(x+w-22,wy,14,14);
  ctx.beginPath();ctx.moveTo(x+15,wy);ctx.lineTo(x+15,wy+14);ctx.moveTo(x+8,wy+7);ctx.lineTo(x+22,wy+7);
  ctx.moveTo(x+w-15,wy);ctx.lineTo(x+w-15,wy+14);ctx.moveTo(x+w-22,wy+7);ctx.lineTo(x+w-8,wy+7);ctx.stroke();
  // sign
  const sw=Math.max(78,h.name.length*8+16);
  ctx.fillStyle='#3a2614';ctx.fillRect(x+w/2-sw/2, wallTop-18, sw,16);
  ctx.fillStyle='#f5e2b8';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(h.name, x+w/2, wallTop-10);
}

// ===================== RENDER =====================
function draw(){
  const sc=scenes[sceneIndex];
  const B=buildScene(sceneIndex);
  // terrain
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) drawTile(B.grid[r][c],sc,c,r);
  // flowers & bushes (ground deco)
  B.flowers.forEach(f=>drawFlower(f.c,f.r,sc.flower));
  B.bushes.forEach(b=>drawBush(b.c,b.r));
  (sc.fields||[]).forEach(drawField); // potatis-/morotsland
  if(sc.meadow) drawMeadow(sc.meadow.cx,sc.meadow.cy);   // blomäng i hörnet
  if(sc.picnic) drawBlanket(sc.picnic.cx,sc.picnic.cy);  // picknickfilt
  // world coins
  (worldCoins[sceneIndex]||[]).forEach((co,idx)=>{ if(coinsTaken[sceneIndex+'_'+idx])return;
    drawCoin(co.c*TS+TS/2,co.r*TS+TS/2);});
  // Nala i parken (väntar, eller leker med Zorro)
  if(sceneIndex===catEntity.scene && (quests.cat==='none'||quests.cat==='active'||quests.zorro==='friends')){
    drawCat(catEntity.x,catEntity.y);
    if(quests.zorro==='friends'){ drawZorro(catEntity.x+22,catEntity.y); // Zorro leker bredvid Nala
      ctx.fillStyle='#ff4f8b';const hx=catEntity.x+8,hy=catEntity.y-24;
      ctx.fillRect(hx,hy,2,2);ctx.fillRect(hx+4,hy,2,2);ctx.fillRect(hx,hy+2,6,2);ctx.fillRect(hx+1,hy+4,4,2);ctx.fillRect(hx+2,hy+6,2,2);}
  }
  // Zorro i Olivias kvarter (innan han bärs)
  if(sceneIndex===zorroEntity.scene && quests.zorro==='home') drawZorro(zorroEntity.x,zorroEntity.y);
  // runaway horse (before found)
  if(sceneIndex===horseEntity.scene && (quests.horse==='none'||quests.horse==='active'))
    drawHorse(horseEntity.x,horseEntity.y);
  // gömd nyckel
  if(sceneIndex===keyEntity.scene && quests.gateKey==='none') drawKey(keyEntity.x,keyEntity.y);
  // norra grinden i parken
  if(sc.gateNorth) drawGate(quests.gate==='open');
  // depth-sorted: houses, trees, npcs, player by baseline Y
  const ents=[];
  if(sceneIndex===backpackEntity.scene && quests.backpack==='active')
    ents.push({y:backpackEntity.y,draw:()=>drawBackpack(backpackEntity.x,backpackEntity.y)});
  if(sc.fountain)ents.push({y:sc.fountain.cy,draw:()=>drawFountain(sc.fountain)});
  if(sc.greenhouse)ents.push({y:(sc.greenhouse.ty+sc.greenhouse.th)*TS,draw:()=>drawGreenhouse(sc.greenhouse)});
  (sc.stalls||[]).forEach(st=>ents.push({y:st.cy,draw:()=>drawStall(st)}));
  sc.houses.forEach(h=>ents.push({y:(h.ty+h.th)*TS,draw:()=>drawHouse(h)}));
  B.trees.forEach(t=>ents.push({y:(t.r+1)*TS,draw:()=>drawTree(t.c,t.r)}));
  sc.npcs.forEach(n=>ents.push({y:n.y,draw:()=>{
    if(n.hammock){ drawTreePx(n.x-TS/2,n.y-54-TS/2); drawTreePx(n.x-TS/2,n.y+48-TS/2); drawHammockCloth(n.x,n.y); }
    drawChar(PAL[n.pal],n.dir,false,0,n.x,n.y);
    if(n.mustache){ctx.fillStyle='#5a3417';ctx.fillRect(n.x-5,n.y-29,10,2);ctx.fillRect(n.x-7,n.y-28,2,2);ctx.fillRect(n.x+5,n.y-28,2,2);}
    if(n.holdingIce){const ix=n.x+10,iy=n.y-20;ctx.fillStyle='#d8a05a';ctx.beginPath();ctx.moveTo(ix-3,iy);ctx.lineTo(ix+3,iy);ctx.lineTo(ix,iy+8);ctx.closePath();ctx.fill();ctx.fillStyle='#f6b5cf';ctx.beginPath();ctx.arc(ix,iy-2,3,0,7);ctx.fill();}
  }}));
  ents.push({y:player.y,draw:()=>{
    if(quests.horse==='found'){ drawHorse(player.x,player.y, player.dir==='left', player.moving, player.step); drawChar(PAL.olivia,player.dir,player.moving,player.step,player.x,player.y-15); }
    else drawChar(PAL.olivia,player.dir,player.moving,player.step,player.x,player.y);
  }});
  ents.sort((a,b)=>a.y-b.y);
  ents.forEach(e=>e.draw());
  // katt/Zorro följer / ryggsäck bärs (hästen rids, ritas ovan)
  if(quests.cat==='found') drawCat(player.x-22,player.y-2);
  if(quests.zorro==='carry'||quests.zorro==='carry2') drawZorro(player.x+24,player.y-2);
  if(quests.backpack==='have') drawBackpack(player.x+22,player.y-6); // bär ryggsäcken
  // hästens läte vid morotslandet
  if(horseEatTimer>0){
    const bw=132,bh=20,bx=Math.max(4,Math.min(W-bw-4,player.x-bw/2)),by=Math.max(60,player.y-58);
    ctx.fillStyle='#fff';ctx.strokeStyle='#333';ctx.lineWidth=2;ctx.fillRect(bx,by,bw,bh);ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle='#3a2614';ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('Ihhaa ha ha haaa! 🥕',bx+bw/2,by+bh/2);
  }
  // Wilma cries until cat is returned, then is happy
  const wil=sc.npcs.find(n=>n.name==='Wilma');
  if(wil){
    if(quests.cat!=='done'){ ctx.fillStyle='#5bb0ff';
      ctx.fillRect(wil.x-5,wil.y-32,2,4);ctx.fillRect(wil.x+3,wil.y-32,2,4);
      ctx.fillRect(wil.x-5,wil.y-26,2,3);ctx.fillRect(wil.x+3,wil.y-26,2,3);
    } else { ctx.fillStyle='#ff4f8b'; // happy heart
      ctx.fillRect(wil.x-3,wil.y-40,2,2);ctx.fillRect(wil.x+1,wil.y-40,2,2);ctx.fillRect(wil.x-3,wil.y-38,6,2);ctx.fillRect(wil.x-2,wil.y-36,4,2);ctx.fillRect(wil.x-1,wil.y-34,2,2);
    }
  }
  // NPC name tags
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 11px Trebuchet MS';
  sc.npcs.forEach(n=>{
    ctx.fillStyle='rgba(20,12,40,.7)';const tw=n.name.length*6+10;
    ctx.fillRect(n.x-tw/2,n.y-58,tw,14);
    ctx.fillStyle='#fff';ctx.fillText(n.name,n.x,n.y-51);
  });

  // time-of-day tint
  const frac=(state==='play'||state==='dialog'||state==='shop')?(1-timeLeft/TOTAL_TIME):0;
  if(frac>0.25){ctx.fillStyle='rgba(255,150,50,'+(0.30*(frac-0.25)).toFixed(3)+')';ctx.fillRect(0,0,W,H);}
  if(frac>0.6){ctx.fillStyle='rgba(40,30,95,'+(0.5*(frac-0.6)).toFixed(3)+')';ctx.fillRect(0,0,W,H);}

  // scene banner + arrows
  const ex=sc.exits||{};
  const label=sc.bonus?'★ Bonusrum':'('+(sceneIndex+1)+'/5)';
  ctx.fillStyle='rgba(20,12,40,.7)';ctx.fillRect(W/2-120,34,240,24);
  ctx.fillStyle='#fff';ctx.font='bold 14px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('📍 '+sc.name+'  '+label,W/2,46);
  ctx.font='bold 22px Trebuchet MS';ctx.fillStyle='rgba(255,255,255,.85)';
  if(ex.right!=null)ctx.fillText('▶',W-16,H/2);
  if(ex.left!=null)ctx.fillText('◀',16,H/2);
  if(ex.up!=null && !(sc.gateNorth&&quests.gate!=='open'))ctx.fillText('▲',W/2,72);
  if(ex.down!=null)ctx.fillText('▼',W/2,H-12);
}

// ===================== UPDATE =====================
function gotoScene(idx,edge){
  sceneIndex=idx; buildScene(idx);
  if(edge==='left')player.x=18;
  else if(edge==='right')player.x=W-18;
  else if(edge==='top')player.y=2.4*TS;
  else if(edge==='bottom')player.y=(ROWS-1.2)*TS;
  ensureFree();
}
// flytta spelaren till närmaste fria ruta om nuvarande position är blockerad
function ensureFree(){
  if(!blockedAt(player.x,player.y))return;
  const c0=Math.floor(player.x/TS),r0=Math.floor(player.y/TS);
  for(let rad=1;rad<COLS;rad++){
    for(let dc=-rad;dc<=rad;dc++)for(let dr=-rad;dr<=rad;dr++){
      if(Math.abs(dc)!==rad&&Math.abs(dr)!==rad)continue;
      const c=c0+dc,r=r0+dr;
      if(c<1||c>=COLS-1||r<2||r>=ROWS-1)continue;
      const px=c*TS+TS/2,py=r*TS+TS/2;
      if(!blockedAt(px,py)){player.x=px;player.y=py;return;}
    }
  }
}
function blockedAt(px,py){
  const B=buildScene(sceneIndex);
  const c=Math.floor(px/TS), r=Math.floor(py/TS);
  if(c<0||c>=COLS||r<0||r>=ROWS) return true;
  return B.blocked[r][c];
}
function update(dt){
  now+=dt;
  if(state!=='play')return;
  timeLeft-=dt;
  if(timeLeft<=0){timeLeft=0;loseGame();return;}

  let dx=0,dy=0;
  if(keys['ArrowLeft']){dx-=1;player.dir='left';}
  if(keys['ArrowRight']){dx+=1;player.dir='right';}
  if(keys['ArrowUp']){dy-=1;player.dir='up';}
  if(keys['ArrowDown']){dy+=1;player.dir='down';}
  player.moving=!!(dx||dy);
  if(player.moving){
    const len=Math.hypot(dx,dy);const sp=player.speed*(quests.horse==='found'?1.45:1)*dt*60;
    const nx=player.x+dx/len*sp, ny=player.y+dy/len*sp;
    let moved=false;
    if(!blockedAt(nx,player.y)){player.x=nx;moved=true;}
    if(!blockedAt(player.x,ny)){player.y=ny;moved=true;}
    // glid igenom diagonala luckor så man aldrig fastnar i ett hörn
    if(!moved && dx && dy && !blockedAt(nx,ny)){player.x=nx;player.y=ny;}
    player.step+=dt*8;
  }
  if(blockedAt(player.x,player.y)) ensureFree(); // säkerhet: lossa om man ändå hamnat i en blockerad ruta
  // bounds & transitions (4 riktningar)
  const ex0=scenes[sceneIndex].exits||{};
  const gateClosed=(scenes[sceneIndex].gateNorth && quests.gate!=='open');
  const canUp=ex0.up!=null && !gateClosed;
  if(player.x>W-10){ if(ex0.right!=null){gotoScene(ex0.right,'left');} else player.x=W-10; }
  else if(player.x<8){ if(ex0.left!=null){gotoScene(ex0.left,'right');} else player.x=8; }
  if(canUp && player.y<1*TS){ gotoScene(ex0.up,'bottom'); }
  else if(ex0.down!=null && player.y>(ROWS-0.4)*TS){ gotoScene(ex0.down,'top'); }
  else { const topLim=canUp?0.4*TS:2*TS, botLim=(ex0.down!=null)?(ROWS-0.1)*TS:(ROWS*TS-6);
    player.y=Math.max(topLim,Math.min(botLim,player.y)); }

  // interaction detection
  interactTarget=null;let best=1e9;
  const sc=scenes[sceneIndex];
  sc.houses.forEach(h=>{ if(!h.shop)return;
    const d=Math.hypot(player.x-h.doorX,player.y-h.doorY);
    if(d<46&&d<best){best=d;interactTarget={type:'shop',key:h.shop,name:h.name};}});
  (sc.stalls||[]).forEach(st=>{
    const d=Math.hypot(player.x-st.cx,player.y-st.cy);
    if(d<56&&d<best){best=d;interactTarget={type:'shop',key:st.shop,name:st.name};}});
  sc.npcs.forEach(n=>{
    const d=Math.hypot(player.x-n.x,player.y-n.y);
    if(d<48&&d<best){best=d;interactTarget={type:'npc',npc:n};}});
  if(sceneIndex===catEntity.scene&&(quests.cat==='none'||quests.cat==='active'||quests.zorro==='carry'||quests.zorro==='friends')){
    const d=Math.hypot(player.x-catEntity.x,player.y-catEntity.y);
    if(d<48&&d<best){best=d;interactTarget={type:'cat'};}}
  if(sceneIndex===zorroEntity.scene&&quests.zorro==='home'){
    const d=Math.hypot(player.x-zorroEntity.x,player.y-zorroEntity.y);
    if(d<48&&d<best){best=d;interactTarget={type:'zorro'};}}
  if(sceneIndex===horseEntity.scene&&(quests.horse==='none'||quests.horse==='active')){
    const d=Math.hypot(player.x-horseEntity.x,player.y-horseEntity.y);
    if(d<54&&d<best){best=d;interactTarget={type:'horse'};}}
  if(sceneIndex===backpackEntity.scene&&quests.backpack==='active'){
    const d=Math.hypot(player.x-backpackEntity.x,player.y-backpackEntity.y);
    if(d<48&&d<best){best=d;interactTarget={type:'backpack'};}}
  if(sceneIndex===keyEntity.scene&&quests.gateKey==='none'){
    const d=Math.hypot(player.x-keyEntity.x,player.y-keyEntity.y);
    if(d<46&&d<best){best=d;interactTarget={type:'key'};}}

  // pick up world coins
  (worldCoins[sceneIndex]||[]).forEach((co,idx)=>{const key=sceneIndex+'_'+idx;if(coinsTaken[key])return;
    const cx=co.c*TS+TS/2,cy=co.r*TS+TS/2;
    if(Math.hypot(player.x-cx,player.y-cy)<22){coinsTaken[key]=true;addCoins(6);coinPickups++;sfx('coin');}});

  // hästen äter morötter vid morotslandet
  if(quests.horse==='found'){
    const flds=scenes[sceneIndex].fields||[];
    const pc=Math.floor(player.x/TS), pr=Math.floor(player.y/TS);
    const onCarrot=flds.some(f=>f.kind==='carrot'&&pc>=f.tx&&pc<f.tx+f.tw&&pr>=f.ty-1&&pr<=f.ty+f.th);
    if(onCarrot && horseEatTimer<=0) horseEatTimer=2.4;
  }
  if(horseEatTimer>0) horseEatTimer-=dt;

  const hint=document.getElementById('hint');
  if(interactTarget){hint.style.display='block';
    hint.textContent= interactTarget.type==='shop'?('⭐ Mellanslag: handla i '+interactTarget.name)
      :interactTarget.type==='zorro'?'⭐ Mellanslag: klappa Zorro 😻'
      :interactTarget.type==='cat'?(quests.zorro==='carry'&&quests.cat==='active'?'⭐ Mellanslag: ställ ner Zorro hos Nala':quests.zorro==='friends'?'⭐ Mellanslag: ta med båda katterna':'⭐ Mellanslag: klappa katten 🐱')
      :interactTarget.type==='horse'?'⭐ Mellanslag: fånga hästen 🐴'
      :interactTarget.type==='backpack'?'⭐ Mellanslag: ta upp ryggsäcken 🎒'
      :interactTarget.type==='key'?'⭐ Mellanslag: ta nyckeln 🔑'
      :'⭐ Mellanslag: prata med '+interactTarget.npc.name;
  } else hint.style.display='none';

  // clock + live-poäng
  const cur=Math.floor(8*60+(12*60-8*60)*(1-timeLeft/TOTAL_TIME));
  document.getElementById('clockTime').textContent=String(Math.floor(cur/60)).padStart(2,'0')+':'+String(cur%60).padStart(2,'0');
  document.getElementById('timeLeft').textContent=fmt(timeLeft)+' kvar';
  const sEl=document.getElementById('score');if(sEl)sEl.textContent=currentScore();
}
function fmt(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
// poäng om man skulle klara kalaset just nu (samma formel som vid vinst)
function currentScore(){
  const qd=['cat','bread','horse','letter','backpack'].filter(k=>quests[k]==='done').length;
  return 1000+Math.floor(timeLeft)*10+qd*500+coinPickups*100+(bonusMom?800:0)+bonusPoints;
}
function getBest(){try{return +localStorage.getItem('olivia_best_'+difficulty)||0;}catch(e){return 0;}}

// ===================== ACTIONS =====================
function updateCoins(){const el=document.getElementById('coins');el.textContent=coins;el.style.color=coins<=0?'#ff6b6b':'';}
function addCoins(v){coins+=v;updateCoins();}
function showShopMsg(text,kind){const m=document.getElementById('shopMsg');if(!m)return;m.textContent=text;m.className=kind;m.style.display='block';}
function handleAction(){
  if(state==='dialog'){closeDialog();return;}
  if(state!=='play'||!interactTarget)return;
  if(interactTarget.type==='shop'){openShop(interactTarget.key);return;}
  if(interactTarget.type==='zorro'){
    quests.zorro='carry';sfx('quest');openDialog('Zorro 😻','Zorro (en mörkgrå-vit devon rex) spinner och gnider sig mot dig — han älskar Olivia! Han hoppar upp i din famn. Kanske vill han träffa en kompis?');
    return;
  }
  if(interactTarget.type==='cat'){
    if(quests.zorro==='carry'&&quests.cat==='active'){
      quests.zorro='friends';sfx('quest');openDialog('😸 Nya vänner!','Du ställer ner Zorro bredvid Nala — de nosar på varandra och börjar genast leka tillsammans! Ta med BÅDA katterna tillbaka till Wilma. 🐱🐈‍⬛');}
    else if(quests.zorro==='friends'){
      quests.zorro='carry2';quests.cat='found';sfx('quest');openDialog('🐱🐈‍⬛','Du tar upp både Nala och Zorro i famnen — de spinner nöjt. Spring till Wilma i Olivias kvarter!');}
    else if(quests.cat==='active'){quests.cat='found';sfx('quest');openDialog('Nala 🐱','Mjau! Du hittade den vita kattjejen Nala! Ta henne tillbaka till Wilma i Olivias kvarter (längst åt vänster).');}
    else openDialog('Vit katt 🐱','En söt vit katt sitter och spinner. Kanske letar någon efter den?');
    return;
  }
  if(interactTarget.type==='horse'){
    if(quests.horse==='active'){quests.horse='found';sfx('quest');openDialog('Hästen 🐴','Gnägg! Du fångade den rymda hästen! Hoppa upp och RID den tillbaka till Elisa på Marknadsgatan (du kan rida runt fritt på vägen dit).');}
    else openDialog('Häst 🐴','En vacker häst betar lugnt här. Den ser ut att ha rymt från någonstans...');
    return;
  }
  if(interactTarget.type==='backpack'){
    if(quests.backpack==='active'){quests.backpack='have';sfx('coin');openDialog('🎒 Ryggsäck','Du hittade en ryggsäck! Den är stängd och känns lite tung... Ta den till Pappa på Festtorget (längst åt höger).');}
    return;
  }
  if(interactTarget.type==='key'){
    quests.gateKey='have';sfx('coin');openDialog('🔑 Nyckel','Du hittade en gömd nyckel! Ge den till Trädgårdsvakten i Stadsparken så öppnar hon grinden till datchan.');
    return;
  }
  const n=interactTarget.npc;
  ridingTalk = (quests.horse==='found' && !n.win); // folk blir överraskade att Olivia rider
  questTalk(n);
  ridingTalk=false;
}
function questTalk(n){
  if(n.win){ if(allGot())winGame();
    else openDialog('Mamma','Du är inte klar än! 🛍️ Du saknar: '+list.filter(i=>!i.got).map(i=>i.label).join(', ')+'. Skynda dig!');
    return; }
  if(n.name==='Wilma'){
    if(quests.cat==='none'){quests.cat='active';openDialog(n.name,'*snyft* 😿 Olivia! Min vita katt Nala har sprungit bort — jag tror hon är i Stadsparken (åt höger). Snälla, kan du leta? Du får 30 mynt!');}
    else if(quests.cat==='active')openDialog(n.name,'*snyft* Har du hittat Nala än? Hon är nog kvar i Stadsparken... 😢');
    else if(quests.cat==='found'){quests.cat='done';addCoins(30);
      if(quests.zorro==='carry2'){quests.zorro='done';bonusPoints+=400;sfx('quest');
        openDialog(n.name,'NALA! 😺 *kramar katten och torkar tårarna* Och titta — hon har blivit bästa vän med Zorro! 🐈‍⬛💕 Tack snälla Olivia, du räddade min dag DUBBELT! Här är 30 mynt och extra bonuspoäng. Nu ser jag SÅ mycket fram emot att få rida på ditt ridkalas i kväll!! 🐴💖');}
      else openDialog(n.name,'NALA! 😺 *kramar katten och torkar tårarna* Tack snälla Olivia, du räddade min dag! Här är 30 mynt. Och nu ser jag SÅ mycket fram emot att få rida på ditt ridkalas i kväll!! 🐴💖');}
    else openDialog(n.name,'Tack igen för att du hittade Nala! 😺 Jag längtar verkligen till att få rida på ridkalaset! 🐴');
    return;
  }
  if(n.name==='Elisa'){
    if(quests.horse==='none'){quests.horse='active';openDialog(n.name,'Grattis Olivia! Men åh nej — en häst har rymt från min ridskola! 🐴 Jag tror den sprang ända bort till Festtorget (längst åt höger). Hittar du den får du 30 mynt!');}
    else if(quests.horse==='active')openDialog(n.name,'Har du hittat hästen än? Leta på Festtorget längst åt höger!');
    else if(quests.horse==='found'){quests.horse='done';addCoins(30);openDialog(n.name,'Du red hit den, vad duktig! 🐴 Nu står hästen redo på ridskolan. Här är 30 mynt — vi ses på ridkalaset i kväll!');}
    else openDialog(n.name,'Tack för hjälpen med hästen! 🐴');
    return;
  }
  if(n.name==='Bagaren'){
    if(quests.bread==='none'){quests.bread='active';openDialog(n.name,'Perfekt att du kom! Kan du leverera det här nybakade brödet till Festfixaren på Festtorget (längst åt höger)? Du får 30 mynt! 🍞');}
    else if(quests.bread==='active')openDialog(n.name,'Brödet är färskt — spring till Festtorget och ge det till Festfixaren!');
    else openDialog(n.name,'Tack för leveransen! Tårtan finns i mataffären här bredvid.');
    return;
  }
  if(n.name==='Festfixaren'&&quests.bread==='active'){
    quests.bread='done';addCoins(30);sfx('quest');openDialog(n.name,'Åh, färskt bröd från bagaren! Tack! 🍞 Här är 30 mynt för besväret.');
    return;
  }
  if(n.name==='Stina'){
    if(quests.letter==='none'){quests.letter='active';openDialog(n.name,'Grattis Olivia! 💌 Kan du lämna det här brevet till Alivia i Stadsparken (åt höger)? Du får 25 mynt!');}
    else if(quests.letter==='active')openDialog(n.name,'Brevet ska till Alivia i Stadsparken. Tack snälla! Och glöm inte ballongerna i festbutiken. 🎈');
    else openDialog(n.name,'Tack för att du lämnade brevet! 💌 Vi ses på ditt kalas!');
    return;
  }
  if(n.name==='Alivia'){
    if(quests.letter==='active'){quests.letter='done';addCoins(25);sfx('quest');openDialog(n.name,'Ett brev från Stina! 💌 Tack Olivia, här är 25 mynt! Förresten — leksaksaffären har de finaste piñatorna. 🪅');return;}
    openDialog(n.name,n.line);return;
  }
  if(n.name==='Pappa'){
    if(quests.backpack==='none'){quests.backpack='active';openDialog(n.name,'Tack att du vill hjälpa! Jag tappade min ryggsäck på Marknadsgatan (åt vänster). Hittar du den och tar hit den får du 25 mynt! 🎒');}
    else if(quests.backpack==='active')openDialog(n.name,'Min ryggsäck är nog kvar på Marknadsgatan. Snälla, leta efter den!');
    else if(quests.backpack==='have'){quests.backpack='done';addCoins(25);sfx('quest');openDialog(n.name,'Min ryggsäck! 🎒 Tack snälla Olivia! Här är 25 mynt. *viskar för sig själv: nu kan jag ge henne presenten på kalaset...* 🤫 Vi ses i kväll!');}
    else openDialog(n.name,'Tack igen! Vi ses på ditt kalas i kväll. 🎁');
    return;
  }
  if(n.name==='Trädgårdsvakten'){
    if(quests.gate==='open')openDialog(n.name,'Grinden är öppen — spring upp till Бабушка och Дедушкаs datcha! 🌿');
    else if(quests.gateKey==='have'){quests.gate='open';sfx('gate');openDialog(n.name,'Min nyckel! Tack! *låser upp grinden* 🔓 Nu kan du gå upp till datchan med växthus och grönsaksland. 🌻');}
    else openDialog(n.name,'Jag behöver min nyckel för att öppna grinden till datchan. Jag tror jag tappade den borta vid Festtorget (längst åt höger)... leta vid trädet mitt på torget. 🔑');
    return;
  }
  if(n.bonus){
    if(!n._claimed){n._claimed=true;bonusPoints+=600;sfx('quest');openDialog(n.name,n.line+' (+600 bonuspoäng!)');}
    else openDialog(n.name,'Du har redan fått din bonus här. 😊 Utforska gärna mer av världen!');
    return;
  }
  openDialog(n.name,n.line);
}
let curShop=null;
function openShop(key){curShop=shops[key];state='shop';
  const m=document.getElementById('shopMsg');if(m){m.style.display='none';m.textContent='';m.className='';}
  document.getElementById('shopName').textContent=curShop.name;
  document.getElementById('shopDesc').textContent=curShop.desc;renderShop();show('shop');}
function renderShop(){const box=document.getElementById('shopItems');box.innerHTML='';
  curShop.items.forEach(it=>{const row=document.createElement('div');row.className='shopItem';
    const own=owned[it.id];
    row.innerHTML='<div class="info"><span class="swatch" style="background:'+it.col+'"></span><b>'+it.name+'</b>'+
      (it.listId?' <span style="color:#ffd86b">★ på listan</span>':'')+
      '<div style="font-size:13px;opacity:.8">💰 '+it.price+' mynt</div></div>';
    const btn=document.createElement('button');btn.className='buyBtn'+(own?' owned':'');
    btn.textContent=own?'✔ Köpt':'Köp';if(!own)btn.onclick=()=>buy(it);
    row.appendChild(btn);box.appendChild(row);});}
function buy(it){if(!it.repeat&&owned[it.id])return;
  if(coins<it.price){showShopMsg('💰 Du har inte råd med '+it.name+' — pengarna räcker inte!','warn');return;}
  coins-=it.price;sfx('buy');updateCoins();
  let msg;
  if(it.repeat){ msg='Mmm, vad gott med '+it.name+'! 😋'; }
  else { owned[it.id]=true;
    if(it.mom)bonusMom=true;
    if(it.listId){const li=list.find(l=>l.id===it.listId);if(li)li.got=true;}
    msg='✔ Du köpte '+it.name+'!'; }
  if(coins<=0) msg+='  💰 Nu är pengarna slut!';
  showShopMsg(msg, coins<=0?'warn':'ok');
  renderList();renderShop();
  if(allGot()&&!notifiedDone){notifiedDone=true;
    setTimeout(()=>openDialog('💡 Tips','Du har allt på listan! Spring hem till mamma (åt vänster, plats 1) innan tiden tar slut! 🏠'),250);}}
function closeShop(){hide('shop');state='play';
  const m=document.getElementById('shopMsg');if(m){m.style.display='none';m.textContent='';m.className='';}}
function renderList(){const c=document.getElementById('listItems');c.innerHTML='';
  list.forEach(i=>{const d=document.createElement('div');d.className=i.got?'li-done':'';
    d.textContent=(i.got?'✅ ':'⬜ ')+i.label;c.appendChild(d);});}
function allGot(){return list.every(i=>i.got);}

let prevState='play';
function openDialog(name,text){prevState=state==='shop'?'play':state;state='dialog';
  if(ridingTalk){text='(häpnar) Oj, rider du på en RIKTIG häst, Olivia?! Så coolt och imponerande! 🐴✨ '+text;ridingTalk=false;}
  document.getElementById('dlgName').textContent=name;document.getElementById('dlgText').textContent=text;show('dialog');}
function closeDialog(){hide('dialog');state='play';}

// ===================== WIN / LOSE =====================
// rita spelets riktiga karaktärssprite på en valfri canvas-context
function sprOn(g,mat,p,x,y,s,flip){
  for(let r=0;r<mat.length;r++){const row=mat[r];
    for(let c=0;c<row.length;c++){const ch=flip?row[row.length-1-c]:row[c];const col=p[ch];
      if(col){g.fillStyle=col;g.fillRect((x+c*s)|0,(y+r*s)|0,s,s);}}}
}
function drawEndChar(g,palKey,cx,fy,sad,noShadow){
  const s=2,w=12*s,h=16*s,p=PAL[palKey];
  if(!noShadow){g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(cx,fy,11,3,0,0,7);g.fill();}
  sprOn(g,M_DOWN,p,cx-w/2,fy-h,s,false);
  if(sad){g.fillStyle='#5bb0ff';g.fillRect(cx-5,fy-h+11,2,5);g.fillRect(cx+3,fy-h+11,2,5);}
}
function drawEndHorse(g,x,y,col){
  col=col||'#a9712e';
  g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x,y,16,4,0,0,7);g.fill();
  g.fillStyle=col;g.fillRect(x-13,y-15,25,11);                 // kropp
  g.fillStyle='#7a5018';g.fillRect(x-11,y-5,3,6);g.fillRect(x-3,y-5,3,6);g.fillRect(x+5,y-5,3,6);g.fillRect(x+9,y-5,3,6); // ben
  g.fillStyle=col;g.fillRect(x+8,y-26,6,13);g.fillRect(x+12,y-28,9,8); // hals+huvud
  g.fillStyle='#4f3413';g.fillRect(x+6,y-26,2,13);g.fillRect(x-15,y-15,3,11); // man+svans
  g.fillStyle='#140d06';g.fillRect(x+17,y-25,1,1);             // öga
}
function drawEndRider(g,palKey,x,y,horseCol){
  drawEndHorse(g,x,y,horseCol);
  drawEndChar(g,palKey,x,y-13,false,true); // ryttaren sitter på hästryggen (ingen skugga)
}
function drawEndScene(win){
  const ec=document.getElementById('endCanvas'),g=ec.getContext('2d');g.imageSmoothingEnabled=false;
  g.clearRect(0,0,320,160);
  // room
  g.fillStyle=win?'#ffe3c0':'#3a3550';g.fillRect(0,0,320,120);
  g.fillStyle=win?'#caa06a':'#2a2740';g.fillRect(0,120,320,40);
  if(win){
    // himmel över ridskolan
    const grd=g.createLinearGradient(0,0,0,116);grd.addColorStop(0,'#bfe3ff');grd.addColorStop(1,'#e8f5d8');
    g.fillStyle=grd;g.fillRect(0,0,320,116);
    // sandig ridbana
    g.fillStyle='#e6c48f';g.fillRect(0,112,320,48);
    g.fillStyle='#d6b074';for(let i=0;i<320;i+=14)g.fillRect(i,118+(i%4),9,2);
    // arenastaket
    for(let i=0;i<320;i+=40){g.fillStyle='#8a5a22';g.fillRect(i,98,4,18);}
    g.fillStyle='#b9844e';g.fillRect(0,102,320,4);g.fillStyle='#a9712e';g.fillRect(0,110,320,3);
    // bunting flags
    const fc=['#ef72a8','#5b8def','#ffd24a','#4fae3c','#e0532e'];
    for(let i=0;i<13;i++){g.fillStyle=fc[i%5];
      g.beginPath();g.moveTo(i*26,0);g.lineTo(i*26+13,0);g.lineTo(i*26+6,14);g.closePath();g.fill();}
    // confetti
    for(let i=0;i<50;i++){g.fillStyle=fc[i%5];
      const cx=(i*47+ (now*30))%320, cy=(i*31+now*20)%96;g.fillRect(cx|0,cy|0,3,3);}
    // floating balloons with strings
    const bc=['#e0532e','#5b8def','#4fae3c','#ffd24a','#ef72a8','#a06ae0','#e08a2e'];
    for(let i=0;i<7;i++){const bx=24+i*44+Math.sin(now+i)*3, by=30+ (i%2?6:0);
      g.strokeStyle='rgba(120,120,120,.7)';g.beginPath();g.moveTo(bx,by+12);g.lineTo(bx,by+30);g.stroke();
      g.fillStyle=bc[i];g.beginPath();g.ellipse(bx,by,8,11,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.4)';g.fillRect(bx-3,by-5,2,4);}
    // banner
    g.fillStyle='#c0398f';g.fillRect(64,40,192,22);
    g.fillStyle='#9c2d72';g.fillRect(64,58,192,4);
    g.fillStyle='#fff';g.font='bold 14px Trebuchet MS';g.textAlign='center';g.textBaseline='middle';
    g.fillText('GRATTIS OLIVIA — RIDKALAS!',160,51);
    // alla rider på hästar (ryttare = spelets egna sprites)
    const horseCols=['#a9712e','#caa06a','#8a5a2b','#b98e5e','#9c6a3a'];
    drawEndRider(g,'olivia',34,132,'#caa06a');  // Olivia
    drawEndRider(g,'girl',86,132,horseCols[1]); // Wilma
    drawEndRider(g,'granne',138,132,horseCols[2]); // Stina
    drawEndRider(g,'girl',236,132,horseCols[3]); // Alivia
    drawEndRider(g,'girl',286,132,horseCols[4]); // Elisa
    // vita katten Nala sitter med Wilma
    g.fillStyle='#f4f4f4';g.fillRect(96,108,10,6);g.fillRect(94,104,6,6);
    g.fillStyle='#ffb6cf';g.fillRect(94,101,2,3);g.fillRect(98,101,2,3);
    g.fillStyle='#2a6a3a';g.fillRect(95,106,1,1);g.fillRect(98,106,1,1);
    // Pappa rider också, med den hemliga gitarren (om ryggsäcken återlämnades)
    if(quests.backpack==='done'){
      drawEndRider(g,'boy',186,132,'#9c6a3a');
      const gx=176,gy=120;
      g.fillStyle='#b5651d';g.beginPath();g.ellipse(gx,gy,6,8,0,0,7);g.fill();
      g.fillStyle='#2a1a10';g.beginPath();g.arc(gx,gy,2,0,7);g.fill();
      g.fillStyle='#7a4a23';g.fillRect(gx-1,gy-16,2,9);
    }
  } else {
    // rain + sad
    g.fillStyle='rgba(120,140,180,.5)';for(let i=0;i<40;i++){const rx=(i*37)%320,ry=(i*53+now*40)%120;g.fillRect(rx,ry,1,6);}
    drawEndChar(g,'olivia',80,120,true);
    drawEndChar(g,'girl',160,120,true);
    drawEndChar(g,'granne',240,120,true);
    g.fillStyle='#cfd';g.font='bold 13px Trebuchet MS';g.textAlign='center';g.fillText('Ridkalaset blev inställt...',160,142);
  }
}
function drawMini(g,x,y,col,sad){
  g.fillStyle='#f4cba2';g.fillRect(x-5,y-26,10,10); // head
  g.fillStyle=col;g.fillRect(x-7,y-16,14,16); // body
  g.fillStyle='#2a1a12';g.fillRect(x-3,y-23,2,2);g.fillRect(x+1,y-23,2,2);
  g.fillStyle=sad?'#7a3030':'#c0504a';
  if(sad)g.fillRect(x-2,y-18,4,2);else g.fillRect(x-2,y-19,4,2);
}
function winGame(){state='end';hide('hud');sfx('win');drawEndScene(true);
  document.getElementById('endTitle').textContent='🎉 Du klarade det på nivå '+DIFF[difficulty].label+'!';
  document.getElementById('endText').textContent='Olivia hann hem med allt precis innan klockan slog 12! På ridskolan fylldes ridbanan av ballonger, tårta och glada vänner — och alla red runt på hästar! Det blev stadens bästa ridkalas! 🎉🐴'+
    (quests.backpack==='done'?' Pappa kom på kalaset och överraskade Olivia med sin hemliga present — en glittrande gitarr! 🎸':'')+
    (bonusMom?' Och Olivia kom själv på att köpa en blombukett till mamma — mamma blev överlycklig! 💐':'')+
    ' Du spelade på svårighetsgrad '+DIFF[difficulty].label+'.';
  // ---- POÄNG ----
  const questsDone=['cat','bread','horse','letter','backpack'].filter(k=>quests[k]==='done').length;
  const base=1000;
  const timeBonus=Math.floor(timeLeft)*10;       // snabbhet
  const questBonus=questsDone*500;               // uppdrag
  const coinBonus=coinPickups*100;               // plockade mynt
  const momBonus=bonusMom?800:0;                 // hemlig present till mamma
  const total=base+timeBonus+questBonus+coinBonus+momBonus+bonusPoints;
  const stars=total>=6500?3:total>=4500?2:1;
  // highscore
  let best=0;try{best=+localStorage.getItem('olivia_best_'+difficulty)||0;}catch(e){}
  const isRecord=total>best;
  if(isRecord){try{localStorage.setItem('olivia_best_'+difficulty,total);}catch(e){}}
  const rad=(t,v)=>'<div style="display:flex;justify-content:space-between;max-width:300px;margin:2px auto;"><span>'+t+'</span><b style="color:#ffe27a">'+v+'</b></div>';
  document.getElementById('endScore').innerHTML=
    '<div style="font-size:30px;letter-spacing:4px;">'+'⭐'.repeat(stars)+'☆'.repeat(3-stars)+'</div>'+
    '<div style="font-size:14px;margin:2px 0 6px;opacity:.9;">Svårighetsgrad: <b style="color:#a78bfa">'+DIFF[difficulty].label+'</b></div>'+
    rad('🏁 Klarade kalaset','+'+base)+
    rad('⏱️ Tid kvar ('+fmt(timeLeft)+')','+'+timeBonus)+
    rad('🎯 Sidouppdrag ('+questsDone+'/5)','+'+questBonus)+
    rad('💰 Plockade mynt ('+coinPickups+')','+'+coinBonus)+
    (bonusPoints?rad('🌸 Bonusrum','+'+bonusPoints):'')+
    (momBonus?rad('💐 Hemlig present till mamma','+'+momBonus):'')+
    '<div style="border-top:2px solid rgba(255,255,255,.3);margin:8px auto 0;max-width:300px;padding-top:6px;font-size:22px;display:flex;justify-content:space-between;"><span>POÄNG</span><b style="color:#9be37a">'+total+'</b></div>'+
    (isRecord?'<div style="color:#ffd24a;font-weight:bold;margin-top:6px;">🏆 NYTT REKORD!</div>':'<div style="font-size:13px;opacity:.8;margin-top:6px;">Ditt rekord ('+DIFF[difficulty].label+'): '+best+'</div>');
  show('endView');}
function loseGame(){state='end';hide('hud');sfx('lose');drawEndScene(false);
  document.getElementById('endTitle').textContent='⏰ Klockan slog 12...';
  document.getElementById('endScore').innerHTML='';
  document.getElementById('endText').textContent='Klockan slog 12 innan Olivia hann hem med allt. Ridkalaset hann inte bli klart och gästerna blev ledsna. Du saknade: '+(list.filter(i=>!i.got).map(i=>i.label).join(', ')||'inget')+'. Försök igen — du fixar det! 💪';
  show('endView');}

// ===================== MENU / INPUT =====================
function show(id){document.getElementById(id).classList.remove('hidden');}
function hide(id){document.getElementById(id).classList.add('hidden');}
const isTouch=('ontouchstart'in window)||navigator.maxTouchPoints>0;
if(isTouch){document.getElementById('touch').style.display='block';document.body.classList.add('touch');}
// ---- bakgrundsmusik ----
const bgm=document.getElementById('bgm');bgm.volume=0.5;
// hitta musikfilen även om den döpts om (mellanslag/stora bokstäver) på GitHub
const bgmCandidates=['pixel-pathfinder.mp3','Pixel%20Pathfinder.mp3','pixel%20pathfinder.mp3','music.mp3'];
let bgmIdx=0;
bgm.addEventListener('error',()=>{bgmIdx++;if(bgmIdx<bgmCandidates.length){bgm.src=bgmCandidates[bgmIdx];bgm.load();if(musicOn)bgm.play().catch(()=>{});}});
let musicOn=true;
function setMusic(on){musicOn=on;document.getElementById('soundBtn').textContent=on?'🔊':'🔇';
  if(on){bgm.play().catch(()=>{});}else{bgm.pause();}}
document.getElementById('soundBtn').onclick=()=>setMusic(!musicOn);
// ---- ljudeffekter (WebAudio) ----
let actx=null;
function sfx(type){
  if(!musicOn)return;
  try{ if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();
    const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
    o.connect(g);g.connect(actx.destination);
    let f=440,dur=0.12,wave='square';
    if(type==='coin'){f=880;dur=0.1;}
    else if(type==='buy'){f=620;dur=0.12;}
    else if(type==='quest'){f=660;dur=0.22;o.frequency.setValueAtTime(990,t+0.11);}
    else if(type==='gate'){f=280;dur=0.3;wave='sawtooth';}
    else if(type==='win'){f=660;dur=0.5;o.frequency.setValueAtTime(990,t+0.18);o.frequency.setValueAtTime(1320,t+0.34);}
    else if(type==='lose'){f=200;dur=0.5;wave='sawtooth';o.frequency.setValueAtTime(140,t+0.25);}
    o.type=wave;o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.18,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t);o.stop(t+dur+0.03);
  }catch(e){}
}
function checkOrient(){document.body.classList.toggle('portrait',window.innerHeight>window.innerWidth);updateRotate();}
function updateRotate(){
  const portrait=window.innerHeight>window.innerWidth;
  const playing=(state==='play'||state==='dialog'||state==='shop');
  document.getElementById('rotate').classList.toggle('on', isTouch&&portrait&&playing);
  // i menyn (liggande på mobil): uppmuntra stående läge
  const mt=document.getElementById('menuTip');
  if(mt) mt.style.display=(isTouch&&!portrait&&state==='menu')?'block':'none';
}
window.addEventListener('resize',checkOrient);window.addEventListener('orientationchange',checkOrient);checkOrient();

document.querySelectorAll('.diffBtn').forEach(b=>b.onclick=()=>{
  difficulty=b.dataset.d;TOTAL_TIME=DIFF[difficulty].time;
  document.querySelectorAll('.diffBtn').forEach(x=>x.classList.toggle('sel',x===b));});
document.getElementById('btnStart').onclick=startGame;
document.getElementById('btnHow').onclick=()=>show('howto');
document.getElementById('btnStory').onclick=()=>show('storyView');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>hide(b.dataset.close));
document.getElementById('dlgOk').onclick=closeDialog;
document.getElementById('shopClose').onclick=closeShop;
document.getElementById('btnAgain').onclick=()=>location.reload();

function startGame(){hide('menu');show('hud');state='play';
  TOTAL_TIME=DIFF[difficulty].time;timeLeft=TOTAL_TIME;sceneIndex=0;coins=90;notifiedDone=false;
  player.x=8*TS;player.y=9*TS;player.dir='down';
  list.forEach(i=>i.got=false);for(const k in owned)delete owned[k];
  quests.cat='none';quests.bread='none';quests.horse='none';
  quests.letter='none';quests.backpack='none';quests.gateKey='none';quests.gate='closed';quests.zorro='home';
  coinPickups=0;bonusMom=false;bonusPoints=0;ridingTalk=false;horseEatTimer=0;
  scenes.forEach(s=>s.npcs.forEach(n=>{n._claimed=false;}));
  for(const k in coinsTaken)delete coinsTaken[k];
  document.getElementById('coins').textContent=coins;renderList();
  document.getElementById('best').textContent=getBest();
  document.getElementById('score').textContent=currentScore();
  if(musicOn){bgm.currentTime=0;bgm.play().catch(()=>{});
    try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();actx.resume&&actx.resume();}catch(e){}}
  openDialog('Mamma',scenes[0].npcs[0].line);}

window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  keys[e.key]=true;if(e.key===' ')handleAction();
  if(e.key==='m'||e.key==='M')setMusic(!musicOn);});
window.addEventListener('keyup',e=>{keys[e.key]=false;});
document.querySelectorAll('#dpad button').forEach(b=>{const k=b.dataset.k;
  const on=e=>{e.preventDefault();keys[k]=true;};const off=e=>{e.preventDefault();keys[k]=false;};
  b.addEventListener('touchstart',on);b.addEventListener('touchend',off);
  b.addEventListener('mousedown',on);b.addEventListener('mouseup',off);b.addEventListener('mouseleave',off);});
document.getElementById('actBtn').addEventListener('touchstart',e=>{e.preventDefault();handleAction();});
document.getElementById('actBtn').addEventListener('mousedown',e=>{e.preventDefault();handleAction();});

// ===================== LOOP =====================
function loop(ts){const dt=Math.min(0.05,(ts-lastTs)/1000||0);lastTs=ts;update(dt);draw();updateRotate();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
})();
