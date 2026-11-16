(function(){
 let session=null,id=null,recorded=false,last=null,trigger='owner';
 const state=()=>window.productionState,c=()=>window.ctl;
 function evidence(phase){const play=session.summary();id=window.desktopActionJournal.fact('interaction',play.kind,phase,id,null,play);window.desktopAPI.playState?.({actionId:id,phase,play});}
 window.desktopPlayTidy=()=>{if(!session||session.owner!==null||session.goal==='tidy')return false;evidence('interrupted');session.goal='tidy';id=null;evidence('started');if(session.kind==='ball'){session.owner=null;session.ball.vx=0;session.state='cleaning';session.phase='retrieve';session.lastProgress=performance.now();session.best=Infinity;}else{for(const b of session.bubbles)if(b.status==='live')b.status='expired';}return true;};
 window.desktopPlayActive=()=>!!session;
 window.desktopPlayHit=p=>state().cfg.ignoreMouse?false:!!session&&!session.terminal&&session.hit(p)!==null;
 window.desktopPlayPointer=e=>session?.pointer(e)===true;
 window.desktopPlayCancel=(reason='stop')=>{if(!session)return;session.cancel(reason);finish();};
 function finish(){if(!session)return;
  const ctl=c();if(session.kind==='bubbles'&&Number.isFinite(session.originalGround)&&ctl.pet.mode!=='drag'&&Math.abs(ctl.pet.gy-session.originalGround)>.1){
   ctl.pet.gy=session.originalGround;ctl.pet.targetY=session.originalGround;
   if(!['air','crouch'].includes(ctl.pet.mode)&&ctl.pet.fy<session.originalGround-1){ctl.pet.mode='air';ctl.pet.modeT=0;ctl.pet.airKind='drop';ctl.pet.vy=0;ctl.pet.vx=0;ctl.pet.gvy=0;}
  }
 if(!recorded){if(!id)evidence('started');evidence(session.terminal||'interrupted');recorded=true;}window.desktopPlayDraw(null);if(!window.desktopPointerActive?.()&&['walk','run'].includes(c()?.pet.mode))c().act('stand');window.labObjectRelease?.();session=null;id=null;last=null;}
 window.desktopPlayStart=(kind,source='owner')=>{
  if(kind==='tidy')return window.desktopPlayTidy();
  const ctl=c(),s=state();if(!ctl||s.visible===false||s.connected!==true||window.desktopPointerActive?.()||window.labFeeding?.()||ctl.busy()||!['idle','walk','run'].includes(ctl.pet.mode))return false;
  window.labObjectBegin('right');const hand=window.labObjectPoint();if(!hand){window.labObjectRelease();return false;}
  const left=Math.max(ctl.bounds.minX+25,ctl.pet.x-130),right=Math.min(ctl.bounds.maxX-25,ctl.pet.x+180);
  try{session=new DesktopPlay.PlaySession({kind,trigger:source,region:{left,right,y:hand.y},radius:Math.max(7,12*s.cfg.scale/.75)});}catch{window.labObjectRelease();return false;}
  session.originalGround=ctl.pet.gy;id=null;recorded=false;last={w:innerWidth,h:innerHeight,scale:s.cfg.scale};trigger=source;
  try{window.desktopPlayDraw(session);evidence('started');}catch{session.end('failed','renderUnavailable');finish();return false;}
  return true;
 };
 window.desktopPlayFrame=dt=>{
  if(!session)return false;const ctl=c(),s=state();
  if(last.w!==innerWidth||last.h!==innerHeight||last.scale!==s.cfg.scale)session.cancel('geometryChanged');
  // Commit a higher landing plane only after the body has physically crossed it on ascent.
  if(!session.terminal&&!window.desktopPointerActive?.()&&session.kind==='bubbles'&&session.nextPlatform!=null&&ctl.pet.mode==='air'&&ctl.pet.airKind==='jump'&&ctl.pet.vy<0&&ctl.pet.fy<=session.nextPlatform){ctl.pet.gy=session.nextPlatform;ctl.pet.targetY=session.nextPlatform;session.nextPlatform=null;}
  const hand=window.labObjectPoint();
  if(session.phase==='carry'&&hand){const b=ctl.bounds,dx=hand.x-ctl.pet.x,dy=hand.y-ctl.pet.gy;session.bag.x=Math.max(b.minX+dx+2,Math.min(b.maxX+dx-2,session.bag.x));session.bag.y=Math.max(b.minY+dy+2,Math.min(b.floorY+dy-2,session.bag.y));if(performance.now()<(session.carryReady||0)){session.ball.x=hand.x;session.ball.y=hand.y;window.desktopPlayDraw(session);return true;}}
  const intent=session.step({dt,hand,grabbed:window.desktopPointerActive?.(),visible:s.visible!==false,connected:s.connected===true});
  if(session.terminal){finish();return false;}
  if(intent?.type==='bubble'&&hand){
   if(!['air','crouch','land','drag'].includes(ctl.pet.mode)){
    const gap=hand.y-intent.y,aligned=Math.abs(hand.x-intent.x)<Math.max(16,session.radius*1.8);
    if(aligned&&gap>session.radius+3&&performance.now()>(session.nextJump||0)){
     const accepted=ctl.doWord(gap<38?'hop':'jump')===true;if(accepted){ctl.pet.jumpVx=0;session.nextPlatform=gap>90?Math.max(ctl.bounds.minY,ctl.pet.gy-70):null;session.nextJump=performance.now()+750;session.jumpCount=(session.jumpCount||0)+1;}
    }else if(!aligned)window.labObjectWalk(intent.x,hand.y);
   }
  }else if(intent?.type==='approach')window.labObjectWalk(intent.x,intent.y);
  else if(intent?.type==='acquire'){window.labObjectAcquire();session.carryReady=performance.now()+700;}
  else if(intent?.type==='stop'&&!window.desktopPointerActive?.()&&['walk','run'].includes(ctl.pet.mode))ctl.act('stand');
  window.desktopPlayDraw(session);return true;
 };
})();
