(function(root){
 function choose(windows,bounds,pet,scale=.75){const pad=Math.max(24,60*scale/.75),candidates=[];
  for(let i=0;i<windows.length;i++){const w=windows[i];if(w.y<=bounds.minY+15||w.y>bounds.floorY)continue;let segments=[[Math.max(bounds.minX,w.x+pad),Math.min(bounds.maxX,w.x+w.w-pad)]];
   for(const front of windows.slice(0,i)){if(w.y<front.y||w.y>front.y+front.h)continue;const left=front.x-pad,right=front.x+front.w+pad;segments=segments.flatMap(([a,b])=>right<=a||left>=b?[[a,b]]:[[a,Math.min(b,left)],[Math.max(a,right),b]].filter(([x,y])=>y-x>=8));}
   for(const [a,b]of segments)if(b-a>=8){const x=Math.max(a,Math.min(b,pet.x));candidates.push({window:w,x,distance:Math.hypot(x-pet.x,w.y-pet.gy)});}
  }return candidates.sort((a,b)=>a.distance-b.distance)[0]||null;
 }root.desktopChoosePerch=choose;if(typeof module!=='undefined')module.exports={choose};
})(typeof window==='undefined'?globalThis:window);
