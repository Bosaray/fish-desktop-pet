/* Pure local play simulation. No desktop input, network, or model calls. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function segmentDistance(a,b,p){if(!a)return Infinity;const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y);}
 class PlaySession{
  constructor({kind,region,now=()=>performance.now(),random=Math.random,trigger='owner',radius=12}){
   if(!['bubbles','ball'].includes(kind)||!region||![region.left,region.right,region.y].every(Number.isFinite)||region.right-region.left<100)throw Error('noSpace');
   Object.assign(this,{kind,region:{...region},now,random,trigger,radius,started:now(),state:'active',phase:'approach',terminal:null,owner:null,previousHand:null,lastProgress:now(),best:Infinity,pushes:0,retrieved:false,cleanup:'none',reason:'normal'});
   const {left,right,y}=region;this.bag={x:left+24,y};this.ball={x:(left+right)/2,y,vx:0};
   this.bubbles=kind==='bubbles'?Array.from({length:3},(_,id)=>({id,x:left+30+(right-left-60)*(id+.3+random()*.4)/3,y:y-15-random()*30,status:'live',rise:12+random()*7,baseX:left+30+(right-left-60)*(id+.5)/3,wobblePhase:random()*Math.PI*2})):[];
  }
  summary(){const tidy=this.goal==='tidy';return {v:1,kind:tidy?'tidy':this.kind,trigger:this.trigger,durationMs:clamp(Math.floor(this.now()-this.started),0,60000),spawned:tidy?0:this.bubbles.length,fishPopped:tidy?0:this.bubbles.filter(b=>b.status==='fishPopped').length,ownerPopped:tidy?0:this.bubbles.filter(b=>b.status==='ownerPopped').length,expired:tidy?0:this.bubbles.filter(b=>b.status==='expired').length,pushes:this.pushes,retrieved:this.retrieved,cleanup:this.cleanup,reason:this.reason};}
  end(phase,reason,cleanup='removed'){if(this.terminal)return false;this.terminal=phase;this.state='terminal';this.reason=reason;this.cleanup=cleanup;this.ball.vx=0;this.owner=null;return true;}
  cancel(reason='stop'){return this.end('interrupted',reason);}
  hit(p){if(this.terminal)return null;if(this.kind==='ball'&&Math.hypot(p.x-this.ball.x,p.y-this.ball.y)<=Math.max(12,this.radius))return 'ball';const b=this.bubbles.find(b=>b.status==='live'&&Math.hypot(p.x-b.x,p.y-b.y)<=Math.max(12,this.radius));return b?b.id:null;}
  pointer({phase,pointerId,x,y,at=this.now()}){
   if(this.terminal)return false;const hit=this.hit({x,y});
   if(phase==='down'){
    if(this.owner!==null||hit===null)return false;
    if(this.kind==='bubbles'){this.bubbles.find(b=>b.id===hit).status='ownerPopped';return true;}
    this.owner=pointerId;this.heldAt=this.now();this.ownerLast={x,at};this.ownerSpeed=0;this.state='waitingOwner';this.ball.vx=0;return true;
   }
   if(this.owner!==pointerId)return false;
   if(phase==='move'){this.ownerSpeed=clamp((x-this.ownerLast.x)/Math.max(.016,(at-this.ownerLast.at)/1000),-240,240);this.ownerLast={x,at};this.ball.x=clamp(x,this.region.left+this.radius,this.region.right-this.radius);return true;}
   if(phase==='up'){if(this.ownerExpired){this.cancel('ownerHoldTimeout');return true;}this.owner=null;this.ball.vx=this.ownerSpeed||0;this.state='active';this.phase='roll';this.phaseAt=this.now();this.lastProgress=this.now();this.best=Infinity;return true;}
   this.cancel('stop');return true;
  }
  step({dt,hand,grabbed=false,visible=true,connected=true}){
   if(this.terminal)return null;const now=this.now(),age=now-this.started;
   if(grabbed){this.cancel('ownerGrab');return null;}if(!visible||!connected){this.cancel(!visible?'hidden':'disconnected');return null;}
   if(this.owner!==null){if(now-this.heldAt>10000)this.ownerExpired=true;return {type:'stop'};}
   if(this.kind==='bubbles'){
    const delta=clamp(dt,0,.05);this.bubbleClock=(this.bubbleClock||0)+delta;for(const b of this.bubbles)if(b.status==='live'){b.old={x:b.x,y:b.y};b.y-=b.rise*delta;b.x=clamp(b.baseX+(Math.sin(this.bubbleClock*1.4+b.wobblePhase)-Math.sin(b.wobblePhase))*8,this.region.left+this.radius,this.region.right-this.radius);if(b.y< -this.radius)b.status='expired';}
    if(age>=18000)for(const b of this.bubbles)if(b.status==='live')b.status='expired';
    let b=this.bubbles.find(b=>b.status==='live');
    if(!b){this.end('completed','normal','cleared');return null;}
    if(hand)for(const target of this.bubbles)if(target.status==='live'){const from=this.previousHand&&target.old?{x:this.previousHand.x-target.old.x,y:this.previousHand.y-target.old.y}:null,to={x:hand.x-target.x,y:hand.y-target.y};if(Math.hypot(to.x,to.y)<=this.radius||segmentDistance(from,to,{x:0,y:0})<=this.radius){target.status='fishPopped';this.lastProgress=now;this.best=Infinity;}}
    this.previousHand=hand?{...hand}:null;b=this.bubbles.find(b=>b.status==='live');
    if(!b){this.end('completed','normal','cleared');return null;}const live=this.bubbles.filter(x=>x.status==='live');if(hand)live.sort((a,b)=>Math.hypot(a.x-hand.x,a.y-hand.y)-Math.hypot(b.x-hand.x,b.y-hand.y));b=live[0];return {type:'bubble',x:b.x,y:b.y,id:b.id};
   }
   if(age>45000){this.end('failed','timeout');return null;}
   if(age>=37000&&this.state!=='cleaning'){this.state='cleaning';this.phase='retrieve';this.lastProgress=now;this.best=Infinity;}
   if(this.state==='cleaning'){
    if(this.phase==='retrieve'){
     if(hand&&Math.hypot(hand.x-this.ball.x,hand.y-this.ball.y)<=this.radius){this.phase='carry';this.lastProgress=now;this.best=Infinity;return {type:'acquire'};}
     return this.approach(this.ball,hand,now);
    }
    if(hand){this.ball.x=hand.x;this.ball.y=hand.y;if(Math.hypot(hand.x-this.bag.x,hand.y-this.bag.y)<=this.radius){this.retrieved=true;this.end(this.pushes||this.goal==='tidy'?'completed':'failed',this.pushes||this.goal==='tidy'?'normal':'unreachable','stowed');return {type:'release'};}}
    return this.approach(this.bag,hand,now);
   }
   if(this.phase==='roll'){
    let remaining=clamp(dt,0,.05);while(remaining>0){const h=Math.min(remaining,1/120);remaining-=h;this.ball.x+=this.ball.vx*h;this.ball.vx*=Math.exp(-3*h);if(this.ball.x<this.region.left+this.radius||this.ball.x>this.region.right-this.radius){this.ball.x=clamp(this.ball.x,this.region.left+this.radius,this.region.right-this.radius);this.ball.vx*=-.3;}}
    if(Math.abs(this.ball.vx)<5&&now-this.phaseAt>400){this.ball.vx=0;this.lastProgress=now;this.best=Infinity;if(this.pushes>=3){this.state='cleaning';this.phase='retrieve';}else this.phase='approach';}return {type:'stop'};
   }
   if(hand&&(Math.hypot(hand.x-this.ball.x,hand.y-this.ball.y)<=this.radius||segmentDistance(this.previousHand,hand,this.ball)<=this.radius)){
    this.pushes++;this.ball.vx=(this.ball.x<(this.region.left+this.region.right)/2?1:-1)*160;this.phase='roll';this.phaseAt=now;this.previousHand=null;return {type:'stop'};
   }
   this.previousHand=hand?{...hand}:null;return this.approach(this.ball,hand,now);
  }
  approach(target,hand,now){const d=hand?Math.hypot(target.x-hand.x,target.y-hand.y):Infinity;if(d<this.best-.5){this.best=d;this.lastProgress=now;}if(now-this.lastProgress>6000){this.end('failed','unreachable');return null;}return {type:'approach',x:target.x,y:target.y};}
 }
 const api={PlaySession,segmentDistance};if(typeof module==='object')module.exports=api;else root.DesktopPlay=api;
})(globalThis);
