(()=>{
 const motions=['stand','jump','hop','look','turn','nod','shake','spin','sit','sleep','dizzy','walk','run','wave','bow','shiver','flap','dance'];
 const expressions=['neutral','happy','wink','love','shy','surprised','angry','sad','sleepy','thinking','smug','worried','determined','flustered','scared','excited','cry','confused'];
 let pending=null;
 window.desktopRemotePending=()=>!!pending;
 window.desktopRemoteCancel=()=>{if(pending){const task=pending;pending=null;task.resolve(false);}};
 function play(c,data){return c.doWord(data.name)===true;}
 window.desktopRemoteFrame=()=>{
  if(!pending)return;const task=pending,c=window.ctl,s=window.productionState;
  if(!c||window.desktopPointerActive?.()||s.visible===false||Date.now()>task.deadline||c.busy()){window.desktopRemoteCancel();return;}
  if(Math.hypot(c.pet.x-task.x,c.pet.gy-task.y)<7){pending=null;c.act('stand');task.resolve(play(c,task.data));}
  else if(!['walk','run','wake'].includes(c.pet.mode)){window.desktopRemoteCancel();}
 };
 window.desktopRemoteAction=data=>{
  const c=window.ctl,s=window.productionState;if(!c||s.visible===false||!Number.isFinite(data.expiresAt)||data.expiresAt<Date.now())return false;
  if(window.desktopPointerActive?.()&&data.action!=='stop')return false;
  let {action,name}=data;
  if(['wave','happy','shy'].includes(action)){name=action;action=action==='wave'?'motion':'expression';}
  if(action==='wake'){action='motion';name='stand';}
  if(action==='stop'){window.desktopCommand?.('stop');if(!window.desktopPointerActive?.())c.act('stand');return true;}
  if(action==='hint'&&['左边','右边','上面','下面','附近'].includes(data.hint))return window.desktopCommand?.('hint',{text:data.hint})===true;
  if(action==='interact'){
   if(!['food','mouse','icon','push','perch','yield','bubbles','ball','tidy','showFavorite','nestRest','snackEat'].includes(name))return false;
   if(s.cfg.ignoreMouse||name==='mouse'&&!s.cfg.allowMouse||name==='icon'&&!s.cfg.allowIcons||name==='push'&&!s.cfg.allowWindows)return false;
   if(window.labFeeding?.()||c.busy())return false;
   return window.desktopCommand?.(name,{food:data.food,assetId:data.assetId,requestId:data.id,expiresAt:data.expiresAt});
  }
  if(!((action==='motion'&&motions.includes(name))||(action==='expression'&&expressions.includes(name))||action==='move'))return false;
  if(window.labFeeding?.()||c.busy())return false;
  const b=c.bounds,spots={'左上角':[b.minX,b.minY],'右上角':[b.maxX,b.minY],'左下角':[b.minX,b.floorY],'右下角':[b.maxX,b.floorY],'屏幕中间':[(b.minX+b.maxX)/2,(b.minY+b.floorY)/2],'鼠标旁边':[s.input.x,s.input.y],'屏幕左边':[b.minX,c.pet.gy],'屏幕右边':[b.maxX,c.pet.gy]};
  if(action==='move'&&!spots[data.anchor])return false;
  const previousY=c.pet.gy;window.desktopCancel?.();c.pet.gy=c.pet.fy=Math.max(b.minY,Math.min(b.floorY,previousY));c.pet.targetY=c.pet.gy;c.act('stand');c.holdRoam(12);window.selectReviewExpression?.(null);
  if(action==='move'){const p=spots[data.anchor];return c.walkTo(p[0],data.run===true,'remote-move',p[1])===true;}
  // Bounds already contain the standing figure. Reserve additional room for
  // outstretched hands, motion arcs and expression effects, in stage DIP units.
  const scale=b.S||.9*(s.cfg.scale||.75)/.75;
  const wide=action==='motion'&&['wave','dance','spin','flap','bow'].includes(name);
  const extraX=(wide?70:20)*scale,extraTop=(name==='jump'?140:name==='hop'||name==='flap'?100:action==='expression'?50:45)*scale;
  const left=b.minX+extraX,right=b.maxX-extraX,top=b.minY+extraTop,bottom=b.floorY-10*scale;
  if(left>right||top>bottom)return false;
  const x=Math.max(left,Math.min(right,c.pet.x)),y=Math.max(top,Math.min(bottom,c.pet.gy));
  if(Math.hypot(x-c.pet.x,y-c.pet.gy)<3)return play(c,{action,name});
  if(c.walkTo(x,false,'remote-prepare',y)!==true)return false;
  return new Promise(resolve=>{pending={x,y,data:{action,name},resolve,deadline:Math.min(data.expiresAt,Date.now()+4800)};});
 };
})();
