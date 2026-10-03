/* DS-04 自主燈光 · beat-synced light director (inspired by K/DA POP/STARS lighting language)
   - Clock: 120 BPM (per Edgar; POP/STARS itself is 170 / half-time 85) → beat 500ms, bar 2s. Every change lands on a beat.
   - Cues: hold · blackout→reveal (Akali blacklight) · stagger (Kai'Sa) · pulse (Ahri) · backlight (Evelynn) · partial
   - Safety (WCAG 2.3.1): ≤1 change per beat, governor ≤5 changes / rolling 1s & ≥200ms apart.
   - prefers-reduced-motion: autonomy OFF, switch obeys instantly. "Pause" button stops autonomy (WCAG 2.2.2).
   URL: ?mode=lit|uv|partial|black  &auto=0  &seed=N  &bpm=N                                           */
(function(){
  var Q=new URLSearchParams(location.search), root=document.documentElement;
  var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BPM=+(Q.get('bpm')||120), BEAT=60000/BPM;
  var seed=+(Q.get('seed')||Date.now()%100000);
  function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
  function pick(a){return a[Math.floor(rnd()*a.length)];}
  var zones=[].slice.call(document.querySelectorAll('[data-zone]'));
  var ui={mode:document.getElementById('lxMode'),dots:document.getElementById('lxDots'),beat:document.getElementById('lxBeat'),
          msg:document.getElementById('lxMsg'),sw:[].slice.call(document.querySelectorAll('[data-lx-switch]')),auto:document.getElementById('lxAuto'),cue:document.getElementById('lxCue')};
  var auto=!RM && Q.get('auto')!=='0';
  var hist=[], changes=0;
  function govern(){var t=performance.now();while(hist.length&&t-hist[0]>1000)hist.shift();
    if(hist.length>=5||(hist.length&&t-hist[hist.length-1]<200))return false;hist.push(t);changes++;return true;}
  /* one "change" may move several zones at once (= one visual event) */
  function apply(list,force){
    list=list.filter(function(p){return zones[p[0]]&&zones[p[0]].dataset.light!==p[1];});
    if(!list.length)return true; if(!force&&!govern())return false;
    list.forEach(function(p){zones[p[0]].dataset.light=p[1];}); render(); return true;}
  function all(m){return zones.map(function(z,i){return [i,m];});}
  function global(){var s={};zones.forEach(function(z){s[z.dataset.light]=1;});var k=Object.keys(s);return k.length===1?k[0]:'partial';}
  var LABEL={lit:'開燈 LIT',uv:'關燈 UV',black:'黑場 BLACK',partial:'局部 PARTIAL'};
  function render(){var g=global();root.dataset.global=g;var con=document.getElementById('lxConsole');if(con)con.dataset.light=(g==='partial'?'uv':g);
    if(ui.mode)ui.mode.textContent=LABEL[g];
    if(ui.dots)ui.dots.innerHTML=zones.map(function(z){return '<i class="'+z.dataset.light+'" title="'+(z.dataset.zone||'')+'"></i>';}).join('');
    ui.sw.forEach(function(b){b.setAttribute('aria-pressed',g==='lit'?'true':'false');});}
  function say(t){if(ui.msg)ui.msg.textContent=t;}
  /* ----- initial state ----- */
  var m0=Q.get('mode')||'uv';
  zones.forEach(function(z,i){z.dataset.light = m0==='partial' ? (z.dataset.partial || (i%2?'uv':'lit')) : m0;});
  render();
  /* ----- cue library : each returns beat steps; a step = list of [zone,mode] | fn | null(hold) ----- */

  /* ===== STAGE director: fixed composition, hard cuts on the beat between LIT / UV / RED (+1-beat BLACK) ===== */
  var stage=document.getElementById('stage'), stLabel=document.getElementById('stState'), stCue=document.getElementById('stCue');
  var ST_LABEL={lit:'LIT',uv:'UV',red:'RED',black:''}, stLeft=0, stNext=null;
  function stSet(m,force){ if(!stage||stage.dataset.stage===m)return; if(!force&&!govern())return false; stage.dataset.stage=m; if(stLabel)stLabel.textContent=ST_LABEL[m]; render(); return true;}
  function stPlan(){ /* choose next state + duration in beats */
    var cur=stage.dataset.stage, opts=['lit','uv','red'].filter(function(x){return x!==cur&&x!==stNext;}); var m=pick(opts.length?opts:['uv']);
    var d=pick([4,4,8,8,6,2]); return {m:m,d:d};}
  function stTick(){ if(!stage)return; if(--stLeft>0)return;
    if(stNext){var n=stNext;stNext=null;stSet(n.m);stLeft=n.d;if(stCue)stCue.textContent='BLACK → '+n.m.toUpperCase()+' · '+n.d+' beats';return;}
    var p=stPlan();
    if(rnd()<.28&&stage.dataset.stage!=='black'){stSet('black');stNext=p;stLeft=1;if(stCue)stCue.textContent='BLACK · 1 beat';return;}
    stSet(p.m);stLeft=p.d;if(stCue)stCue.textContent='CUT → '+p.m.toUpperCase()+' · '+p.d+' beats';}
  var st0=Q.get('stage'); if(stage){ stage.dataset.stage=st0||'uv'; if(stLabel)stLabel.textContent=ST_LABEL[stage.dataset.stage]; stLeft=4; }
  var rmTimer=null;
  function stRM(){ /* reduced motion: slow cross-fade every 8 s, never black */
    if(!stage)return; stage.classList.add('rm'); var seq=['lit','uv','red'],i=seq.indexOf(stage.dataset.stage);
    rmTimer=setInterval(function(){i=(i+1)%3;stSet(seq[i],true);if(stCue)stCue.textContent='減少動態：每 8 秒淡換';},8000);}

  var N=zones.length, order=zones.map(function(_,i){return i;});
  function shuffled(){var a=order.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function hold(n){var s=[];for(var i=0;i<n;i++)s.push(null);return s;}
  var CUES={
    holdLit:function(){return {name:'HOLD · 開燈',steps:[all('lit')].concat(hold(4*(2+Math.floor(rnd()*3))-1))};},
    holdUV:function(){return {name:'HOLD · UV',steps:[all('uv')].concat(hold(4*(2+Math.floor(rnd()*3))-1))};},
    blackoutReveal:function(){ /* 黑場 1 拍 → 每拍亮一區 UV（Akali blacklight） */
      var s=[all('black'),null]; var ord=rnd()<.6?order:shuffled(); ord.forEach(function(i){s.push([[i,'uv']]);});
      return {name:'BLACKOUT → UV REVEAL',steps:s.concat(hold(6))};},
    staggerLit:function(){ /* 錯落燈（Kai'Sa）：每拍一區開燈 */
      var s=[]; (rnd()<.5?order:order.slice().reverse()).forEach(function(i){s.push([[i,'lit']]);}); return {name:'STAGGER · 開燈',steps:s.concat(hold(4))};},
    staggerUV:function(){var s=[];shuffled().forEach(function(i){s.push([[i,'uv']]);});return {name:'STAGGER · 關燈',steps:s.concat(hold(4))};},
    partial:function(){ /* 局部燈區，每 2 拍換一區 */
      var s=[zones.map(function(z,i){return [i,rnd()<.45?'lit':'uv'];})];
      for(var k=0;k<4;k++){s.push(null);var i=Math.floor(rnd()*N);s.push(function(i){return function(){return [[i,zones[i].dataset.light==='lit'?'uv':'lit']];};}(i));}
      return {name:'PARTIAL ZONES',steps:s.concat(hold(3))};},
    pulse:function(){ /* 閃爍燈（Ahri）：只有一區，每 2 拍切一次 ≈ 1.4 次/秒 */
      var i=pick(order), a=zones[i].dataset.light==='lit'?'uv':'lit', b=zones[i].dataset.light, s=[];
      for(var k=0;k<4;k++){s.push([[i,k%2?b:a]]);s.push(null);} return {name:'PULSE · 單區閃',steps:s.concat(hold(2))};},
    backlight:function(){ /* 逆光（Evelynn）：全暗 UV，一區背後亮車尾燈色輪廓光 */
      var i=pick(order);
      return {name:'BACKLIGHT',steps:[all('uv'),function(){if(govern()){zones[i].classList.add('backlit');}return [];}].concat(hold(7)).concat([function(){zones[i].classList.remove('backlit');return [];}])};}
  };
  var W=[['holdUV',3],['holdLit',2],['blackoutReveal',3],['staggerLit',2],['staggerUV',2],['partial',2],['pulse',1],['backlight',1]];
  function nextCue(){var tot=W.reduce(function(a,w){return a+w[1];},0),r=rnd()*tot;for(var k=0;k<W.length;k++){r-=W[k][1];if(r<=0)return CUES[W[k][0]]();}return CUES.holdUV();}
  var queue=[], beatN=0, cueName='', pending=null, timer=null;
  function setQueue(c){queue=c.steps.slice();cueName=c.name;if(ui.cue)ui.cue.textContent=c.name;}
  function tick(){
    beatN++; if(ui.beat&&!RM){ui.beat.classList.toggle('on',beatN%4===1);} stTick();
    if(pending && beatN%4===1){var p=pending;pending=null;p();}   // user requests resolve on the downbeat
    if(!queue.length){
      var c=nextCue(); if(rnd()<.12){ /* 小故障：插一拍不照劇本 */ var i=Math.floor(rnd()*N); c.steps.splice(2,0,[[i,'black']],null,function(){return [[i,'uv']];}); c.name+=' + GLITCH';}
      setQueue(c);
    }
    var st=queue.shift(); if(!st)return; if(typeof st==='function')st=st(); if(st&&st.length){root.classList.add('snap');apply(st);}
  }
  function start(){if(timer||!auto)return;timer=setInterval(tick,BEAT);if(ui.auto){ui.auto.textContent='■ 暫停自主燈光';ui.auto.setAttribute('aria-pressed','true');}say('燈光自己會跟拍子切換（'+BPM+' BPM）。開關不一定聽你的。');}
  function stop(){clearInterval(timer);timer=null;queue=[];root.classList.remove('snap');if(ui.auto){ui.auto.textContent='▶ 啟動自主燈光';ui.auto.setAttribute('aria-pressed','false');}if(ui.cue)ui.cue.textContent=RM?'減少動態：自主燈光關閉':'手動';}
  function userSwitch(){
    var want=global()==='lit'?'uv':'lit';
    if(!timer){root.classList.remove('snap');apply(all(want),true);say(want==='lit'?'開燈。':'關燈：只剩螢光顏料。');return;}
    say('…等下一個小節');
    pending=function(){
      if(rnd()<.62){setQueue({name:'USER → '+(want==='lit'?'開燈':'關燈'),steps:[all(want)].concat(hold(11))});say('好，這次聽你的。');}
      else{var i=Math.floor(rnd()*N),back=zones[i].dataset.light;setQueue({name:'USER → 拒絕',steps:[[[i,want]],null,[[i,back]]].concat(hold(4))});
        ui.sw.forEach(function(b){b.classList.add('refused');setTimeout(function(){b.classList.remove('refused');},1600);});say('燈不聽話。它們有自己的節奏。');}
    };
  }
  ui.sw.forEach(function(b){b.addEventListener('click',userSwitch);});
  if(ui.auto)ui.auto.addEventListener('click',function(){if(timer){auto=false;stop();say('自主燈光已暫停；開關會直接生效。');}else{auto=true;start();}});
  window.DS4Lights={apply:apply,all:all,stop:stop,start:start,zones:zones,stats:function(){return {changes:changes,beatMs:BEAT};}};
  if(RM&&Q.get('auto')!=='0')stRM();
  if(ui.auto)ui.auto.addEventListener('click',function(){if(rmTimer){clearInterval(rmTimer);rmTimer=null;}});
  if(auto)start(); else {stop(); say(RM?'你的系統偏好「減少動態」：燈光不會自己切換，開關按了就生效。':'自主燈光關閉；按開關直接切換。');}
})();
