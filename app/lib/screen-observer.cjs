'use strict';
function frameChanged(previous,next){
  if(!previous||previous.length!==next.length)return true;
  let changed=0,total=0;
  // The tiny bottom strip includes the clock/taskbar and is not a useful change.
  for(let i=0;i<Math.floor(next.length*.88);i+=4){total++;if((Math.abs(previous[i]-next[i])+Math.abs(previous[i+1]-next[i+1])+Math.abs(previous[i+2]-next[i+2]))/3>20)changed++;}
  return changed/Math.max(1,total)>.07;
}
function createScreenObserver({getSources,displayId,allowed,send,shouldObserve=()=>true,now=Date.now,log=()=>{}}){
  let busy=false,lastFrame=null,lastAt=0;
  const source=async size=>{
    const sources=await getSources({types:['screen'],thumbnailSize:size,fetchWindowIcons:false});
    const selected=sources.find(s=>String(s.display_id)===String(displayId()))||sources[0];
    if(!selected||selected.thumbnail.isEmpty())throw Error('没有可用屏幕画面');return selected;
  };
  return {
    async capture({explicit=false}={}){
      if(!allowed(explicit))return {ok:false,error:'paused'};
      const selected=await source({width:1280,height:720});if(!allowed(explicit))return {ok:false,error:'paused'};
      const size=selected.thumbnail.getSize();return {ok:true,at:now(),displayId:String(selected.display_id),width:size.width,height:size.height,jpeg:'data:image/jpeg;base64,'+selected.thumbnail.toJPEG(72).toString('base64')};
    },
    async sample(){
      if(busy||!allowed()||now()-lastAt<300000)return;busy=true;
      try{
        const selected=await source({width:64,height:36}),bitmap=selected.thumbnail.toBitmap();
        if(!lastFrame){lastFrame=Buffer.from(bitmap);return;}
        if(!frameChanged(lastFrame,bitmap)||!shouldObserve())return;
        const capture=await this.capture();if(capture.ok&&allowed()&&send(capture)){lastAt=now();lastFrame=Buffer.from(bitmap);}
      }catch{log('屏幕观察本次没有取得画面');}finally{busy=false;}
    }
  };
}
module.exports={createScreenObserver,frameChanged};
