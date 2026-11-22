const $=id=>document.getElementById(id);const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const SYL=['MA','ME','MI','MO','MU','PA','PE','PI','PO','PU','TA','TE','TI','TO','TU','LA','LE','LI','LO','LU','SA','SE','SI','SO','SU','KA','KE','KI','KO','KU','BA','BE','BI','BO','BU','DA','DE','DI','DO','DU','RA','RE','RI','RO','RU','NA','NE','NI','NO','NU','WA','WE','WI','WO','WU','ZA','ZE','ZI','ZO','ZU'];
const ITEMS=[['MAMA',['MA','MA'],'👩'],['TATA',['TA','TA'],'👨'],['LALA',['LA','LA'],'🪆'],['WODA',['WO','DA'],'💧'],['RYBA',['RY','BA'],'🐟'],['SOWA',['SO','WA'],'🦉'],['MAPA',['MA','PA'],'🗺️'],['RAMA',['RA','MA'],'🖼️'],['KAWA',['KA','WA'],'☕'],['KURA',['KU','RA'],'🐔'],['KOZA',['KO','ZA'],'🐐'],['NOGA',['NO','GA'],'🦵'],['RĘKA',['RĘ','KA'],'✋'],['BUDA',['BU','DA'],'🏠'],['TAMA',['TA','MA'],'🌊'],['LATO',['LA','TO'],'☀️'],['ZIMA',['ZI','MA'],'❄️'],['MOTYL',['MO','TYL'],'🦋'],['KOTEK',['KO','TEK'],'🐱'],['DOMEK',['DO','MEK'],'🏡'],['PIŁKA',['PIŁ','KA'],'⚽'],['AUTO',['AU','TO'],'🚗'],['ROWER',['RO','WER'],'🚲'],['KOTEK',['KO','TEK'],'🐈']];
const WORDS=[['KOT','🐱'],['DOM','🏠'],['LAS','🌲'],['PIŁKA','⚽'],['AUTO','🚗'],['RYBA','🐟'],['SOWA','🦉'],['MAPA','🗺️'],['RAK','🦞'],['ROWER','🚲'],['BUT','👟'],['NOS','👃'],['OKO','👁️'],['POMIDOR','🍅'],['KURA','🐔'],['KOZA','🐐'],['MOTYL','🦋'],['WODA','💧']];
let mode='syllable',round=0,goals=0,deck=[],task=null,busy=false,muted=false,clips={},last={},token=0,audio=new Audio(),ctx=null;
const missedRounds=new Set();audio.preload='auto';
fetch('commentator_timings.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{for(const c of Object.values(j)){(clips[c.event]??=[]).push(c)}}).catch(()=>{});
function stop(){
  token++;
  audio.pause();
  audio.ontimeupdate=audio.onloadedmetadata=audio.onended=audio.onerror=null;
  window.speechSynthesis?.cancel();
}
function say(event, afterClip){
  stop();
  const pool=clips[event]||[];
  if(muted||!pool.length){afterClip?.();return}
  const choices=pool.filter(c=>c!==last[event]);
  const clip=shuffle(choices.length?choices:pool)[0];
  last[event]=clip;
  const playbackToken=token;

  function finish(){
    if(playbackToken!==token)return;
    stop();
    afterClip?.();
  }
  function play(){
    if(playbackToken!==token)return;
    try{
      audio.currentTime=clip.start;
      audio.ontimeupdate=()=>{if(audio.currentTime>=clip.end)finish()};
      audio.play().catch(finish);
    }catch{finish()}
  }

  audio.onended=audio.onerror=finish;
  if(!audio.src.endsWith('/'+clip.file)){
    audio.onloadedmetadata=play;
    audio.src=clip.file;
  }else if(audio.readyState>=1)play();
  else audio.onloadedmetadata=play;
}
function fx(kind){if(muted)return;try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type='triangle';o.frequency.setValueAtTime(kind==='goal'?650:160,t);o.frequency.exponentialRampToValueAtTime(kind==='goal'?1100:50,t+.2);g.gain.setValueAtTime(.09,t);g.gain.exponentialRampToValueAtTime(.001,t+.27);o.connect(g);g.connect(ctx.destination);o.start();o.stop(t+.28)}catch(e){}}
$('sound').onclick=()=>{
  muted=!muted;
  const button=$('sound');
  button.setAttribute('aria-pressed',String(!muted));
  button.querySelector('use').setAttribute('href',muted?'#icon-mute':'#icon-sound');
  button.querySelector('span').textContent=muted?'Wył.':'Wł.';
  if(muted)stop();
};

const screens=['welcome','menu','game','summary'].map($);

function showScreen(id){
  for(const screen of screens)screen.hidden=screen.id!==id;
  window.scrollTo(0,0);
}

function openMenu(){
  stop();
  clearScene();
  showScreen('menu');
  $('training-title').focus({preventScroll:true});
}

$('start').onclick=openMenu;
$('back').onclick=openMenu;
$('summary-back').onclick=openMenu;
$('home').onclick=()=>{
  stop();
  clearScene();
  showScreen('welcome');
  $('start').focus({preventScroll:true});
};
$('replay').onclick=start;
for(const button of document.querySelectorAll('[data-mode]')){
  button.onclick=()=>{
    mode=button.dataset.mode;
    start();
  };
}

function makeDeck(){if(mode==='syllable')return shuffle(SYL).slice(0,10).map(x=>({kind:mode,target:x}));if(mode==='word')return shuffle(WORDS).slice(0,10).map(x=>({kind:mode,target:x[0],icon:x[1]}));return shuffle(ITEMS.filter((x,i,a)=>a.findIndex(y=>y[0]===x[0])===i)).slice(0,10).map(x=>({kind:mode,target:x[0],parts:x[1],icon:x[2]}))}
const field=$('field'), player=$('player'), keeper=$('keeper'), ball=$('ball');
let sceneVersion=0, shotTarget=null, retryTimer;

// Toe of the extended boot in the original 1197 × 1314 player.png.
const boot={x:846/1197,y:1164/1314};

// Coordinates measured on stadium.webp, before background-size: cover crops the sides.
const stadium={
  width:838,height:345,
  keeper:{x:421,y:263,height:70},
  leftGoal:{x:351,y:220},
  rightGoal:{x:492,y:220},
  miss:{x:317,y:231}
};

function positionScene(){
  const width=field.clientWidth, height=field.clientHeight;
  if(!width||!height)return;
  const scale=Math.max(width/stadium.width,height/stadium.height);
  const left=(width-stadium.width*scale)/2;
  const top=(height-stadium.height*scale)/2;
  const x=coordinate=>left+coordinate*scale;
  const y=coordinate=>top+coordinate*scale;
  const setPixels=(name,value)=>field.style.setProperty(name,value+'px');

  setPixels('--keeper-x',x(stadium.keeper.x));
  setPixels('--keeper-y',y(stadium.keeper.y));
  setPixels('--keeper-height',stadium.keeper.height*scale);

  const ballRadius=ball.offsetWidth/2;
  // Put the ball against the outside edge of the toe.
  setPixels('--foot-x',player.offsetLeft+player.offsetWidth*boot.x+ballRadius*.9);
  setPixels('--foot-y',player.offsetTop+player.offsetHeight*boot.y+ballRadius*.15);

  if(shotTarget){
    const direction=Math.sign(shotTarget.x-stadium.keeper.x);
    setPixels('--shot-x',x(shotTarget.x));
    setPixels('--shot-y',y(shotTarget.y));
    setPixels('--shot-rise',16*scale);
    setPixels('--dive-distance',17*scale*direction);
    field.style.setProperty('--dive-angle',28*direction+'deg');
  }
}

new ResizeObserver(positionScene).observe(field);
player.addEventListener('load',positionScene);

function start(){
  round=goals=0;
  missedRounds.clear();
  deck=makeDeck();
  showScreen('game');
  render(false);
  say('welcome',announceTask);
}

function clearScene(){
  sceneVersion++;
  clearTimeout(retryTimer);
  shotTarget=null;
  for(const animation of ball.getAnimations())animation.cancel();
  for(const animation of player.getAnimations())animation.cancel();
  player.classList.remove('celebrate');
  keeper.classList.remove('dive');
  field.classList.remove('scored');
  $('message').classList.remove('show');
  field.querySelectorAll('.confetti').forEach(p=>p.remove());
  positionScene();
}
function scoreboard(){
  $('round').textContent=`ZADANIE ${Math.min(round+1,10)} / 10`;
  $('score').textContent=`GOLE ${goals}`;
  $('bar').style.width=round*10+'%';
  $('progress').setAttribute('aria-valuenow',String(round));
}

function render(announce=true){
  busy=false;
  clearScene();
  scoreboard();
  $('next').hidden=true;
  $('repeat').hidden=true;
  $('answers').replaceChildren();
  $('status').textContent='';
  task=deck[round];

  let options, answer;
  if(mode==='syllable'){
    answer=task.target;
    options=[answer,...shuffle(SYL.filter(x=>x!==answer)).slice(0,2)];
    $('instruction').textContent='Posłuchaj sylaby i wybierz ją';
    $('prompt').innerHTML='<svg class="ui-icon" aria-hidden="true"><use href="#icon-sound"/></svg> ?';
    $('repeat').hidden=false;
  }else if(mode==='join' || mode==='missing'){
    const joining=mode==='join';
    const missing=joining?1:(Math.random()<.5?0:1);
    if(!joining)task.missing=missing;
    answer=task.parts[missing];
    const syllables=[...new Set([...SYL,...ITEMS.flatMap(x=>x[1])])];
    options=[answer,...shuffle(syllables.filter(x=>x!==answer&&x.length===answer.length)).slice(0,2)];
    $('instruction').textContent=joining?'Wybierz drugą sylabę, aby powstało słowo':'Uzupełnij brakującą sylabę';
    $('prompt').textContent=joining?task.parts[0]+' + ? = …':task.parts.map((x,i)=>i===missing?'__':x).join(' + ')+'   '+task.icon;
  }else{
    answer=task.target;
    options=[task,...shuffle(WORDS.filter(x=>x[0]!==answer)).slice(0,2).map(([target,icon])=>({target,icon}))];
    $('instruction').textContent='Przeczytaj słowo i wskaż obrazek';
    $('prompt').textContent=answer;
  }

  for(const option of shuffle(options)){
    const button=document.createElement('button');
    const value=mode==='word'?option.target:option;
    button.type='button';
    button.textContent=mode==='word'?option.icon:value;
    button.setAttribute('aria-label',mode==='word'?value:'Sylaba '+value);
    button.onclick=()=>choose(value===answer,button);
    $('answers').append(button);
  }
  if(announce)announceTask();
}

function finishMatch(){
  clearScene();
  scoreboard();
  const firstTryGoals=goals-missedRounds.size;
  const earned=firstTryGoals>=9?3:firstTryGoals>=5?2:1;
  $('final-score').textContent=`Wynik meczu · ${goals} / 10`;
  $('first-try').textContent=`Gole za pierwszym razem · ${firstTryGoals} / 10`;
  $('stars').setAttribute('aria-label',`Zdobyte gwiazdki: ${earned} z 3`);
  [...$('stars').children].forEach((star,index)=>star.classList.toggle('earned',index<earned));
  showScreen('summary');
  $('summary-title').focus({preventScroll:true});
  confetti($('summary'),36);
  say('victory');
}

function announceTask(){
  if(mode==='syllable')speakSyllable();
  else say(({join:'join_syllables',missing:'missing_syllable',word:'choose_image'})[mode]);
}
function speakSyllable(){if(muted)return;stop();if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(task.target.toLowerCase());u.lang='pl-PL';u.rate=.78;u.pitch=1.05;speechSynthesis.speak(u)}else $('status').textContent='Odczytaj sylabę: '+task.target}
$('repeat').onclick=speakSyllable;
function confetti(container,count){
  container.querySelectorAll('.confetti').forEach(piece=>piece.remove());
  const colors=['#fff','#58b5ff','#ffe177'];
  for(let i=0;i<count;i++){
    const piece=document.createElement('i');
    piece.className='confetti';
    piece.setAttribute('aria-hidden','true');
    piece.style.left=Math.random()*100+'%';
    piece.style.background=colors[i%colors.length];
    piece.style.setProperty('--dx',(Math.random()*130-65)+'px');
    piece.style.animationDelay=Math.random()*.24+'s';
    container.append(piece);
    setTimeout(()=>piece.remove(),1650);
  }
}
async function choose(ok,button){
  if(busy)return;
  busy=true;
  stop();
  const version=sceneVersion;
  const buttons=[...$('answers').children];
  buttons.forEach(answer=>answer.disabled=true);
  button.classList.add(ok?'good':'bad');
  const windup=player.animate([
    {transform:'none'},
    {offset:.58,transform:'translateX(-5%)',easing:'ease-in'},
    {transform:'none'}
  ],{duration:205,easing:'ease-out'});
  try{await windup.finished}catch{return}
  if(version!==sceneVersion)return;

  shotTarget=ok?(round%2===0?stadium.rightGoal:stadium.leftGoal):stadium.miss;
  positionScene();
  player.animate([
    {transform:'none',easing:'ease-out'},
    {offset:.35,transform:'translate(7%,-2%)',easing:'ease-in-out'},
    {transform:'none'}
  ],{duration:400});
  keeper.classList.add('dive');
  fx('kick');
  const flight=ball.animate([
    {left:'var(--foot-x)',top:'var(--foot-y)',transform:'translate(-50%,-50%) scale(1)'},
    {
      left:'calc((var(--foot-x) + var(--shot-x)) / 2)',
      top:'calc((var(--foot-y) + var(--shot-y)) / 2 - var(--shot-rise))',
      transform:'translate(-50%,-50%) scale(.62)'
    },
    {left:'var(--shot-x)',top:'var(--shot-y)',transform:'translate(-50%,-50%) scale(.42)'}
  ],{duration:650,fill:'forwards',easing:'ease-out'});
  try{await flight.finished}catch{return}
  if(version!==sceneVersion)return;

  const message=$('message');
  message.textContent=ok?'GOOOL!':'JESZCZE RAZ!';
  message.classList.add('show');
  if(ok){
    goals++;
    field.classList.add('scored');
    $('status').textContent='Brawo! Dobra odpowiedź!';
    player.classList.add('celebrate');
    fx('goal');
    say('goal');
    confetti(field,24);
    $('next-label').textContent=round===9?'Pokaż wynik':'Dalej';
    $('next').hidden=false;
    scoreboard();
  }else{
    missedRounds.add(round);
    $('status').textContent='Spróbuj ponownie — dasz radę!';
    say('retry');
    retryTimer=setTimeout(()=>{
      clearScene();
      buttons.forEach(answer=>answer.disabled=false);
      button.classList.remove('bad');
      busy=false;
    },1150);
  }
}
$('next').onclick=()=>{
  round++;
  if(round===10)finishMatch();
  else render();
};
