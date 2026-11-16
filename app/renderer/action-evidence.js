(function(root){
 class ActionEvidence {
  constructor({controller,emit,now=Date.now,random=Math.random}={}){this.c=controller;this.emit=emit;this.now=now;this.prefix='act-'+now().toString(36)+'-'+random().toString(36).slice(2,10);this.seq=0;this.active=new Map();this.facing=null;}
  fact(channel,name,phase,actionId,touch,play){const id=this.prefix+'-'+(++this.seq);const row={id,actionId:actionId||id,at:this.now(),channel,name,phase,...(touch?{touch}:{}),...(play?{play}:{})};this.emit(row);return row.actionId;}
  point(){const p=this.c.pet,b=this.c.bounds;return {x:Math.round(Math.max(0,Math.min(1,p.x/Math.max(1,b.W||innerWidth)))*1000)/1000,y:Math.round(Math.max(0,Math.min(1,p.fy/Math.max(1,b.H||innerHeight)))*1000)/1000};}
  cancelTouch(reason){if(this.touchSession)this.cancelReason=reason;}
  touch(event){
   if(!['grab','drop','throw','poke','pet'].includes(event?.kind))return;
   const at=this.now(),to=this.point();
   if(event.kind==='grab'){
    if(this.touchSession)return;if(this.landing){this.fact('interaction','drag','interrupted',this.landing.id,{...this.landing.touch,kind:'cancel',reason:'regrab'});this.landing=null;}
    const id=this.fact('interaction','drag','started',null,{kind:'grab',from:to,to,durationMs:0});this.touchSession={id,at,from:to};this.cancelReason='';return;
   }
   if(event.kind==='poke'||event.kind==='pet'){this.fact('interaction','poke','completed',null,{kind:'poke',from:to,to,durationMs:0});return;}
   const t=this.touchSession;if(!t)return;this.touchSession=null;
   const cancelled=!!this.cancelReason,touch={kind:cancelled?'cancel':event.kind,from:t.from,to,durationMs:Math.max(0,Math.min(600000,at-t.at)),...(cancelled?{reason:this.cancelReason}:{})};
   this.fact('interaction','drag',cancelled?'interrupted':'ended',t.id,touch);this.cancelReason='';
   this.landing=cancelled?null:{id:t.id,at,touch};
  }
  update(channel,value){const old=this.active.get(channel);if(old&&old.key===value?.key){Object.assign(old,value);return;}
   if(old){this.active.delete(channel);const phase=old.continuous?'ended':old.done?.()?'completed':'interrupted';this.fact(channel,old.name,phase,old.id);}
   if(value){value.id=this.fact(channel,value.name,'started');this.active.set(channel,value);}
  }
  interrupt(){for(const [channel,item] of this.active)this.fact(channel,item.name,'interrupted',item.id);this.active.clear();}
  sample({feeding=false}={}){const c=this.c,p=c.pet,T=c.time||0,mode=p.mode;
   if(this.landing){if(this.now()-this.landing.at>10000)this.landing=null;else if(!['air','crouch','drag'].includes(mode)){const l=this.landing;this.landing=null;this.fact('interaction','drag','completed',l.id,{...l.touch,kind:'landed',to:this.point()});}}
   const moving=['walk','run'].includes(mode);
   const target=moving?{x:p.target,y:p.targetY??p.gy}:null;
   this.update('movement',moving?{key:mode+'/'+(p.walkId||''),name:mode,done:()=>Math.hypot(p.x-target.x,p.gy-target.y)<1.51}:null);
   const pulse=feeding?null:p.pulse;this.update('gesture',pulse?{key:pulse.kind+'/'+pulse.t0,name:pulse.kind,done:()=>c.time>=pulse.t0+pulse.dur-1e-6}:null);
   const expression=!feeding&&p.expr&&p.expr!=='neutral'&&T<p.exprUntil?p.expr:null,until=p.exprUntil;
   this.update('expression',expression?{key:expression+'/'+until,name:expression,done:()=>c.time>=until-1e-6}:null);
   let body=null;
   if(['dance','look','dizzy'].includes(mode)){const duration={dance:4.8,look:2.6,dizzy:3}[mode],start=T-p.modeT;body={key:mode+'/'+start.toFixed(3),name:mode,done:()=>c.time>=start+duration-1e-6};}
   else if(['sleep','sit','drag'].includes(mode)&&!(mode==='drag'&&this.touchSession))body={key:mode,name:mode,continuous:true};
   else if(['crouch','air','land'].includes(mode)){
    const old=this.active.get('body'),name=old&&['jump','fall'].includes(old.name)?old.name:mode==='crouch'?'jump':'fall';
    body={key:name,name,landed:mode==='land'||old?.landed,done:()=>body.landed};
   }
   this.update('body',body);
   if(mode==='idle'&&this.lastMode==='wake')this.fact('body','stand','completed');this.lastMode=mode;
   if(this.facing!==null&&p.facing!==this.facing&&!moving&&mode!=='drag')this.fact('gesture','turn','completed');this.facing=p.facing;
  }
 }
 if(typeof module==='object')module.exports={ActionEvidence};else root.DesktopActionEvidence=ActionEvidence;
})(globalThis);
