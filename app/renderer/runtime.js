window.productionState={cfg:{scale:.75,autonomy:true},world:{icons:[],windows:[]},input:{x:0,y:0}};
window.desktopBoot=(async()=>{
 const api=window.desktopAPI,state=window.productionState,init=await api.init();Object.assign(state,init);
 const stage=document.getElementById('stage'),sfx=UPSTREAM_SOUND.createSfx({storageKey:'fish.rig.sound'});window.labSfx=sfx;
 function syncSound(){sfx.set(state.cfg.soundEnabled!==false);sfx.setShown(state.visible!==false);if(state.cfg.soundEnabled!==false&&state.visible!==false)sfx.unlock();}
 syncSound();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSound();});
 const figure=await UPSTREAM_FIGURE.createWhaleFigure(undefined,{scheme:'deepseek-maid',model:MODEL,kit:SKIN_KIT,asset:p=>ASSETS[p]});await attachSkinExpressions(figure);
 const c=UPSTREAM_BODY.createPet({petG:document.getElementById('pet'),shadowEl:document.getElementById('shadow'),fxG:document.getElementById('fx')},{figure,sfx,onEvent:(kind,event)=>{if(kind==='touch')window.desktopActionJournal?.touch(event);},roam:'off',ground:'free',bounds:()=>({W:stage.clientWidth,H:stage.clientHeight,floorY:stage.clientHeight-22,S:.9*state.cfg.scale/.75})});
 window.figure=figure;window.ctl=c;window.desktopActionJournal=new DesktopActionEvidence({controller:c,emit:event=>api.actionTrace(event)});c.act('stand');const p=init.position||{x:stage.clientWidth-210,y:c.bounds.floorY};c.pet.x=Math.max(c.bounds.minX,Math.min(c.bounds.maxX,p.x));c.pet.gy=c.pet.fy=Math.max(c.bounds.minY,Math.min(c.bounds.floorY,p.y));
 let toyPointer=null;let widgetFeed=null;let visible=true,last=performance.now(),lastHit=null,lastHitSent=0,drag=null,suppressUntil=0,remote=null,remoteQueue=[],rendered=0;const panel=document.getElementById('feedPanel');
 window.desktopPointerActive=()=>drag!==null||window.desktopPropHeld?.()===true;
 const point=e=>({x:e.clientX,y:e.clientY});
 const elementHit=(id,p)=>{const el=document.getElementById(id);if(!el||el.hidden)return false;const r=el.getBoundingClientRect();return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;};
 function hit(p){const over=drag!==null||toyPointer!==null||elementHit('labSpeech',p)||elementHit('feedPanel',p)||window.desktopSnackHit?.(p)||c.hitPet(p)||window.desktopPlayHit?.(p);if(over!==lastHit||over===true&&performance.now()-lastHitSent>250){lastHit=over;lastHitSent=performance.now();api.hit(over);}}
 window.desktopSay=detail=>{window.desktopEvent?.('action.note',String(detail));return false;};
 window.desktopEvent=(kind,detail='',gateApplied=false)=>api.event?.({kind,gateApplied,detail:String(detail).slice(0,240),satiety:window.desktopLife?.satiety??70});
 function pump(){if(remote||!visible)return;while(remoteQueue.length&&remoteQueue[0].expiresAt<Date.now())remoteQueue.shift();const m=remoteQueue.shift();if(!m)return;const id=window.labDialogue.receive(m.text);remote={...m,dialogueId:id,ack:false};}
 window.showFeedPanel=()=>{const a=c.anchor();panel.hidden=false;panel.style.left=Math.max(12,Math.min(innerWidth-230,a.x-100))+'px';panel.style.top=Math.max(12,Math.min(innerHeight-65,a.y))+'px';};
 document.addEventListener('pointerdown',e=>{sfx.unlock();if(e.button===0&&window.desktopSnackPointer?.(e))return;if(e.button!==0||e.target.closest('button,#labSpeech'))return;if(!c.hitPet(point(e))){panel.hidden=true;if(window.desktopPlayPointer?.({phase:'down',pointerId:e.pointerId,...point(e)})){toyPointer=e.pointerId;stage.setPointerCapture(toyPointer);e.preventDefault();e.stopImmediatePropagation();}return;}
  e.preventDefault();e.stopImmediatePropagation();window.desktopCancel?.('ownerGrab');panel.hidden=true;window.labStopFeed?.();window.selectReviewExpression(null);
  if(c.pointerDown(point(e))){drag=e.pointerId;stage.setPointerCapture(drag);api.hit(true);window.getSelection()?.removeAllRanges();}
 },true);
 document.addEventListener('pointermove',e=>{if(toyPointer===e.pointerId){window.desktopPlayPointer?.({phase:'move',pointerId:e.pointerId,...point(e)});e.preventDefault();e.stopImmediatePropagation();return;}if(drag===e.pointerId){e.preventDefault();e.stopImmediatePropagation();c.pointerMove(point(e));}else hit(point(e));},true);
 const release=e=>{if(toyPointer===e.pointerId){window.desktopPlayPointer?.({phase:'up',pointerId:e.pointerId,...point(e)});toyPointer=null;api.restoreLayer();hit(point(e));e.preventDefault();e.stopImmediatePropagation();return;}if(drag!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();drag=null;c.pointerMove(point(e));c.pointerUp(point(e));api.restoreLayer();suppressUntil=performance.now()+450;hit(point(e));};
 document.addEventListener('pointerup',release,true);
 const cancelDrag=reason=>{if(toyPointer!==null){window.desktopPlayPointer?.({phase:'cancel',pointerId:toyPointer});toyPointer=null;}if(drag===null)return;drag=null;window.desktopActionJournal?.cancelTouch(reason);c.dropAt({x:c.pet.mode==='drag'?c.pet.dx:c.pet.x,y:c.pet.mode==='drag'?c.pet.dy:c.pet.fy});api.restoreLayer();suppressUntil=performance.now()+450;lastHit=null;hit(state.input);};
 document.addEventListener('pointercancel',()=>cancelDrag('cancel'),true);
 stage.addEventListener('lostpointercapture',()=>cancelDrag('lost-capture'));
 document.addEventListener('click',e=>{if(performance.now()<suppressUntil&&!e.target.closest('button')){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('dblclick',e=>{if(c.hitPet(point(e))){e.preventDefault();window.desktopCancel?.();window.desktopEvent?.('interaction.pat','主人双击了桌宠，表达亲近互动。');}});
 document.addEventListener('contextmenu',e=>{e.preventDefault();api.menu();});
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-food]');if(b){window.desktopCancel?.();window.labFeed(b.dataset.food);panel.hidden=true;}});
 document.addEventListener('keydown',e=>{sfx.unlock();if(e.key==='Escape'){panel.hidden=true;window.desktopCancel?.();}});
 addEventListener('blur',()=>{cancelDrag('blur');window.desktopPlayCancel?.('stop');});
 new ResizeObserver(()=>{c.resize();lastHit=null;}).observe(stage);
 api.onEvent(({type,data})=>{
  if(type==='home-place'){const b=c.bounds;const x=Math.max(b.minX,Math.min(b.maxX,c.pet.x+80));void api.home('prop',{name:data.name,x:x/innerWidth,y:c.pet.gy/innerHeight,visible:true}).then(r=>{if(!r.error)dispatchEvent(new CustomEvent('home-refresh',{detail:r.snapshot}));});}
  if(type==='feed-button'){
   if(widgetFeed||window.labFeeding?.()){void api.call('feedStatus',{id:data.id,phase:'busy'}).catch(()=>{});return;}
   window.desktopCancel?.();const accepted=window.labFeed(data.kind);
   if(accepted)widgetFeed={id:data.id,kind:data.kind};void api.call('feedStatus',{id:data.id,phase:accepted?'accepted':'busy'}).catch(()=>{});
  }
  if(type==='config'){lastHit=null;Object.assign(state.cfg,data);syncSound();c.resize();if(data.ignoreMouse||!data.autonomy||data.autonomyPolicy){window.desktopCancel?.();panel.hidden=true;}if(data.autonomyPolicy)api.policyApplied?.(data.autonomyPolicy.version);}
  if(type==='world')state.world=data;
  if(type==='cursor'){state.input={...state.input,...data};hit(data);}
  if(type==='input'){state.input={...state.input,interrupt:data.interrupt,escape:data.escape};if(data.escape)window.desktopCancel?.();}
  if(type==='connection'){state.connected=data;if(!data)window.desktopCancel?.('disconnected');}
  if(type==='visibility'){if(!data)cancelDrag('hidden');visible=data;state.visible=data;syncSound();if(!data){window.desktopSnackPanel?.hide();window.desktopCancel?.('hidden');window.labDialogue?.close();remote=null;remoteQueue=[];}}
  if(type==='say')window.desktopSay(data);
  if(type==='speech'){if(remoteQueue.length>=5)remoteQueue.shift();remoteQueue.push(data);pump();}
  if(type==='home-cancel-request')window.desktopHomeCancelRequest?.(data.id);
  if(type==='remote-action'){Promise.resolve().then(()=>visible?window.desktopRemoteAction(data):false).then(ok=>api.actionResult(data.id,ok===true,ok===true?'':window.desktopCommandFailureCode||'blocked'),()=>api.actionResult(data.id,false));}
 });
 addEventListener('fish-feed-ended',event=>{
  window.desktopActionJournal?.fact('feeding',event.detail.kind,event.detail.completed?'completed':'interrupted');
  if(!widgetFeed||event.detail.kind!==widgetFeed.kind)return;const feed=widgetFeed;widgetFeed=null;
  void api.call('feedStatus',{id:feed.id,phase:event.detail.completed?'completed':'cancelled'}).catch(()=>{});
  // Completed manual feed feedback is emitted once by the main-process ticket.
 });
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(visible){c.step(dt);window.desktopRemoteFrame?.();window.desktopBeforeRender?.();c.render();hit(state.input);window.desktopActionJournal?.sample({feeding:window.labFeeding?.()});window.desktopSpeechFrame?.(now);if(++rendered===3)api.ready();
  if(remote){const s=window.labDialogue.state();if(s.id===remote.dialogueId&&s.done&&!remote.ack&&remote.expiresAt>=Date.now()){remote.ack=true;const id=remote.id;requestAnimationFrame(()=>{if(visible)api.displayed(id);});}if(!s.visible||s.id!==remote.dialogueId){remote=null;pump();}}
 }requestAnimationFrame(frame);}
 requestAnimationFrame(frame);setInterval(()=>{api.state({x:c.pet.x,y:c.pet.gy});},1500);return c;
})();
