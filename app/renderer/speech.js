// Typewriter text cadence is independent from the bubble's display-rate motion.
(()=>{
 const stage=document.getElementById('stage'),bubble=document.createElement('div'),text=document.createElement('div');
 bubble.id='labSpeech';bubble.hidden=true;text.className='speech-text';bubble.append(text);stage.append(bubble);
 const style=document.createElement('style');style.textContent=`#labSpeech{position:absolute;left:0;top:0;z-index:115;width:280px;max-width:calc(100% - 24px);height:53.2px;padding:13px 15px;border-radius:15px;background:#f7faff;color:#283852;border:1px solid #b6ccee;box-shadow:0 6px 25px #0003;pointer-events:auto;box-sizing:border-box;overflow:hidden;contain:layout style;will-change:transform;transform:translate3d(0,0,0)}#labSpeech[hidden]{display:none}#labSpeech .speech-text{white-space:pre-wrap;overflow-wrap:anywhere;max-height:170px;overflow:auto;scrollbar-gutter:stable;font:14px/1.8 'Microsoft YaHei UI',system-ui}#labSpeech .speech-text::-webkit-scrollbar{width:7px}#labSpeech .speech-text::-webkit-scrollbar-thumb{background:#8c969b;border-radius:5px}#labSpeech .speech-text::-webkit-scrollbar-button{display:none}`;document.head.append(style);
 let active=null,seq=0,nextAt=0,hideAt=Infinity,lastFrame=0,follow=true,node=null;
 let viewport={width:innerWidth,height:innerHeight},contentHeight=25.2,height=53.2,targetHeight=53.2,lastTransform='';
 const split=s=>typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(s),x=>x.segment):Array.from(s);
 const resize=()=>{targetHeight=Math.max(28,Math.min(viewport.height-24,Math.max(25.2,contentHeight)+28));};
 if(typeof ResizeObserver==='function'){
  new ResizeObserver(entries=>{for(const e of entries){if(e.target===stage){viewport={width:e.contentRect.width,height:e.contentRect.height};text.style.maxHeight=Math.max(1,Math.min(170,viewport.height-52))+'px';}else contentHeight=e.contentRect.height;}resize();}).observe(stage);
  new ResizeObserver(entries=>{for(const e of entries)contentHeight=e.contentRect.height;resize();}).observe(text);
 }
 addEventListener('resize',()=>{viewport={width:innerWidth,height:innerHeight};resize();});
 function begin(id){const wasHidden=bubble.hidden;active={id,chars:[],shown:0,ended:false,rendered:'',inputLength:0};node=document.createTextNode('');text.replaceChildren(node);bubble.hidden=false;follow=true;nextAt=0;hideAt=Infinity;contentHeight=25.2;resize();if(wasHidden){height=targetHeight;bubble.style.height=height+'px';lastFrame=0;}window.ctl?.holdRoam(30);}
 function reveal(end){const chunk=active.chars.slice(active.shown,end).join('');active.shown=end;active.rendered+=chunk;node.appendData(chunk);if(follow)text.scrollTop=1e9;}
 const api={
  receive(value){const s=typeof value==='string'?value:value?.text;if(typeof s!=='string'||!s.trim())return false;const id='reply-'+(++seq);begin(id);const chunk=s.slice(0,12000);active.chars=split(chunk);active.inputLength=chunk.length;active.ended=true;return id;},
  begin(id){if(typeof id!=='string'||!id)return false;begin(id);return true;},
  append(id,chunk){if(!active||active.id!==id||active.ended||typeof chunk!=='string')return false;const part=chunk.slice(0,Math.max(0,12000-active.inputLength));active.inputLength+=part.length;active.chars.push(...split(part));hideAt=Infinity;return true;},
  end(id){if(!active||active.id!==id)return false;active.ended=true;return true;},
  close(){active=null;bubble.hidden=true;node=null;text.replaceChildren();},
  finish(){if(!active)return;reveal(active.chars.length);if(active.ended)hideAt=performance.now()+Math.max(7000,active.chars.length*80);},
  state(){return {id:active?.id,text:active?.rendered||'',visible:!bubble.hidden,done:!!active&&active.ended&&active.shown===active.chars.length};}
 };window.labDialogue=api;
 bubble.addEventListener('pointerdown',e=>e.stopPropagation());
 text.addEventListener('wheel',e=>{if(e.deltaY<0)follow=false;},{passive:true});
 text.addEventListener('scroll',()=>{follow=text.scrollHeight-text.clientHeight-text.scrollTop<=20;},{passive:true});
 function frame(now){
  const dt=lastFrame?Math.min(.05,Math.max(0,(now-lastFrame)/1000)):1/60;lastFrame=now;
  if(!active||bubble.hidden)return;
  if(now>=nextAt&&active.shown<active.chars.length){const ch=active.chars[active.shown];reveal(active.shown+1);window.ctl?.talk();window.labSfx?.babble(ch);nextAt=now+(/[，。！？；…,.!?\n]/u.test(ch)?210:70);hideAt=Infinity;}
  else if(active.ended&&active.shown===active.chars.length&&hideAt===Infinity)hideAt=now+Math.max(7000,active.chars.length*80);
  if(now>hideAt){api.close();return;}
  // Layout dimensions arrive through ResizeObserver. No layout reads are made
  // after text/position writes in the animation loop.
  if(Math.abs(height-targetHeight)>.05){height+=(targetHeight-height)*(1-Math.exp(-dt/.055));if(Math.abs(height-targetHeight)<.05)height=targetHeight;bubble.style.height=height.toFixed(3)+'px';}
  const c=window.ctl,a=c?.anchor?.()||{x:c?.pet.x||160,y:(c?.pet.fy||360)-180},w=Math.min(280,viewport.width-24);
  const x=Math.max(12,Math.min(viewport.width-w-12,a.x-w/2)),y=Math.max(12,Math.min(viewport.height-height-12,a.y-height-16));
  const transform=`translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`;if(transform!==lastTransform){lastTransform=transform;bubble.style.transform=transform;}
 }
 // The production renderer calls this after it renders the pet, so both use
 // the same pose and frame. Standalone previews retain their own animation loop.
 window.desktopSpeechFrame=frame;
 if(!window.desktopAPI){const loop=now=>{frame(now);requestAnimationFrame(loop);};requestAnimationFrame(loop);}
})();
