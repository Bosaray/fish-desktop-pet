(function(){
 const NS='http://www.w3.org/2000/svg';let layer=null;
 const node=(tag,attrs)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 window.desktopPlayDraw=session=>{
  if(!layer){const stage=document.getElementById('stage');layer=node('svg',{'pointer-events':'none','aria-hidden':'true',width:'100%',height:'100%'});layer.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none';stage.appendChild(layer);}
  layer.replaceChildren();if(!session||session.terminal)return;
  if(session.kind==='ball'){
   const b=session.bag;layer.appendChild(node('path',{d:`M ${b.x-19} ${b.y-5} q 19 -10 38 0 l -4 23 q -15 9 -30 0 Z`,fill:'#506f90',stroke:'#bdddec','stroke-width':2}));
   layer.appendChild(node('circle',{cx:session.ball.x,cy:session.ball.y,r:session.radius,fill:'#f8bb66',stroke:'#fff0bc','stroke-width':2}));
   layer.appendChild(node('path',{d:`M ${session.ball.x-session.radius+2} ${session.ball.y} h ${session.radius*2-4}`,stroke:'#d48158','stroke-width':3}));
  }else for(const b of session.bubbles)if(b.status==='live'){
   layer.appendChild(node('circle',{cx:b.x,cy:b.y,r:session.radius,fill:'#b5eaff','fill-opacity':.2,stroke:'#aee8ff','stroke-width':2}));
   layer.appendChild(node('circle',{cx:b.x-session.radius*.3,cy:b.y-session.radius*.35,r:2,fill:'#fff'}));
  }
 };
})();
