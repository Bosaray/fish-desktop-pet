(()=>{
 const api=window.desktopAPI,s=window.productionState;let task=null,platform=null,gen=0,last=performance.now(),nextAuto=last+14000,lastWrite=0,initialized=false;
 const c=()=>window.ctl,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),say=t=>{window.desktopCommandFailure=String(t);return false;},note=t=>api.state({x:c().pet.x,y:c().pet.gy,note:t});
 const ghost=document.getElementById('heldIcon'),life=new window.DesktopAutonomy();window.desktopLife=life;let lastStatus=0;
 const emit=(kind,detail='',gateApplied=false)=>window.desktopEvent?.(kind,detail,gateApplied);
 function cancel(reason='stop'){window.desktopHomeCancel?.(reason);window.desktopPlayCancel?.(reason);if(task?.evidenceId)window.desktopActionJournal?.fact('interaction',task.kind,'interrupted',task.evidenceId);window.desktopRemoteCancel?.();gen++;const old=task;task=null;platform=null;ghost.hidden=true;window.labObjectRelease?.();window.labStopFeed?.();if(c()&&!['air','drag'].includes(c().pet.mode)){c().pet.gy=c().pet.fy;c().pet.targetY=c().pet.fy;}
  if(old?.foodTicket)void api.call('feedStatus',{id:old.foodTicket,phase:'cancelled'}).catch(()=>{});if(old?.kind==='icon')void api.call('iconEnd',{commit:false}).catch(()=>{});if(old?.kind==='mouse')void api.call('mouseStop').catch(()=>{});nextAuto=performance.now()+16000;}
 window.desktopCancel=cancel;
 function rpc(t,op,args,done){if(t.pending)return;t.pending=true;api.call(op,args).then(v=>{if(task===t)done(v);}).catch(e=>{if(task===t){cancel();say(e.message||'这次没有完成，我先停一下。');}}).finally(()=>{t.pending=false;});}
 function visible(o,radius=250){const ctl=c(),x=o.x+24,y=o.y+20;return x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&Math.hypot(x-ctl.pet.x,y-ctl.pet.gy+160*(s.cfg.scale/.75))<radius&&(o.foodWidget&&o.topmost===true||!s.world.windows.some(w=>x>=w.x&&x<=w.x+w.w&&y>=w.y&&y<=w.y+w.h));}
 function route(hint=''){const b=c().bounds,top=clamp(b.minY+120,b.minY,b.floorY),bottom=b.floorY-30;let r=[{x:b.minX+40,y:top},{x:b.maxX-40,y:top},{x:b.maxX-40,y:bottom},{x:b.minX+40,y:bottom},{x:(b.minX+b.maxX)/2,y:(b.minY+b.floorY)/2}];if(hint.includes('右'))r.sort((a,b)=>b.x-a.x);if(hint.includes('左'))r.sort((a,b)=>a.x-b.x);if(hint.includes('上'))r.sort((a,b)=>a.y-b.y);if(hint.includes('下'))r.sort((a,b)=>b.y-a.y);if(hint.includes('附近'))r.unshift({x:c().pet.x,y:c().pet.gy});return r;}
 const foodName=kind=>kind==='fish'?'鱼鱼-小鱼干':'鱼鱼-奶油蛋糕';
 function foodAsk(t,reason='当前没有可见且未被窗口遮挡的投喂按钮'){window.labObjectRelease?.();c().act('stand');t.phase='help';t.walking=false;t.reason=reason;emit('food.help',reason+'；尚未吃到，等待调整方向或稍后重试。');}
 function start(kind,opts={}){if(kind==='food')kind='snackEat';window.desktopCommandFailure='';window.desktopCommandFailureCode='blocked';if(window.desktopPointerActive?.()&&!['stop','reset','rebound'].includes(kind)){window.desktopCommandFailure='主人正在抓取桌宠，暂缓其他动作';return false;}if(!c()||!initialized){window.desktopCommandFailure='桌宠尚未准备好';return false;}const old=task;
  if(['showFavorite','nestRest','snackEat'].includes(kind)){if(task||platform||window.desktopPlayActive?.()||window.desktopHomeActive?.())return false;cancel();task={kind:'home',phase:'preparing'};const activeTask=task;return window.desktopHomeStart(kind,opts).then(ok=>{if(task!==activeTask)return false;if(!ok){task=null;return false;}task.phase='active';return true;},()=>{if(task===activeTask)task=null;return false;});}
  if(['bubbles','ball'].includes(kind)){if(task||platform||window.desktopPlayActive?.())return false;cancel();if(!window.desktopPlayStart?.(kind,opts.trigger||'owner'))return false;task={kind:'play',phase:'active',age:0};life.cooldowns[kind]=performance.now()+Math.max(s.cfg.autonomyPolicy?.checkIntervalSec||60,s.cfg.autonomyPolicy?.behaviors?.[kind]?.cooldownSec||900)*1000;return true;}
  if(kind==='tidy'){return window.desktopPlayTidy?.()===true;}
  if(kind==='hint'&&old?.kind==='food'){window.labObjectRelease?.();old.phase='search';old.age=old.routeAge=0;old.index=0;old.walking=false;old.route=route(opts.text||'附近');emit('action.note','根据主人提供的方向恢复同一个找食物任务，不重新抽签。');return true;}
  cancel();const ctl=c(),b=ctl.bounds;ctl.holdRoam(60);window.selectReviewExpression(null);
  if(kind==='stop')return true;
  if(kind==='rebound'){ctl.resize?.();ctl.pet.x=clamp(ctl.pet.x,b.minX,b.maxX);ctl.pet.gy=ctl.pet.fy=clamp(ctl.pet.fy,b.minY,b.floorY);ctl.pet.targetY=ctl.pet.gy;ctl.act('stand');return true;}
  if(kind==='reset'){window.desktopAPI.positionTrace?.({reason:'explicit-reset',from:{x:ctl.pet.x,y:ctl.pet.fy},to:{x:b.maxX-80,y:b.floorY}});ctl.act('stand');ctl.pet.x=b.maxX-80;ctl.pet.gy=ctl.pet.fy=b.floorY;return true;}
  if(kind==='word'){return ctl.doWord(opts.word)===true;}
  if(kind==='feed'){return window.labFeed(opts.food)===true;}
  if(kind==='food'){task={kind,evidenceId:window.desktopActionJournal?.fact('interaction','food','started'),phase:'search',wanted:opts.food==='fish'?['fish']:opts.food==='cake'?['cake']:['fish','cake'],route:route(),index:0,routeAge:0,walking:false,age:0};emit('food.want','开始寻找桌面上的小鱼干或奶油蛋糕投喂按钮，尚未吃到。');return true;}
  if(kind==='mouse'){if(!s.cfg.allowMouse||s.cfg.ignoreMouse)return false;task={kind,evidenceId:window.desktopActionJournal?.fact('interaction','mouse','started'),phase:'approach',style:opts.style||'tug',age:0};return true;}
  if(kind==='icon'){
   if(!s.cfg.allowIcons||s.world.autoArrange){window.desktopCommandFailure=s.world.autoArrange?'桌面自动排列开启':'未允许搬动图标';say('桌面自动排列开着，或者搬图标还没允许，我先不搬。');return false;}
   const o=s.world.icons.filter(o=>!o.foodWidget&&visible(o,Math.max(innerWidth,innerHeight))).sort((a,b)=>Math.hypot(a.x-ctl.pet.x,a.y-ctl.pet.gy)-Math.hypot(b.x-ctl.pet.x,b.y-ctl.pet.gy))[0];
   if(!o){window.desktopCommandFailure='附近没有可见且够得到的图标';say('附近没有露出来、能拿到的桌面图标。');return false;}const side=o.x+24<ctl.pet.x?'left':'right';window.labObjectBegin(side);task={kind,evidenceId:window.desktopActionJournal?.fact('interaction','icon','started'),phase:'reach',object:o,side,age:0};return true;
  }
  if(kind==='push'||kind==='perch'){
   if(kind==='push'&&!s.cfg.allowWindows)return false;
   const exposed=w=>{const x=kind==='perch'?w.x+w.w*.4:ctl.pet.x<w.x+w.w/2?w.x:w.x+w.w,y=kind==='perch'?w.y:w.y+Math.min(110,w.h*.5);return !s.world.windows.slice(0,s.world.windows.indexOf(w)).some(front=>x>front.x&&x<front.x+front.w&&y>front.y&&y<front.y+front.h);};
   const perch=kind==='perch'?window.desktopChoosePerch?.(s.world.windows,b,ctl.pet,s.cfg.scale):null;
   const w=kind==='perch'?perch?.window:s.world.windows.filter(w=>(kind==='push'?s.cfg.allowWindows&&w.w<innerWidth-10&&w.h<innerHeight-10:w.y>b.minY+15)&&exposed(w)).sort((a,d)=>Math.hypot(a.x+a.w/2-ctl.pet.x,a.y-ctl.pet.gy)-Math.hypot(d.x+d.w/2-ctl.pet.x,d.y-ctl.pet.gy))[0];
   if(!w){window.desktopCommandFailure=kind==='push'?'没有可推动的窗口':'没有可站稳的窗沿';say(kind==='push'?'附近没有适合推动的普通窗口。':'附近没有够得着、能站稳的窗沿。');return false;}
   if(kind==='perch'){ctl.walkTo(clamp(perch.x,b.minX,b.maxX),false,'perch',Math.min(b.floorY,w.y+55));task={kind,perchOffset:perch.x-w.x,evidenceId:window.desktopActionJournal?.fact('interaction','perch','started'),phase:'approach',object:{...w},age:0};}
   else{let dir=ctl.pet.x<w.x+w.w/2?1:-1;const room=d=>d>0?innerWidth-w.x-w.w:w.x;if(room(dir)<24&&room(-dir)>=24)dir=-dir;
    if(room(dir)<24){window.desktopCommandFailure='窗口两侧都没有足够推动空间';window.labObjectRelease();return false;}
    window.labObjectBegin(dir>0?'right':'left');window.labObjectAcquire();task={kind,evidenceId:window.desktopActionJournal?.fact('interaction','push','started'),phase:'prepare',object:{...w},dir,age:0};}return true;
  }
  if(kind==='yield'){ctl.walkTo(ctl.pet.x<innerWidth/2?b.maxX-40:b.minX+40,true,'yield');return true;}
 }
 window.desktopCommand=start;
 const localMessages={empty:'盒子还是空的，先点“存一份小鱼干”或“存一份蛋糕”吧。',noFavorite:'收藏图片还没准备好，稍后再试试。',differentSupport:'这个位置够不到，把小窝或零食盒放近一点吧。',storage:'这次没能保存记录，先停一下。',timeout:'这次走过去花了太久，先放近一点吧。',unreachable:'这边够不到，帮我把东西放近一点吧。',blocked:'我这会儿还在忙，等动作停下来再试试吧。'};
 window.desktopLocalResult=(name,ok,code)=>{const clean=ok?code:(Object.hasOwn(localMessages,code)?code:'blocked');api.localResult?.({name,ok:ok===true,code:clean});if(!ok)window.labDialogue?.receive(localMessages[clean]);};
 window.desktopLocalCommand=async(kind,opts={})=>{if(kind==='food')kind='snackEat';if(!['showFavorite','nestRest','snackEat'].includes(kind))return start(kind,opts);let ok=false;try{ok=await start(kind,{...opts,local:true});}catch{}window.desktopLocalResult(kind,ok===true,ok===true?'accepted':window.desktopCommandFailureCode||'blocked');return ok===true;};
 api.onEvent(({type,data})=>{if(type==='command')void window.desktopLocalCommand(data.kind,data);if(type==='mouse-release'){window.labMouseRelease?.();if(task?.kind==='mouse')task=null;}});
 window.desktopBoot.then(()=>{initialized=true;});
 window.desktopBeforeRender=()=>{if(task?.kind==='icon'&&task.face!=null&&['lift','carry','put'].includes(task.phase)){c().pet.facing=c().pet.faceVis=task.face;}};
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;life.tick(dt,{visible:s.visible!==false,connected:s.connected===true,paused:!s.cfg.autonomy||!s.cfg.autonomyPolicy?.enabled});if(now-lastStatus>10000){lastStatus=now;api.activity?.({...life.snapshot(),paused:!s.cfg.autonomy,pose:{mode:c()?.pet.mode||'',expression:c()?.pet.expr||'',gesture:c()?.pet.pulse?.kind||''},permissions:{mouse:s.cfg.allowMouse,icons:s.cfg.allowIcons,windows:s.cfg.allowWindows},task:task?{kind:task.kind,phase:task.phase}:null});}if(!task)window.desktopHomeFrame?.(dt);const ctl=c();if(task?.kind==='home'&&task.phase==='active'&&!window.desktopHomeFrame?.(dt))task=null;if(!ctl||!initialized){requestAnimationFrame(frame);return;}
  if(platform&&!task&&ctl.pet.mode!=='drag'){
   const current=s.world.windows.find(w=>w.id===platform.id),from={x:ctl.pet.x,y:ctl.pet.fy};
   const invalid=!current||current.y<ctl.bounds.minY||current.y>ctl.bounds.floorY||Math.max(ctl.bounds.minX,current.x+25)>Math.min(ctl.bounds.maxX,current.x+current.w-25)||Math.hypot(current.x-platform.x,current.y-platform.y)>72;
   if(invalid){platform=null;ctl.pet.mode='air';ctl.pet.airKind='drop';ctl.pet.vy=0;ctl.pet.vx=0;ctl.pet.gy=ctl.bounds.floorY;ctl.pet.targetY=ctl.bounds.floorY;window.desktopAPI.positionTrace?.({reason:'perch-detach',from,to:from});}
   else{const tx=clamp(current.x+(platform.offsetX??ctl.pet.x-platform.x),Math.max(ctl.bounds.minX,current.x+25),Math.min(ctl.bounds.maxX,current.x+current.w-25)),ty=current.y,limit=180*dt;
    ctl.pet.x+=clamp(tx-ctl.pet.x,-limit,limit);ctl.pet.fy+=clamp(ty-ctl.pet.fy,-limit,limit);ctl.pet.gy=ctl.pet.fy;platform.x=current.x;platform.y=current.y;
    if(platform.restPhase==='sit'&&now>=platform.sleepAt){ctl.doWord('sleep');platform.restPhase='sleep';}
   }
  }
  if(task){const t=task;t.age+=dt;
   if(t.kind==='play'){if(!window.desktopPlayFrame?.(dt)){task=null;nextAuto=now+16000;}}
   else if(t.kind==='mouse'){
    if(t.age>18){cancel();say('这次没有碰到，我先松手啦。');}
    else {const p=window.labMouseStep({x:s.input.x/innerWidth,y:s.input.y/innerHeight,pulling:t.phase==='pull',k:t.phase==='pull'?Math.min(1,t.age/(t.style==='run'?3:1.2)):0});
     if(p.ok&&!t.pending){const point={x:p.x*innerWidth,y:p.y*innerHeight};if(t.phase==='approach'&&Math.hypot(point.x-s.input.x,point.y-s.input.y)<12)rpc(t,'mouseContact',{point},r=>{if(r.held){window.labMouseBegin(t.style);t.phase='pull';t.age=0;}});
      else if(t.phase==='pull'){rpc(t,'mouseMove',{point},r=>{if(!r.held||p.done){window.desktopActionJournal?.fact('interaction','mouse','ended',t.evidenceId);t.evidenceId=null;cancel();note('招手碰到鼠标，和你玩了一小会儿。');}});}}
    }
   }
   else if(t.kind==='icon'){
    const o=t.object;if(t.age>20){cancel();say('这个图标暂时够不到，我先停一下。');}
    else if(t.phase==='reach'){
     const p=window.labObjectWalk(o.x+24,o.y+20);if(p?.reachable===false&&t.age>2){cancel();say('图标太靠边，我够不到。');}
     else if(p&&Math.hypot(p.x-o.x-24,p.y-o.y-20)<13)rpc(t,'iconBegin',{key:o.key,point:p},r=>{t.phase='lift';t.age=0;t.face=ctl.pet.facing;window.labObjectAcquire();ghost.querySelector('img').src=r.image;ghost.querySelector('span').textContent=r.name;ghost.hidden=false;});
    }else {
     const p=window.labObjectPoint();if(p){ghost.style.left=p.x-24+'px';ghost.style.top=p.y-20+'px';if(now-lastWrite>70&&!t.pending&&!(t.phase==='put'&&t.age>.4)){lastWrite=now;rpc(t,'iconMove',{point:p},()=>{});}}
     if(t.phase==='lift'&&t.age>.65){const b=ctl.bounds,dir=Math.sign(t.face||1);t.target={x:clamp(ctl.pet.x+dir*(110+Math.random()*90),b.minX+15,b.maxX-15),y:clamp(ctl.pet.gy+(Math.random()-.5)*50,b.minY+10,b.floorY-10)};t.phase='carry';t.age=0;t.stall=0;t.dist=Infinity;window.labObjectWalkRoot(t.target.x,t.target.y);}
     else if(t.phase==='carry'){
      const d=Math.hypot(ctl.pet.x-t.target.x,ctl.pet.gy-t.target.y);t.stall=d<t.dist-.1?0:t.stall+dt;t.dist=d;
      if(d<10||t.stall>1.3||t.age>7){ctl.act('stand');t.phase='put';t.age=0;}else if(ctl.pet.mode!=='walk')window.labObjectWalkRoot(t.target.x,t.target.y);
     }else if(t.phase==='put'&&t.age>.4&&!t.pending){rpc(t,'iconEnd',{commit:true},()=>{window.desktopActionJournal?.fact('interaction','icon','completed',t.evidenceId);task=null;ghost.hidden=true;window.labObjectRelease();note('拿起一个桌面图标，又挑了个位置轻轻放下。');nextAuto=now+16000;});}
    }
   }
   else if(t.kind==='push'){
    const w=t.object,dir=t.dir;if(t.age>16){cancel();}
    else if(t.phase==='prepare'&&t.age>.65){t.phase='contact';t.age=0;}
    else if(t.phase==='contact'){
     const p=window.labObjectWalk(dir>0?w.x:w.x+w.w,w.y+Math.min(110,w.h*.5));if(p?.reachable===false&&t.age>3){cancel();say('这个窗口侧边太高或太靠边，我够不到。');}
     else if(p&&Math.hypot(p.x-(dir>0?w.x:w.x+w.w),p.y-w.y-Math.min(110,w.h*.5))<13){const room=dir>0?innerWidth-w.x-w.w:w.x;const limit=dir>0?ctl.bounds.maxX-15-ctl.pet.x:ctl.pet.x-ctl.bounds.minX-15;
      t.distance=Math.min(180,room,limit);if(t.distance<12){cancel();return;}t.phase='move';t.age=0;t.previous=p.x;t.startX=ctl.pet.x;t.target=t.startX+dir*t.distance;t.targetY=ctl.pet.gy;t.dist=Infinity;t.stall=0;t.moved=0;t.windowStart=w.x;window.labObjectWalkRoot(t.startX+dir*Math.min(8,t.distance),t.targetY);}
    }else if(t.phase==='move'){
     const progress=Math.min(1,t.age/4.5),stepTarget=t.startX+dir*Math.min(t.distance,t.distance*progress+8);window.labObjectWalkRoot(stepTarget,t.targetY);
     const p=window.labObjectPoint(),d=Math.abs(ctl.pet.x-t.target);t.stall=d<t.dist-.1?0:t.stall+dt;t.dist=d;
     if(p&&!t.pending&&now-lastWrite>70){lastWrite=now;const delta=p.x-t.previous;t.previous=p.x;if(Math.abs(delta)>30){cancel();}else{const x=clamp(w.x+delta,0,Math.max(0,innerWidth-w.w));rpc(t,'windowMove',{id:w.id,hand:p,point:{x,y:w.y}},()=>{w.x=x;t.moved=Math.max(t.moved,Math.abs(x-t.windowStart));});}}
     if(task===t&&t.stall>1.3&&t.age>1){cancel();}
     else if(task===t&&!t.pending&&((t.age>=4.5&&d<10)||t.age>6.5)){task=null;ctl.act('stand');window.labObjectRelease();window.desktopActionJournal?.fact('interaction','push',t.moved>2?'completed':'failed',t.evidenceId);if(t.moved>2)note('持续推了一会儿，把窗口慢慢挪开了。');nextAuto=now+16000;}
    }
   }
   else if(t.kind==='perch'){
    const w=s.world.windows.find(w=>w.id===t.object.id);if(!w||t.age>16){cancel();}
    else if(t.phase==='approach'&&Math.abs(ctl.pet.x-clamp(w.x+t.perchOffset,ctl.bounds.minX,ctl.bounds.maxX))<18&&Math.abs(ctl.pet.gy-Math.min(ctl.bounds.floorY,w.y+55))<15){ctl.act('stand');ctl.pet.mode='air';ctl.pet.modeT=0;ctl.pet.airKind='jump';ctl.pet.gy=w.y;ctl.pet.vy=-520;ctl.pet.vx=0;t.phase='jump';}
    else if(t.phase==='jump'&&ctl.pet.mode!=='air'){platform={...w,offsetX:ctl.pet.x-w.x,restPhase:'sit',sleepAt:now+3000};task=null;ctl.pet.gy=ctl.pet.fy=w.y;ctl.doWord('sit');window.desktopActionJournal?.fact('interaction','perch','completed',t.evidenceId);note('已经在窗沿坐下，接着会在这里睡觉。');}
   }
   else if(t.kind==='food'){
    if(t.phase==='search'){
     const o=s.world.icons.find(o=>o.name.replace(/\.txt$/i,'')===foodName(t.wanted[0])&&visible(o,Infinity));
     if(o){ctl.act('stand');t.object={...o};t.phase='reach';t.age=0;window.labObjectBegin(o.x+24<ctl.pet.x?'left':'right');window.LAB_MISCHIEF=false;emit('food.found','发现了可见的投喂按钮，准备走过去，尚未取到或吃下。');}
     else if(t.index>=t.route.length||t.age>35)foodAsk(t);
     else{t.routeAge+=dt;const p=t.route[t.index];if(!t.walking){ctl.walkTo(p.x,false,'food-search',p.y);t.walking=true;}if(Math.hypot(ctl.pet.x-p.x,ctl.pet.gy-p.y)<18||t.routeAge>6){t.index++;t.routeAge=0;t.walking=false;}}
    }else if(t.phase==='reach'){
     const o=s.world.icons.find(o=>o.key===t.object.key);if(!o||!visible(o,Infinity)){window.labObjectRelease();t.phase='search';t.walking=false;t.age=0;}
     else {t.object={...o};const p=window.labObjectWalk(o.x+24,o.y+20);if(p?.reachable===false&&t.age>3)foodAsk(t,'已经看到按钮，但手部当前无法够到接触点');else if(t.age>20)foodAsk(t,'已经看到按钮，走近按钮的过程超时');
      else if(p&&Math.hypot(p.x-o.x-24,p.y-o.y-20)<13){ctl.act('stand');t.phase='press';t.age=0;}}
    }else if(t.phase==='press'&&t.age>.35){const p=window.labObjectPoint();rpc(t,'redeem',{key:t.object.key,point:p},r=>{window.labObjectRelease();t.foodTicket=r.widget?r.id:null;if(window.labFeed(r.kind)){t.phase='eat';t.age=0;note('自己找到了'+(r.kind==='fish'?'小鱼干':'奶油蛋糕')+'，已经开始吃，尚未确认吃完。');}else{if(t.foodTicket){void api.call('feedStatus',{id:t.foodTicket,phase:'cancelled'}).catch(()=>{});t.foodTicket=null;}foodAsk(t);}});}
    else if(t.phase==='eat'&&t.age>.5&&!window.labFeeding()){
     if(t.foodTicket){void api.call('feedStatus',{id:t.foodTicket,phase:'completed'}).catch(()=>{});t.foodTicket=null;}t.wanted.shift();if(t.wanted.length){t.phase='search';t.age=t.routeAge=0;t.index=0;t.walking=false;t.route=route();emit('food.eaten','已实际兑换并吃下小鱼干，将继续寻找奶油蛋糕。');}else{window.desktopActionJournal?.fact('interaction','food','completed',t.evidenceId);task=null;ctl.act('stand');emit('food.eaten','本次选择的食物均已实际兑换并完成进食动画。');nextAuto=now+90000;}
    }
   }
  }
  if(!window.desktopPointerActive?.()&&!task&&!platform&&s.cfg.autonomy&&!s.cfg.ignoreMouse&&s.visible!==false&&s.connected===true&&now>nextAuto&&!ctl.busy()&&!window.labFeeding()&&!window.desktopRemotePending?.()){
   const policy=s.cfg.autonomyPolicy,choices=['walk','word','rest','chat','diary','bubbles','ball'];
   const hour=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',hour:'numeric',hourCycle:'h23'}).format(new Date()));const quiet=policy&&(policy.quietFrom===policy.quietTo?false:policy.quietFrom<policy.quietTo?hour>=policy.quietFrom&&hour<policy.quietTo:hour>=policy.quietFrom||hour<policy.quietTo);if(quiet)choices.splice(choices.indexOf('bubbles'),2);
   if(!quiet){for(const id of ['showFavorite','nestRest'])if(window.desktopHomeEligible?.(id))choices.push(id);}
   const stocked=life.satiety<=45&&policy?.behaviors?.snackEat?.enabled&&window.desktopHomeEligible?.('snackEat');if(stocked&&!quiet)choices.push('snackEat');// Empty boxes and hunger do not request QQ help.
   if(s.cfg.allowIcons&&!s.world.autoArrange&&s.world.icons.some(o=>visible(o)))choices.push('icon');
   if(s.cfg.allowWindows&&s.world.windows.length)choices.push('push','perch');
   if(s.cfg.allowMouse&&Math.hypot(s.input.x-ctl.pet.x,s.input.y-ctl.pet.gy+100)<180)choices.push('mouse');
   life.check(policy,choices,id=>{
    let ok=false;
    if(id==='walk'){const b=ctl.bounds;ok=ctl.walkTo(b.minX+Math.random()*(b.maxX-b.minX),false,'roam',clamp(ctl.pet.gy+(Math.random()-.5)*100,b.minY,b.floorY))===true;}
    else if(id==='word'){const result=window.desktopRemoteAction?.({action:'motion',name:['wave','dance','look'][Math.floor(Math.random()*3)],expiresAt:Date.now()+5500});if(result&&typeof result.then==='function')return {outcome:'preparing',detail:'先走到宽敞的位置再做动作',completion:result};ok=result===true;}
    else if(id==='rest')ok=ctl.doWord('sit')===true;
    else if(id==='chat'||id==='diary'||id==='askFood'){
     if(id==='chat')emit('chat.idle','桌宠在线且空闲，可以根据已有共同经历判断是否想找主人聊天；没有合适内容就沉默。',true);
     if(id==='diary')emit('diary.want','桌宠在线且空闲，可依据真实记忆写一段短随笔；无新想法可以沉默。',true);
     if(id==='askFood')emit('food.want','当前有些想吃小鱼干或奶油蛋糕，可以向主人表达想法；并无健康或生命危险。',true);
     return {outcome:'requested',detail:'已提交鱼鱼判断，是否发言以实际发送为准'};
    }else{const result=start(id,{trigger:'autonomy',style:Math.random()<.5?'tug':'run'});if(result&&typeof result.then==='function')return {outcome:'preparing',completion:result};ok=result===true;}
    return {outcome:ok?'started':'blocked',detail:ok?({walk:'已开始闲逛',word:'已开始动作',rest:'已坐下休息'}[id]||'互动任务已开始'):(window.desktopCommandFailure||'当前动作忙碌，未受理')};
   });
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
