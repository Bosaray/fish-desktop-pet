(()=>{
 let side=null;
 const clearCushion=()=>{window.LAB_CUSHION_TARGET=null;window.LAB_CUSHION_GRIP=0;};
 const c=()=>window.ctl;
 window.labObjectBegin=s=>{window.labMouseRelease?.();side=s;clearCushion();window.LAB_HUG_CUSHION=false;window.LAB_CARRY_SIDE=null;window.LAB_CARRY_NEAR=null;window.LAB_MISCHIEF=true;c().pet.pulse=null;c().holdRoam(40);};
 window.labObjectAcquire=()=>{window.LAB_CARRY_NEAR=(side==='left')===((c().pet.faceVis||c().pet.facing)>0);window.LAB_CARRY_SIDE=side;window.LAB_MISCHIEF=false;c().act('stand');};
 window.labObjectHug=()=>{window.LAB_CARRY_SIDE=null;window.LAB_CARRY_NEAR=null;window.LAB_MISCHIEF=false;window.LAB_HUG_CUSHION=true;};
 window.labObjectRelease=()=>{clearCushion();window.LAB_HUG_CUSHION=false;side=null;window.LAB_CARRY_NEAR=null;window.LAB_CARRY_SIDE=null;window.LAB_MISCHIEF=false;window.labMouseRelease?.();};
 window.labObjectPoint=()=>{const a=window.figure?.labHandSide?.(side);if(!a)return null;return c().toStage(...a);};
 window.labObjectCushionPoint=()=>{const hand=window.labObjectPoint(),body=window.figure?.labCushion?.();if(!hand)return null;if(!body)return hand;const p=c().toStage(...body),mix=Math.max(0,Math.min(1,window.figure?.labHugMix?.()||0));return {x:hand.x+(p.x-hand.x)*mix,y:hand.y+(p.y-hand.y)*mix};};
 // Convert the stationary stage point through the full current pet transform.
 window.labObjectCushionTarget=(p,grip=1)=>{const f=c().pet.xf;if(!f||!p)return false;const a=-f.rot*Math.PI/180,dx=p.x-f.AX,dy=p.y-f.AY;if(Math.abs(f.kx)<.001||Math.abs(f.ky)<.001)return false;window.LAB_CUSHION_TARGET=[f.ax+(dx*Math.cos(a)-dy*Math.sin(a))/f.kx,f.ay+(dx*Math.sin(a)+dy*Math.cos(a))/f.ky];window.LAB_CUSHION_GRIP=grip;c().render();return true;};
 window.labObjectCushionContact=()=>window.figure?.labCushionContact?.()??true;
 window.labObjectHugSettled=()=>!(window.figure?.labHugMix?.()>.1);
 window.labObjectWalkRoot=(x,y)=>{const ctl=c();if(!ctl||ctl.busy())return;const b=ctl.bounds,tx=Math.max(b.minX,Math.min(b.maxX,x)),ty=Math.max(b.minY,Math.min(b.floorY,y));
 if(ctl.pet.mode==='walk'&&ctl.pet.walkId==='object-carry'){ctl.pet.target=tx;ctl.pet.targetY=ty;}else ctl.walkTo(tx,false,'object-carry',ty);};
 window.labObjectWalk=(x,y)=>{const ctl=c();if(!ctl||ctl.busy())return null;ctl.render();const p=window.labObjectPoint();if(!p)return null;
 const b=ctl.bounds,rx=ctl.pet.x+x-p.x,ry=ctl.pet.gy+y-p.y,tx=Math.max(b.minX,Math.min(b.maxX,rx)),ty=Math.max(b.minY,Math.min(b.floorY,ry));
 p.reachable=Math.abs(rx-tx)<12&&Math.abs(ry-ty)<12;
 if(Math.hypot(p.x-x,p.y-y)>7)window.labObjectWalkRoot(tx,ty);return p;};
})();
