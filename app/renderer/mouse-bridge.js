(()=>{
 let pull=null,lockFacing=null;
 const lock=c=>{if(!c.__contactStep){const step=c.step.bind(c);c.step=dt=>{step(dt);if(lockFacing!=null){c.pet.facing=lockFacing;c.pet.faceVis=lockFacing;}};c.__contactStep=true;}if(lockFacing==null)lockFacing=c.pet.facing;};
 const point=()=>{const c=window.ctl,f=window.figure;if(!c||!f?.labHand)return null;const a=f.labHand();if(!a)return null;const p=c.toStage(a[0],a[1]);return {x:p.x??p[0],y:p.y??p[1]};};
 const wave=()=>{const c=window.ctl;c.pet.pulse={kind:'wave',t0:c.time-.45,dur:2};};
 window.labMouseBegin=(style='tug')=>{const c=window.ctl;lock(c);const b=c.bounds,dir=Math.sign(c.pet.facing||1),room=dir>0?b.maxX-c.pet.x:c.pet.x-b.minX;
  pull={x:c.pet.x,y:c.pet.gy,style,target:c.pet.x+dir*Math.min(230,Math.max(0,room-12))};
  c.act('stand');if(style==='run')c.walkTo(pull.target,true,'mouse-haul',pull.y);wave();c.render();};
 window.labMouseRelease=()=>{pull=null;lockFacing=null;const c=window.ctl;if(c){c.pet.pulse=null;c.act('stand');}};
 window.labMouseStep=({x,y,pulling,k})=>{
  const c=window.ctl;if(!c||!window.figure?.labHand||c.busy())return {ok:false};
  lock(c);window.selectReviewExpression?.(null);c.holdRoam(20);wave();
  const stage=document.getElementById('stage').getBoundingClientRect();
  let done=false;
  if(pulling&&pull){if(pull.style==='run'){done=Math.abs(c.pet.x-pull.target)<10||k>=1;if(!done&&c.pet.mode!=='run')c.walkTo(pull.target,true,'mouse-haul',pull.y);}
   else{const shift=Math.sin(k*Math.PI)*Math.min(55,stage.width*.08);c.pet.x=Math.max(c.bounds.minX,Math.min(c.bounds.maxX,pull.x+shift));c.pet.vx=0;done=k>=1;}}
  c.render();let p=point();if(!p)return {ok:false};
  if(!pulling){const dx=x*stage.width-p.x,dy=y*stage.height-p.y;
   if(Math.hypot(dx,dy)>6){const tx=Math.max(c.bounds.minX,Math.min(c.bounds.maxX,c.pet.x+dx)),ty=Math.max(c.bounds.minY,Math.min(c.bounds.floorY,c.pet.gy+dy));if(c.pet.mode==='walk'&&c.pet.walkId==='mouse-contact'){c.pet.target=tx;c.pet.targetY=ty;}else c.walkTo(tx,false,'mouse-contact',ty);}
  }
  return {ok:true,x:(stage.left+p.x)/innerWidth,y:(stage.top+p.y)/innerHeight,done};
 };
})();
