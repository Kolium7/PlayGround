(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height,TAU=Math.PI*2;
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const characters=[
 {id:'morgan',name:'MORGAN',full:'MORGAN',role:'ARSENALISTA',color:'#ff6a92',hp:112,max:112,mp:48,maxMp:48,quote:'“Sempre tem uma saída. Ou um explosivo.”',shape:'hood',armor:'#263445'},
 {id:'carlos',name:'CARLOS',full:'CARLOS SANT’ANNA',role:'HACKER · PRESO POLÍTICO',color:'#61ddc3',hp:92,max:92,mp:72,maxMp:72,quote:'“A cidade pertence a quem a mantém viva.”',shape:'tech',armor:'#315d5a'},
 {id:'gabi',name:'GABRIELA',full:'GABRIELA SOARES',role:'PUGILISTA · PRATA OLÍMPICA',color:'#ff83c2',hp:138,max:138,mp:38,maxMp:38,quote:'“O braço é novo. A raiva, não.”',shape:'fighter',armor:'#973e74'},
 {id:'sam',name:'SAM',full:'SAM',role:'BIOQUÍMICA · PRONOMES LIVRES',color:'#efc56e',hp:104,max:104,mp:82,maxMp:82,quote:'“Tudo é veneno. Inclusive a dose.”',shape:'chemist',armor:'#516543'}
];
let player={x:560,y:620,dir:0,speed:130,walk:0,step:0},camera={x:0,y:0};
let keys={},t0=performance.now(),time=0,frame=0,activeChar=0,toastTimer=0,dialogueQueue=[],currentDialogue=null;
let mode='explore',round=1,partyTurn=0,selectedEnemy=0,combatLog=[],corrosionCharged=false,preemptive=false,enemyTimer=0;
let broken=false,secretFound=false,doorOpen=false,archiveEntered=false,objective='Encontre a entrada do arquivo municipal',zone='BAIXADA · SETOR 09',storyStep=0;
let inventory={creditos:0,ampolas:0,fragmentos:0};
const enemies=[];
const particles=[];
const pickups=[{x:366,y:690,name:'Ampola de Bio-gel',type:'ampolas',amount:1,color:'#b9ff91',taken:false},{x:1148,y:825,name:'Créditos (₡ 35)',type:'creditos',amount:35,color:'#f7d576',taken:false},{x:1240,y:325,name:'Fragmento de memória',type:'fragmentos',amount:1,color:'#62eddb',taken:false},{x:1380,y:760,name:'Bio-gel',type:'ampolas',amount:1,color:'#b9ff91',taken:false}];
const objects=[
 {x:472,y:477,r:54,type:'person',name:'Dona Iara',hint:'MORADORA',used:false},
 {x:906,y:529,r:57,type:'terminal',name:'Terminal da CODESP',hint:'TERMINAL MUNICIPAL',used:false},
 {x:1310,y:538,r:56,type:'door',name:'Arquivo municipal',hint:'ACESSO RESTRITO',used:false},
 {x:1238,y:332,r:56,type:'wall',name:'Parede rachada',hint:'ESTRUTURA INSTÁVEL',used:false},
 {x:708,y:925,r:54,type:'person',name:'Vigia da maré',hint:'VIGIA DA VÁRZEA',used:false}
];
const walls=[
 {x:90,y:110,w:390,h:224,kind:'house',name:'casa'}, {x:650,y:90,w:390,h:250,kind:'house',name:'casa'},
 {x:1285,y:85,w:405,h:278,kind:'archive',name:'arquivo'}, {x:120,y:780,w:320,h:300,kind:'house',name:'palafita'},
 {x:735,y:740,w:390,h:350,kind:'warehouse',name:'oficina'},
 {x:478,y:382,w:40,h:197,kind:'stall',name:'barraca'},
 {x:720,y:397,w:34,h:210,kind:'stall',name:'barraca'},
 {x:1168,y:410,w:50,h:190,kind:'planter',name:'mureta'}
];
const buildings=[
 {x:90,y:110,w:390,h:224,color:'#44382f',roof:'#59463a',label:'BAR DO ZÉ',sign:'#f6bb62'},
 {x:650,y:90,w:390,h:250,color:'#303d3b',roof:'#3d5750',label:'COOPERATIVA',sign:'#68d9b8'},
 {x:1285,y:85,w:405,h:278,color:'#28323b',roof:'#36444e',label:'ARQUIVO PÚBLICO',sign:'#fc789b'},
 {x:120,y:780,w:320,h:300,color:'#46504a',roof:'#5b6552',label:'',sign:'#d0ab71'},
 {x:735,y:740,w:390,h:350,color:'#394342',roof:'#4b5851',label:'OFICINA DA MARÉ',sign:'#f1bc64'}
];
const water={};
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=960*dpr;canvas.height=600*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);resize();
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');toastTimer=2.8}
function dialogue(speaker,text){currentDialogue={speaker,text};$('#dialogueSpeaker').textContent=speaker;$('#dialogueText').textContent=text;$('#dialogue').classList.remove('hidden')}
function closeDialogue(){if(!currentDialogue)return;$('#dialogue').classList.add('hidden');currentDialogue=null;if(dialogueQueue.length){const d=dialogueQueue.shift();dialogue(d[0],d[1])}}
function setObjective(text){objective=text;$('#objectiveText').textContent=text}
function setZone(name){zone=name;$('#zoneName').textContent=name;$('#footerZone').textContent=name.replace(' · ',' / ')}
function addParticle(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-60,60),vy:rand(-95,8),life:rand(.35,.8),max:.8,color,size:rand(1,3)})}
function seeded(x,y){const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function world(){return {x:camera.x,y:camera.y}}
function drawGround(){
 ctx.fillStyle='#192e31';ctx.fillRect(0,0,1800,1200);
 // tidal channels and old-world fragments
 ctx.fillStyle='#12353a';ctx.fillRect(0,0,1800,53);ctx.fillRect(0,1138,1800,62);ctx.fillRect(0,0,56,1200);ctx.fillRect(1740,0,60,1200);
 for(let i=0;i<48;i++){let x=seeded(i,2)*1760+20,y=(i*83+Math.sin(time*.4+i)*6)%1200;ctx.fillStyle=i%3?'#285056':'#376267';ctx.fillRect(x,y,rand(8,28),2)}
 // uneven concrete plaza
 for(let y=50;y<1150;y+=48)for(let x=50;x<1750;x+=48){let n=seeded(x,y);ctx.fillStyle=n>.8?'#394142':n>.42?'#343b3c':'#303839';ctx.fillRect(x+1,y+1,46,46);ctx.fillStyle='#ffffff05';ctx.fillRect(x+2,y+2,43,1);if(n>.87){ctx.fillStyle='#171f20';ctx.fillRect(x+8,y+13,5,2);ctx.fillRect(x+28,y+32,9,2)}}
 // flooded street band, raised boardwalks
 ctx.fillStyle='#163a42';ctx.fillRect(0,630,1800,82);ctx.fillStyle='#344543';ctx.fillRect(0,622,1800,7);ctx.fillRect(0,710,1800,7);
 for(let x=0;x<1800;x+=32){ctx.fillStyle='#8c7660';ctx.fillRect(x,640,2,57);ctx.fillStyle='#ffffff10';ctx.fillRect(x+3,646,14,1)}
 for(let i=0;i<55;i++){let x=(i*73+time*8)%1800,y=635+seeded(i,9)*70;ctx.strokeStyle=`rgba(107,208,207,${.06+seeded(i,3)*.1})`;ctx.beginPath();ctx.ellipse(x,y,rand(5,20),1.2,0,0,TAU);ctx.stroke()}
 // market lane paint, drains and weeds
 ctx.fillStyle='#c87955';ctx.globalAlpha=.16;ctx.fillRect(520,370,12,270);ctx.fillRect(770,355,11,280);ctx.globalAlpha=1;
 for(let i=0;i<150;i++){let x=70+seeded(i,31)*1660,y=70+seeded(i,71)*1060;if(buildings.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h))continue;if(seeded(x|0,y|0)>.985){ctx.fillStyle='#779660';ctx.fillRect(x,y,2,5)}}
 // wet specular pools
 for(const [x,y,w,h] of [[545,780,80,21],[1140,770,42,18],[540,348,63,12],[1183,660,29,25],[450,945,70,23]]){ctx.fillStyle='#142f35';ctx.fillRect(x,y,w,h);ctx.fillStyle='#7dc6c433';ctx.fillRect(x+8,y+4,w*.52,2);ctx.fillRect(x+w*.66,y+10,w*.2,1)}
}
function drawBuilding(b,i){
 // building shadow / side depth
 ctx.fillStyle='#0c1114a8';ctx.fillRect(b.x+14,b.y+b.h-3,b.w,b.h*.2+20);
 ctx.fillStyle='#202a2d';ctx.fillRect(b.x+12,b.y+12,b.w,b.h);
 ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h);
 // rooftop patches and corrugated plates
 ctx.fillStyle=b.roof;ctx.fillRect(b.x+5,b.y+5,b.w-10,b.h-10);
 for(let k=0;k<8;k++){let rx=b.x+12+seeded(i,k)*Math.max(20,b.w-58),ry=b.y+14+seeded(k,i)*Math.max(20,b.h-42);ctx.fillStyle=k%2?'#ffffff0b':'#11182022';ctx.fillRect(rx,ry,18+seeded(k,8)*38,3)}
 ctx.fillStyle='#1b2527';ctx.fillRect(b.x+b.w*.18,b.y+b.h*.21,b.w*.38,b.h*.26);
 ctx.fillStyle='#55776e';ctx.globalAlpha=.25;ctx.fillRect(b.x+b.w*.18+4,b.y+b.h*.21+4,b.w*.38-8,b.h*.26-8);ctx.globalAlpha=1;
 // roof garden vines and solar sheets
 ctx.fillStyle='#66815a';for(let n=0;n<11;n++){let vx=b.x+seeded(n,i+5)*(b.w-12),vy=b.y+seeded(n+3,i)*b.h;ctx.fillRect(vx,vy,3,2);if(n%3===0){ctx.fillStyle='#91a268';ctx.fillRect(vx+2,vy-3,3,3);ctx.fillStyle='#66815a'}}
 ctx.fillStyle='#1b2428';ctx.fillRect(b.x+b.w*.68,b.y+b.h*.64,b.w*.24,b.h*.18);ctx.fillStyle='#427178';ctx.fillRect(b.x+b.w*.7,b.y+b.h*.66,b.w*.19,b.h*.13);
 // raised utility tanks
 ctx.fillStyle='#283337';ctx.fillRect(b.x+b.w*.79,b.y+15,31,23);ctx.fillStyle='#657570';ctx.fillRect(b.x+b.w*.79+3,b.y+17,25,2);ctx.fillStyle='#131c20';ctx.fillRect(b.x+b.w*.82,b.y+10,11,7);
 // improvised facade edge and Portuguese neon sign
 ctx.fillStyle='#162126';ctx.fillRect(b.x,b.y+b.h-10,b.w,11);ctx.fillStyle=b.sign;ctx.shadowColor=b.sign;ctx.shadowBlur=14;ctx.fillRect(b.x+b.w*.14,b.y+b.h-19,Math.min(160,b.w*.48),3);ctx.shadowBlur=0;
 if(b.label){ctx.font='bold 8px monospace';ctx.fillStyle=b.sign;ctx.fillText(b.label,b.x+b.w*.14,b.y+b.h-24)}
 // narrow stair / door
 ctx.fillStyle='#222729';ctx.fillRect(b.x+b.w*.44,b.y+b.h-2,39,12);ctx.fillStyle='#725843';ctx.fillRect(b.x+b.w*.45,b.y+b.h-10,36,9);ctx.fillStyle='#b9a17c';ctx.fillRect(b.x+b.w*.45,b.y+b.h-10,36,2);
 // wires strung across the roof
 ctx.strokeStyle='#10171b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x-35,b.y+20);ctx.quadraticCurveTo(b.x+b.w*.48,b.y-10,b.x+b.w+35,b.y+41);ctx.stroke();
}
function drawStreetProps(){
 // palm trunks and glossy fronds
 const palms=[[565,431],[1090,423],[1527,420],[1278,1060],[490,1080],[70,554],[1743,505]];
 for(let i=0;i<palms.length;i++){const [x,y]=palms[i];ctx.fillStyle='#11191a';ctx.beginPath();ctx.ellipse(x+3,y+8,15,7,0,0,TAU);ctx.fill();ctx.strokeStyle='#695b43';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+5);ctx.quadraticCurveTo(x-3,y-17,x+5,y-37);ctx.stroke();for(let j=0;j<7;j++){let a=j*.91+time*.03;ctx.strokeStyle=j%2?'#658053':'#84a066';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+5,y-36);ctx.quadraticCurveTo(x+Math.cos(a)*20,y-52+Math.sin(a)*8,x+Math.cos(a)*31,y-41+Math.sin(a)*15);ctx.stroke()}}
 // kiosks, tarps, café details
 for(const [x,y,c] of [[535,452,'#bd565e'],[781,424,'#5b9290'],[581,929,'#c39757']]){ctx.fillStyle='#101719';ctx.fillRect(x,y+18,90,35);ctx.fillStyle=c;ctx.fillRect(x,y,90,9);ctx.fillStyle='#232b2a';ctx.fillRect(x+7,y+9,75,25);for(let n=0;n<5;n++){ctx.fillStyle=n%2?'#e4b575':'#382e2b';ctx.fillRect(x+12+n*14,y+11,8,18)}ctx.fillStyle='#eee0bc';ctx.fillRect(x+2,y-2,10,5);ctx.fillRect(x+75,y-2,12,5)}
 // bundles of tangled cables and street lights
 for(let i=0;i<8;i++){let x=603+i*78,y=370+(i%2)*18;ctx.fillStyle='#202529';ctx.fillRect(x,y,3,68);ctx.fillStyle='#f0bd62';ctx.shadowColor='#f0bd62';ctx.shadowBlur=9;ctx.fillRect(x-2,y+68,7,2);ctx.shadowBlur=0}
 // hydroponic crate vegetation
 for(const [x,y] of [[1092,501],[1095,537],[1143,794],[460,748]]){ctx.fillStyle='#423d31';ctx.fillRect(x,y,30,19);ctx.fillStyle='#5e704e';for(let k=0;k<7;k++){ctx.fillRect(x+3+k*4,y-4-seeded(k,x)*8,3,8)}ctx.fillStyle='#9a7757';ctx.fillRect(x,y+16,30,3)}
 // hanging fabric and laundry
 ctx.fillStyle='#a94f5a';ctx.fillRect(487,345,43,5);ctx.fillStyle='#4b8790';ctx.fillRect(495,350,13,16);ctx.fillStyle='#cfad69';ctx.fillRect(512,350,12,13);
}
function drawFlyingCar(){let x=((time*34+190)%1250)+240,y=112+Math.sin(time*.47)*11;ctx.globalAlpha=.8;ctx.fillStyle='#111619';ctx.beginPath();ctx.moveTo(x-28,y+9);ctx.lineTo(x-19,y-2);ctx.lineTo(x+17,y-5);ctx.lineTo(x+28,y+5);ctx.lineTo(x+21,y+12);ctx.closePath();ctx.fill();ctx.fillStyle='#5ed8cd';ctx.fillRect(x-8,y-2,13,4);ctx.fillStyle='#ff698f';ctx.shadowColor='#ff6688';ctx.shadowBlur=8;ctx.fillRect(x-24,y+9,6,2);ctx.shadowBlur=0;ctx.strokeStyle='#7de4df20';ctx.beginPath();ctx.moveTo(x+4,y+11);ctx.lineTo(x+10,y+44);ctx.lineTo(x-2,y+76);ctx.stroke();ctx.globalAlpha=1}
function drawHolo(x,y){let pulse=.7+Math.sin(time*2.7)*.13;ctx.globalAlpha=pulse;ctx.shadowColor='#ff4cb4';ctx.shadowBlur=18;ctx.strokeStyle='#ff59bb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,24,7,0,0,TAU);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fe67be';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('VIVA BRIM',x,y-26);ctx.fillStyle='#b9c9d2';ctx.font='6px monospace';ctx.fillText('ÁGUA É DIREITO',x,y-15);ctx.textAlign='left';ctx.globalAlpha=1;for(let i=0;i<5;i++){ctx.fillStyle='#ff56b340';ctx.fillRect(x-17+i*8,y-10,1,16)}}
function drawWorld(){if(archiveEntered){drawArchiveInterior();return}ctx.save();ctx.translate(-camera.x,-camera.y);drawGround();buildings.forEach(drawBuilding);drawStreetProps();drawFlyingCar();drawHolo(1190,454);
 // security fence before archive; Carlos can open its gate
 ctx.fillStyle='#182328';ctx.fillRect(1262,390,5,196);ctx.fillRect(1262,390,48,5);ctx.fillRect(1262,581,48,5);for(let y=398;y<581;y+=14){ctx.fillStyle='#839291';ctx.fillRect(1263,y,4,2)}if(doorOpen){ctx.fillStyle='#56dfc2';ctx.shadowColor='#56dfc2';ctx.shadowBlur=10;ctx.fillRect(1262,465,5,26);ctx.shadowBlur=0}
 // rubble wall can be demolished, hidden dark passage behind
 if(!broken){ctx.fillStyle='#504638';ctx.fillRect(1215,305,47,45);for(let n=0;n<7;n++){ctx.fillStyle=n%2?'#736249':'#383634';ctx.fillRect(1217+(n%3)*15,307+Math.floor(n/3)*14,14,12)}}else{ctx.fillStyle='#0b1318';ctx.fillRect(1215,305,47,45);ctx.fillStyle='#6be4c2';ctx.shadowColor='#6be4c2';ctx.shadowBlur=15;ctx.fillRect(1215,304,47,2);ctx.shadowBlur=0}
 // floor inscriptions / flooded cars
 for(const [x,y] of [[350,595],[1480,587],[601,744]]){ctx.fillStyle='#252b2a';ctx.fillRect(x,y,78,32);ctx.fillStyle='#66736e';ctx.fillRect(x+6,y+5,64,5);ctx.fillStyle='#9b775e';ctx.fillRect(x+14,y+12,49,10);ctx.fillStyle='#16252a';ctx.fillRect(x+5,y+29,11,4);ctx.fillRect(x+59,y+29,11,4)}
 // guards / civilians
 drawNpc(472,477,'woman');if(!doorOpen)drawNpc(708,925,'guard');drawNpc(1024,483,'worker');
 enemies.forEach(drawEnemyMap);
 pickups.filter(p=>!p.taken).forEach(drawPickup);
 drawPlayer();drawParticles();ctx.restore()}
function drawNpc(x,y,type){ctx.save();ctx.translate(x-camera.x,y-camera.y);ctx.fillStyle='#0a1112a0';ctx.beginPath();ctx.ellipse(0,4,11,5,0,0,TAU);ctx.fill();if(type==='guard'){ctx.fillStyle='#354047';ctx.fillRect(-8,-19,16,20);ctx.fillStyle='#252a2d';ctx.fillRect(-9,-25,18,8);ctx.fillStyle='#dc5964';ctx.fillRect(-5,-28,11,4);ctx.fillStyle='#ffc56d';ctx.fillRect(8,-16,3,13)}else if(type==='worker'){ctx.fillStyle='#44635a';ctx.fillRect(-7,-17,14,17);ctx.fillStyle='#c09872';ctx.fillRect(-5,-25,10,9);ctx.fillStyle='#292729';ctx.fillRect(-7,-28,15,4)}else{ctx.fillStyle='#784a53';ctx.fillRect(-8,-18,16,18);ctx.fillStyle='#bd8767';ctx.fillRect(-5,-26,10,9);ctx.fillStyle='#31302c';ctx.fillRect(-6,-29,12,5);ctx.fillStyle='#e2b269';ctx.fillRect(7,-13,4,9)}ctx.restore()}
function drawPickup(p){let x=p.x-camera.x,y=p.y-camera.y+Math.sin(time*3+p.x)*3;ctx.fillStyle='#05090ba0';ctx.beginPath();ctx.ellipse(x,y+8,10,4,0,0,TAU);ctx.fill();ctx.shadowColor=p.color;ctx.shadowBlur=12;ctx.fillStyle=p.color;ctx.fillRect(x-4,y-5,8,8);ctx.fillStyle='#fff5';ctx.fillRect(x-2,y-4,2,2);ctx.shadowBlur=0;ctx.fillStyle=p.color;ctx.fillRect(x-1,y-12,2,3)}
function sprite(x,y,index,scale=1,walking=false,face=0){const c=characters[index],bob=walking?Math.sin(player.walk*11)*1.5:Math.sin(time*2+index)*.7,leg=walking?Math.sin(player.walk*11)*3:0;ctx.save();ctx.translate(x,y+bob);ctx.scale(scale,scale);ctx.fillStyle='#070a0bb5';ctx.beginPath();ctx.ellipse(0,2,12,5,0,0,TAU);ctx.fill();
 // legs / boots
 ctx.fillStyle='#22262b';ctx.fillRect(-6,-8+leg,5,9);ctx.fillRect(2,-8-leg,5,9);ctx.fillStyle='#13191c';ctx.fillRect(-7,-1+leg,7,3);ctx.fillRect(1,-1-leg,8,3);
 // torso, silhouette and fabric
 ctx.fillStyle=c.armor;ctx.fillRect(-9,-25,18,19);ctx.fillStyle=c.color;ctx.fillRect(-8,-24,3,14);ctx.fillStyle='#151a20';ctx.fillRect(-3,-21,8,8);ctx.fillStyle='#ffffff12';ctx.fillRect(-7,-25,13,2);
 if(index===0){ctx.fillStyle='#171d25';ctx.beginPath();ctx.moveTo(-10,-23);ctx.lineTo(-8,-34);ctx.lineTo(8,-34);ctx.lineTo(10,-21);ctx.fill();ctx.fillStyle='#bb6873';ctx.fillRect(-7,-35,14,9);ctx.fillStyle='#ffbac0';ctx.fillRect(-4,-31,7,2);ctx.fillStyle='#252b31';ctx.fillRect(7,-20,4,8);ctx.fillStyle='#b9b9b1';ctx.fillRect(7,-18,8,3)}
 if(index===1){ctx.fillStyle='#373d43';ctx.fillRect(-10,-24,4,14);ctx.fillStyle='#a1aca5';ctx.fillRect(-10,-20,3,7);ctx.fillStyle='#bb906f';ctx.fillRect(-6,-35,13,11);ctx.fillStyle='#253034';ctx.fillRect(-7,-37,14,4);ctx.fillStyle='#60e5d0';ctx.fillRect(4,-31,4,2);ctx.fillStyle='#398884';ctx.fillRect(-10,-27,20,2);ctx.fillStyle='#62e5d8';ctx.shadowColor='#52f0dd';ctx.shadowBlur=7;ctx.fillRect(-12,-22,2,2);ctx.shadowBlur=0}
 if(index===2){ctx.fillStyle='#202027';ctx.fillRect(-8,-39,16,10);ctx.fillStyle='#17191f';ctx.fillRect(-10,-37,4,15);ctx.fillRect(6,-38,4,16);ctx.fillStyle='#a46a52';ctx.fillRect(-6,-33,12,12);ctx.fillStyle='#e49a72';ctx.fillRect(-4,-30,8,5);ctx.fillStyle='#16171b';ctx.fillRect(4,-20,6,9);ctx.fillStyle='#ff65c2';ctx.shadowColor='#ff60c9';ctx.shadowBlur=10;ctx.fillRect(7,-22,6,16);ctx.fillStyle='#ffb2e0';ctx.fillRect(9,-20,2,11);ctx.shadowBlur=0}
 if(index===3){ctx.fillStyle='#171b1b';ctx.fillRect(-8,-36,16,8);ctx.fillStyle='#c38f68';ctx.fillRect(-6,-33,12,12);ctx.fillStyle='#222726';ctx.fillRect(5,-30,2,3);ctx.fillStyle='#252d26';ctx.fillRect(-10,-25,20,4);ctx.fillStyle='#d2bd85';ctx.fillRect(-5,-19,10,4);ctx.fillStyle='#7dbc83';ctx.fillRect(7,-24,5,7);ctx.fillStyle='#98dc91';ctx.fillRect(8,-23,3,3)}
 // arms, weapon/forearm
 ctx.fillStyle=c.armor;ctx.fillRect(-12,-24,4,13);ctx.fillRect(8,-24,4,13);ctx.fillStyle=index===2?'#ff62c2':c.color;ctx.fillRect(index===2?8:-12,-15,4,6);ctx.fillStyle='#20262b';ctx.fillRect(-6,-7,4,4);ctx.fillRect(3,-7,4,4);
 // facing glint
 if(face===1){ctx.fillStyle='#f8e9c2';ctx.fillRect(4,-32,2,2)}if(face===3){ctx.fillStyle='#f8e9c2';ctx.fillRect(-6,-32,2,2)}ctx.restore()}
function drawPlayer(){const x=player.x-camera.x,y=player.y-camera.y;for(let i=3;i>=0;i--){if(i===activeChar)continue;const a=player.walk?Math.sin(player.walk*11+i)*1.5:0;sprite(x-22+(i%2)*14,y+16+Math.floor(i/2)*15+a,i,.65,!!player.step,player.dir)}sprite(x,y,activeChar,1,!!player.step,player.dir);if(player.step){ctx.strokeStyle=characters[activeChar].color+'66';ctx.beginPath();ctx.ellipse(x,y+3,17,7,0,0,TAU);ctx.stroke()}}
function drawEnemyMap(e){if(e.dead)return;const x=e.x-camera.x,y=e.y-camera.y;ctx.save();ctx.translate(x,y);ctx.fillStyle='#090c0e99';ctx.beginPath();ctx.ellipse(0,3,13,5,0,0,TAU);ctx.fill();ctx.fillStyle=e.type==='drone'?'#39404a':'#5c3942';ctx.fillRect(-8,-20,16,20);ctx.fillStyle='#24262b';ctx.fillRect(-9,-27,18,9);ctx.fillStyle='#ff526b';ctx.shadowColor='#ff526b';ctx.shadowBlur=9;ctx.fillRect(-5,-24,10,2);ctx.shadowBlur=0;ctx.fillStyle='#a8a79a';ctx.fillRect(8,-16,3,11);ctx.fillStyle='#f09470';ctx.fillRect(-5,-18,4,2);ctx.restore()}
function drawParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-camera.x,p.y-camera.y,p.size,p.size)}ctx.globalAlpha=1}
function startEnemies(){enemies.push({x:820,y:947,hp:58,max:58,name:'MILICIANO DA CODESP',type:'guard',dead:false},{x:910,y:950,hp:44,max:44,name:'DRONE DE VIGILÂNCIA',type:'drone',dead:false});}
function blocked(x,y){if(x<65||x>1735||y<62||y>1125)return true;for(const b of walls){let pad=12;if(x>b.x-pad&&x<b.x+b.w+pad&&y>b.y-pad&&y<b.y+b.h+pad)return true}if(!doorOpen&&x>1250&&x<1278&&y>397&&y<578)return true;if(!broken&&x>1210&&x<1265&&y>300&&y<352)return true;return false}
function move(dt){if(mode!=='explore'||currentDialogue||!$('#helpPanel').classList.contains('hidden'))return;let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(dx||dy){let l=Math.hypot(dx,dy);dx/=l;dy/=l;player.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);let run=keys.shift?1.62:1;let speed=player.speed*run;let nx=player.x+dx*speed*dt,ny=player.y+dy*speed*dt;if(!(archiveEntered?blockedRoom(nx,player.y):blocked(nx,player.y)))player.x=nx;if(!(archiveEntered?blockedRoom(player.x,ny):blocked(player.x,ny)))player.y=ny;player.walk+=dt*run;player.step=1}else player.step=0;
 camera.x=archiveEntered?0:clamp(player.x-W/2,0,1800-W);camera.y=archiveEntered?0:clamp(player.y-H/2,0,1200-H);
 if(archiveEntered){if(player.x<43)player.x=43;if(player.x>917)player.x=917;if(player.y<75)player.y=75;if(player.y>572)player.y=572;return}
 for(const e of enemies){if(e.dead)continue;let d=dist(e,player);if(d<215&&d>38){e.x+=(player.x-e.x)/d*28*dt;e.y+=(player.y-e.y)/d*28*dt}if(d<55){startBattle(false);break}}
 // automatic ground collection only when you physically walk over the object
 for(const p of pickups){if(!p.taken&&dist(player,p)<18){p.taken=true;inventory[p.type]+=p.amount;addParticle(p.x,p.y,p.color,12);toast(`${p.name.toUpperCase()} · RECOLHIDO`);if(p.type==='fragmentos'&&!secretFound){secretFound=true;setObjective('Entre no arquivo municipal — a memória revela outra rota')}}}
}
function nearestObject(){if(archiveEntered){for(const o of [{x:476,y:258,r:65,type:'record',name:'Registro de remoções'},{x:480,y:556,r:55,type:'exit',name:'Saída para a várzea'}])if(dist(player,o)<o.r)return o;return null}let best=null,dd=Infinity;for(const o of objects){let d=dist(player,o);if(d<o.r&&d<dd){best=o;dd=d}}return best}
function interact(){if(currentDialogue){closeDialogue();return}if(mode==='battle')return;if(!$('#helpPanel').classList.contains('hidden'))return;let o=nearestObject();if(!o){if(archiveEntered){toast('EXAMINE O TERMINAL OU VOLTE À RUA');return}let p=pickups.find(p=>!p.taken&&dist(player,p)<45);if(p){toast(`${p.name.toUpperCase()} · CHEGUE MAIS PERTO`);return}toast('NADA AO ALCANCE · APROXIME-SE DO OBJETO');return}
 if(o.type==='record'){setObjective('Registro recuperado · encontre Dona Iara');dialogue('ARQUIVO MUNICIPAL · 3027','REGISTRO DE REMOÇÕES — CICLO 19. A prefeitura transferiu 11.402 famílias para zonas alagáveis enquanto vendia as cotas de terreno seco à CODESP. No rodapé, uma assinatura: “Operação BRIM LIMPA”. O arquivo preserva uma cópia local.');storyStep=3;toast('ARQUIVO RECUPERADO · PROVA SALVA');return}if(o.type==='exit'){setZone('BAIXADA · SETOR 09');archiveEntered=false;player.x=1334;player.y=540;camera.x=374;camera.y=240;toast('DE VOLTA À VÁRZEA DO IPIRANGA');return}if(o.type==='person'&&o.name==='Dona Iara'){if(storyStep===0){dialogue('DONA IARA · MORADORA DA VÁRZEA','A água levou meu bairro duas vezes. A prefeitura levou os nomes do arquivo. O portão no alto? Só abre com credencial da CODESP. Fica com a cooperativa — mas tem guarda.');storyStep=1;setObjective('Hackeie o terminal da CODESP e abra o acesso')}else dialogue('DONA IARA','Se achar o registro de desapropriações, não deixa a torre apagar de novo.');return}
 if(o.type==='terminal'){if(activeChar!==1){toast('SÓ CARLOS CONSEGUE INVADIR SISTEMAS');return}if(!doorOpen){doorOpen=true;addParticle(o.x,o.y,'#62eddb',20);toast('FIREWALL QUEBRADO · PORTÃO DA CODESP ABERTO');setObjective('Encontre a entrada do arquivo municipal');dialogue('CARLOS SANT’ANNA','Câmeras em loop. Cadeado na mão. Não vou tocar em ninguém — só no que pertence ao sistema.');}else toast('TERMINAL INVADIDO · CÂMERAS EM LOOP');return}
 if(o.type==='door'){if(!doorOpen){toast('PORTA TRANCADA · CARLOS PODE INVADIR O TERMINAL');return}if(!archiveEntered){archiveEntered=true;setZone('ARQUIVO MUNICIPAL · SUBSOLO');setObjective('Examine o registro de desapropriações');player.x=1372;player.y=506;toast('ARQUIVO MUNICIPAL · SUBSOLO · MODO DE EXPLORAÇÃO');}else{setZone('BAIXADA · SETOR 09');archiveEntered=false;player.x=1334;player.y=540;toast('DE VOLTA À VÁRZEA DO IPIRANGA')}}
 if(o.type==='wall'){if(!broken){if(activeChar!==0&&activeChar!==2){toast('MORGAN OU GABRIELA PODEM ROMPER A PAREDE');return}broken=true;walls.push({x:1215,y:305,w:0,h:0,name:'arquivo rachado'});addParticle(o.x,o.y,'#ffb96a',30);toast(activeChar===0?'CARGA DETONADA · PASSAGEM REVELADA':'PAREDE DESTRUÍDA · PASSAGEM REVELADA');setObjective('Explore a passagem escondida');}else if(!secretFound){toast('PASSAGEM ABERTA · SIGA O BRILHO NO CHÃO');player.x=1268;player.y=330;setObjective('Entre no arquivo municipal — a memória revela outra rota')}else toast('PASSAGEM SECRETA · RESTOS DA CIDADE ANTIGA');return}
 if(o.type==='person'&&o.name==='Vigia da maré'){startBattle(activeChar===0);return}}
function switchCharacter(){if(mode!=='explore')return;activeChar=(activeChar+1)%characters.length;toast(`PERSONAGEM ATIVO · ${characters[activeChar].full}`);updatePartyUI()}
function blockedRoom(x,y){return x<34||x>926||y<62||y>582||(x>235&&x<285&&y>95&&y<478)||(x>670&&x<719&&y>95&&y<478)||(x>288&&x<665&&y>173&&y<211)}
function drawArchiveInterior(){ctx.save();ctx.fillStyle='#192124';ctx.fillRect(0,0,W,H);for(let y=0;y<600;y+=40)for(let x=0;x<960;x+=48){ctx.fillStyle=seeded(x,y)>.5?'#20292b':'#1c2427';ctx.fillRect(x+1,y+1,46,38);ctx.fillStyle='#ffffff08';ctx.fillRect(x+3,y+3,42,1)}
 // concrete bulkheads, corroded seams and waterline
 const g=ctx.createLinearGradient(0,0,0,170);g.addColorStop(0,'#2d3537');g.addColorStop(1,'#222b2e');ctx.fillStyle=g;ctx.fillRect(0,0,960,90);ctx.fillStyle='#424644';ctx.fillRect(0,88,960,7);ctx.fillStyle='#6c6555';ctx.fillRect(0,93,960,2);ctx.fillStyle='#152e34';ctx.fillRect(0,534,960,66);for(let i=0;i<24;i++){let x=i*41+Math.sin(time+i)*3;ctx.fillStyle='#34545a';ctx.fillRect(x,550+Math.sin(time*1.1+i)*4,19,1)}
 // ribbed archive storage walls
 for(const x of [70,735]){ctx.fillStyle='#313b3d';ctx.fillRect(x,92,155,395);ctx.fillStyle='#47504e';ctx.fillRect(x,92,155,8);for(let y=106;y<472;y+=58){ctx.fillStyle='#192225';ctx.fillRect(x+6,y,143,45);for(let j=0;j<8;j++){let col=['#846956','#72806a','#8a6455','#68777a','#9a7958'][j%5];ctx.fillStyle=col;ctx.fillRect(x+11+j*16,y+4,11,34);ctx.fillStyle='#ffffff18';ctx.fillRect(x+12+j*16,y+6,2,28);ctx.fillStyle='#d3bb89';ctx.fillRect(x+11+j*16,y+37,11,2)}}}
 // central submerged records & desk
 ctx.fillStyle='#131b1c';ctx.fillRect(342,279,280,130);ctx.fillStyle='#424643';ctx.fillRect(348,274,268,13);ctx.fillStyle='#292f30';ctx.fillRect(372,292,220,97);for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#9b7955':'#68766c';ctx.fillRect(382+i*19,303,13,70);ctx.fillStyle='#dfbd82';ctx.fillRect(384+i*19,311,9,2)}
 // archive terminal, cyan light and projected municipal file
 ctx.fillStyle='#343d3c';ctx.fillRect(397,222,140,51);ctx.fillStyle='#11191d';ctx.fillRect(408,229,118,36);ctx.fillStyle='#4ce0d1';ctx.shadowColor='#36ddcd';ctx.shadowBlur=15;ctx.fillRect(415,234,103,2);ctx.fillRect(419,241,65,2);ctx.fillRect(419,247,90,2);ctx.fillRect(419,253,47,2);ctx.shadowBlur=0;
 ctx.fillStyle='#59665a';ctx.fillRect(461,274,14,9);ctx.fillStyle='#262e2e';ctx.fillRect(448,282,41,4);
 // leaking overhead pipes and fluorescent strips
 ctx.fillStyle='#11191a';ctx.fillRect(0,112,960,8);ctx.fillStyle='#505753';ctx.fillRect(0,109,960,3);for(let x=22;x<950;x+=129){ctx.fillStyle='#3d4644';ctx.fillRect(x,103,10,14);ctx.fillStyle='#62d8c8';ctx.shadowColor='#58d8ca';ctx.shadowBlur=14;ctx.fillRect(x+20,128,40,2);ctx.shadowBlur=0}for(let x of [305,655]){ctx.strokeStyle='#343c3d';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,58);ctx.lineTo(x+40,58);ctx.stroke();ctx.fillStyle='#68b4a1';ctx.fillRect(x+36,54,4,8);ctx.fillStyle='#6ee2c1';ctx.shadowColor='#6ee2c1';ctx.shadowBlur=8;ctx.fillRect(x+35,63,2,3);ctx.shadowBlur=0}
 // faded warning and old map hologram
 ctx.fillStyle='#d26470';ctx.font='bold 8px monospace';ctx.fillText('PREFEITURA DE BRIM · DOCUMENTOS CONFIDENCIAIS',302,151);ctx.fillStyle='#717d7a';ctx.font='7px monospace';ctx.fillText('SETOR 9 / REMOÇÕES / CICLO 19',393,170);ctx.strokeStyle='#4e8f84';ctx.globalAlpha=.5;ctx.strokeRect(379,181,187,27);ctx.globalAlpha=1;
 // player and pickups / particles in the room
 for(const p of pickups.filter(p=>!p.taken&&p.x<960&&p.y<600))drawPickup(p);drawPlayer();drawParticles();ctx.restore()}
function visiblePrompt(){if(mode!=='explore'||currentDialogue||!$('#helpPanel').classList.contains('hidden'))return;const o=nearestObject();if(!o)return;ctx.save();let x=o.x-camera.x,y=o.y-camera.y-36;if(archiveEntered){x=o.type==='record'?476:480;y=o.type==='record'?210:510}ctx.fillStyle='#0a1116dd';ctx.fillRect(x-35,y-12,70,17);ctx.strokeStyle='#5be3c2';ctx.strokeRect(x-35,y-12,70,17);ctx.fillStyle='#d9eee6';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('E  INTERAGIR',x,y);ctx.textAlign='left';ctx.restore()}
function updatePartyUI(){const strip=$('#partyStrip'),roster=$('#roster');strip.innerHTML=characters.map((c,i)=>`<button class="party-chip ${i===activeChar?'active':''}" data-char="${i}" title="${c.full} · Q para selecionar"><span class="mini-portrait" style="--accent:${c.color}">${c.name[0]}</span><span class="party-meta"><strong>${c.name}</strong><span class="hp-line"><i style="width:${100*c.hp/c.max}%;background:${c.color}"></i></span><small>${Math.max(0,c.hp)} HP · ${c.mp} EN</small></span></button>`).join('');roster.innerHTML=characters.map((c,i)=>`<article class="roster-card ${i===activeChar?'selected':''}" data-char="${i}"><div class="roster-portrait" style="--accent:${c.color}">${c.name[0]}</div><div class="roster-info"><h3>${c.full}</h3><span class="char-role">${c.role}</span><div class="health-label">HP ${c.hp}/${c.max} · EN ${c.mp}/${c.maxMp}</div><div class="hp-line"><i style="width:${100*c.hp/c.max}%;background:${c.color}"></i></div><p class="char-quote">${c.quote}</p></div></article>`).join('');strip.querySelectorAll('[data-char]').forEach(el=>el.onclick=()=>{activeChar=Number(el.dataset.char);updatePartyUI()});roster.querySelectorAll('[data-char]').forEach(el=>el.onclick=()=>{activeChar=Number(el.dataset.char);updatePartyUI()})}
function startBattle(ambush=false){if(mode==='battle')return;if(!enemies.length||enemies.every(e=>e.dead))startEnemies();mode='battle';preemptive=ambush;round=1;partyTurn=0;selectedEnemy=Math.max(0,enemies.findIndex(e=>!e.dead));combatLog=[ambush?'Morgan arma uma emboscada. A equipe age primeiro!':'A milícia da CODESP fecha o cerco.'];$('#battle').classList.remove('hidden');$('#battle').setAttribute('aria-hidden','false');renderBattle();toast('COMBATE INICIADO · EQUIPE COMPLETA EM CAMPO')}
const abilities=[
 [{name:'Rajada',cost:0,desc:'Disparo preciso',kind:'attack',power:24},{name:'Carga',cost:16,desc:'Dano em área',kind:'blast',power:25}],
 [{name:'Pulso EMP',cost:18,desc:'Atordoa o alvo',kind:'hack',power:16},{name:'Sobrecarga',cost:25,desc:'Dano em área',kind:'blast',power:27}],
 [{name:'Cruzado',cost:0,desc:'Golpe pesado',kind:'attack',power:31},{name:'Gancho',cost:12,desc:'Golpe devastador',kind:'attack',power:43}],
 [{name:'Bio-gel',cost:20,desc:'Recupera 42 HP',kind:'heal',power:42},{name:'Corrosivo',cost:24,desc:'Dano contínuo',kind:'acid',power:21}]
];
function aliveEnemies(){return enemies.filter(e=>!e.dead)}function battleLog(text){combatLog.unshift(text);combatLog=combatLog.slice(0,5)}
function renderBattle(){if(mode!=='battle')return;$('#battleRound').textContent=`ROUND ${String(round).padStart(2,'0')}`;const c=characters[partyTurn];$('#turnName').textContent=c?c.name:'EQUIPE';$('#turnSub').textContent=c?`VEZ DE ${c.role}`:'AÇÃO';const stage=$('#enemyStage');stage.innerHTML=enemies.map((e,i)=>`<button class="battle-enemy ${e.dead?'defeated':''} ${i===selectedEnemy?'targeted':''}" data-enemy="${i}" ${e.dead?'disabled':''}><span class="enemy-art ${e.type}"><i></i><b></b><em></em></span><strong class="enemy-name">${e.name}</strong><span class="enemy-hp"><i style="width:${Math.max(0,e.hp)/e.max*100}%"></i></span><small>${e.dead?'NEUTRALIZADO':`${Math.max(0,e.hp)} / ${e.max} HP`}</small>${e.stun?'⚡ ATORDOADO':''}</button>`).join('');stage.querySelectorAll('[data-enemy]').forEach(el=>el.onclick=()=>{selectedEnemy=Number(el.dataset.enemy);renderBattle()});const actions=$('#battleActions');if(c){const opts=abilities[partyTurn];actions.innerHTML=opts.map((a,i)=>`<button data-action="${i}" ${c.mp<a.cost||c.hp<=0?'disabled':''}>${a.name}<span>${a.cost?`${a.cost} EN · `:''}${a.desc}</span></button>`).join('')+`<button data-action="2" ${c.hp<=0?'disabled':''}>${partyTurn===3?'Antídoto':'Defender'}<span>${partyTurn===3?'Revive aliado':'Reduz dano recebido'}</span></button>`;actions.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>playerAction(Number(el.dataset.action)))}else actions.innerHTML='<button disabled>A equipe está fora de combate</button>';$('#battleLog').innerHTML=combatLog.map(x=>`<div>${x}</div>`).join('');updatePartyUI()}
 function finishBattle(victory){mode='explore';$('#battle').classList.add('hidden');$('#battle').setAttribute('aria-hidden','true');keys={};if(victory){battleLog('A equipe manteve a várzea de pé.');setObjective('Entre no arquivo municipal e recupere o registro');setZone('BAIXADA · SETOR 09');toast('AMEAÇA CONTIDA · EQUIPE UNIDA');storyStep=Math.max(storyStep,2)}else{for(const c of characters)if(c.hp<=0)c.hp=Math.max(1,Math.round(c.max*.35));enemies.length=0;toast('EQUIPE RECUOU · BIO-GEL DE EMERGÊNCIA APLICADO');}updatePartyUI()}
 function checkBattleEnd(){for(const e of enemies)if(e.hp<=0&&!e.dead){e.hp=0;e.dead=true;addParticle(e.x,e.y,'#ff7385',12);battleLog(`${e.name} neutralizado.`)}if(!aliveEnemies().length){finishBattle(true);return true}if(!characters.some(c=>c.hp>0)){finishBattle(false);return true}return false}
 function nextPartyTurn(){if(checkBattleEnd())return;let next=partyTurn+1;while(next<characters.length&&characters[next].hp<=0)next++;if(next<characters.length){partyTurn=next;renderBattle();return}partyTurn=-1;enemyTimer=.65;$('#turnName').textContent='AMEAÇAS';$('#turnSub').textContent='FASE INIMIGA';$('#battleActions').innerHTML='<button disabled>Aguarde a resposta inimiga…</button>';renderBattle()}
 function playerAction(index){if(mode!=='battle'||partyTurn<0)return;const c=characters[partyTurn],opts=abilities[partyTurn],targets=aliveEnemies();if(!c||c.hp<=0)return;if(index<2){const a=opts[index];if(!a||c.mp<a.cost){toast('ENERGIA INSUFICIENTE');return}if(!targets.length)return;c.mp-=a.cost;if(a.kind==='heal'){let ally=characters.filter(x=>x.hp>0).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];if(ally){ally.hp=Math.min(ally.max,ally.hp+a.power);battleLog(`${c.name} recupera ${a.power} HP de ${ally.name}.`);addParticle(player.x,player.y,'#8effa6',10)}}else if(a.kind==='blast'){for(const e of targets){e.hp-=a.power;addParticle(e.x,e.y,c.color,8)}battleLog(`${c.name} usa ${a.name}: ${a.power} de dano em área.`)}else{let e=enemies[selectedEnemy];if(!e||e.dead)e=targets[0];e.hp-=a.power;if(a.kind==='hack'){e.stun=1;battleLog(`${c.name} atordoa ${e.name} com um pulso EMP.`)}else if(a.kind==='acid'){e.corrosion=2;battleLog(`${c.name} aplica corrosivo em ${e.name}.`)}else battleLog(`${c.name} usa ${a.name} em ${e.name} (${a.power} dano).`);addParticle(e.x,e.y,c.color,10)}}else if(partyTurn===3){const ally=characters.filter(x=>x.hp<=0).sort((a,b)=>a.max-b.max)[0];if(ally){ally.hp=Math.ceil(ally.max*.3);battleLog(`${c.name} reanima ${ally.name} com antídoto.`);addParticle(player.x,player.y,'#a5ff9b',15)}else{const ally2=characters.filter(x=>x.hp>0).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];ally2.hp=Math.min(ally2.max,ally2.hp+24);battleLog(`${c.name} estabiliza ${ally2.name} (+24 HP).`)}}else{c.guarding=true;battleLog(`${c.name} assume posição defensiva.`)}if(checkBattleEnd())return;const dead=characters.filter(x=>x.hp<=0).length;if(dead===characters.length){checkBattleEnd();return}nextPartyTurn()}
 function enemyPhase(){if(mode!=='battle')return;if(checkBattleEnd())return;round++;for(const e of aliveEnemies()){if(e.corrosion){e.hp-=8;e.corrosion--;battleLog(`Corrosão causa 8 de dano em ${e.name}.`);if(e.hp<=0)continue}if(e.stun){e.stun--;battleLog(`${e.name} perde a ação, atordoado.`);continue}const living=characters.filter(c=>c.hp>0);if(!living.length)break;const target=living[Math.floor(Math.random()*living.length)],base=e.type==='drone'?13:18,damage=target.guarding?Math.ceil(base*.4):base;target.guarding=false;target.hp=Math.max(0,target.hp-damage);battleLog(`${e.name} ataca ${target.name} (${damage} dano).`);addParticle(target===characters[activeChar]?player.x:player.x+rand(-20,20),player.y,'#ff6879',6)}for(const c of characters)c.guarding=false;if(checkBattleEnd())return;partyTurn=0;while(partyTurn<characters.length&&characters[partyTurn].hp<=0)partyTurn++;selectedEnemy=Math.max(0,enemies.findIndex(e=>!e.dead));renderBattle()}
 function update(dt){time+=dt;frame++;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('show')}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}if(mode==='explore')move(dt);else if(mode==='battle'&&enemyTimer>0){enemyTimer-=dt;if(enemyTimer<=0)enemyPhase()}}
 function render(){ctx.clearRect(0,0,W,H);drawWorld();visiblePrompt()}
 function loop(now){const dt=Math.min(.05,Math.max(0,(now-t0)/1000));t0=now;update(dt);render();requestAnimationFrame(loop)}
 function toggleHelp(force){const panel=$('#helpPanel'),open=force===undefined?panel.classList.contains('hidden'):force;panel.classList.toggle('hidden',!open);if(open)keys={}}
 window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(e.repeat)return;if(currentDialogue&&(key===' '||key==='enter'||key==='e')){closeDialogue();return}if(key==='escape'||key==='m'){toggleHelp();return}if(!$('#helpPanel').classList.contains('hidden')){if(key==='enter')toggleHelp(false);return}if(mode==='battle'){if(key===' '||key==='enter')playerAction(0);else if(key==='e')playerAction(1);return}if(key==='e'){interact();return}if(key==='q'){switchCharacter();return}if(key==='r'){if(activeChar===0)startBattle(true);else toast('MORGAN PRECISA ESTAR ATIVA PARA ARMAR A EMBOSCADA');return}keys[key]=true});window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});window.addEventListener('blur',()=>keys={});
 $('#dialogueContinue').addEventListener('click',closeDialogue);$('#helpBtn').addEventListener('click',()=>toggleHelp());$('#closeHelp').addEventListener('click',()=>toggleHelp(false));$('#resumeBtn').addEventListener('click',()=>toggleHelp(false));$('#soundBtn').addEventListener('click',e=>{const on=e.currentTarget.dataset.on!=='true';e.currentTarget.dataset.on=String(on);e.currentTarget.textContent=on?'♫':'♪';toast(on?'SINAL SONORO ATIVADO':'SINAL SONORO DESATIVADO')});
 document.querySelectorAll('.dpad [data-move]').forEach(button=>{const k={up:'w',down:'s',left:'a',right:'d'}[button.dataset.move];button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys[k]=true});const stop=()=>keys[k]=false;button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop)});
 document.querySelector('[data-action="interact"]').addEventListener('click',interact);const runButton=document.querySelector('[data-action="run"]');runButton.addEventListener('pointerdown',()=>keys.shift=true);['pointerup','pointercancel','lostpointercapture'].forEach(type=>runButton.addEventListener(type,()=>keys.shift=false));
 updatePartyUI();$('#battle').setAttribute('aria-hidden','true');setZone(zone);requestAnimationFrame(loop);
})();
