(function(){
 const NS='http://www.w3.org/2000/svg';let layer=null;
 const node=(tag,attrs)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 window.desktopPlayDraw=session=>{
  if(!layer){const stage=document.getElementById('stage');layer=node('svg',{'pointer-events':'none','aria-hidden':'true',width:'100%',height:'100%'});layer.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none';stage.appendChild(layer);}
  layer.replaceChildren();if(!session||session.terminal)return;
  if(session.kind==='ball'){
   const b=session.bag,closed=session.phase==='carry'&&Math.hypot(session.ball.x-b.x,session.ball.y-b.y)<session.radius*3;
   const sprite=(file,box,bounds)=>{const frame=node('svg',{x:box.x,y:box.y,width:box.w,height:box.h,viewBox:bounds.join(' '),overflow:'hidden'});frame.appendChild(node('image',{href:'assets/props/'+file,width:512,height:512}));layer.appendChild(frame);};
   // Shared source frame and baseline keep the pouch stationary between states.
   sprite('toy-bag-'+(closed?'closed':'open')+'.png',{x:b.x-26,y:b.y-30,w:52,h:48},[35,125,440,340]);
   sprite('toy-ball.png',{x:session.ball.x-session.radius,y:session.ball.y-session.radius,w:session.radius*2,h:session.radius*2},[80,80,352,352]);
  }else for(const b of session.bubbles)if(b.status==='live'){
   layer.appendChild(node('circle',{cx:b.x,cy:b.y,r:session.radius,fill:'#b5eaff','fill-opacity':.2,stroke:'#aee8ff','stroke-width':2}));
   layer.appendChild(node('circle',{cx:b.x-session.radius*.3,cy:b.y-session.radius*.35,r:2,fill:'#fff'}));
  }
 };
})();
