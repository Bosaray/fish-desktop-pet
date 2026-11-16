'use strict';
function checkedHome(p,name,phase){
 if(!p||p.v!==1||p.kind!==name||!['showFavorite','nestRest','snackEat'].includes(name)||!['owner','autonomy'].includes(p.trigger)||!['normal','stop','ownerGrab','disconnected','hidden','geometryChanged','timeout','restart','unreachable','storage','superseded'].includes(p.reason)||!['none','returned','removed'].includes(p.cleanup)||!Number.isInteger(p.durationMs)||p.durationMs<0||p.durationMs>90000)return null;
 const out={v:1,kind:name,trigger:p.trigger,durationMs:p.durationMs,reason:p.reason,cleanup:p.cleanup};
 if(name==='showFavorite'){if(!/^[a-f0-9]{64}$/.test(p.sourceHash)||!Number.isInteger(p.shownMs)||p.shownMs<0||p.shownMs>20000||typeof p.returned!=='boolean')return null;Object.assign(out,{sourceHash:p.sourceHash,assetId:p.sourceHash,shownMs:p.shownMs,returned:p.returned,sourceAnimated:p.sourceAnimated===true,frameIndex:0});if(phase==='completed'&&(p.shownMs<5000||!p.returned))return null;}
 if(name==='nestRest'){if(!Number.isInteger(p.restedMs)||p.restedMs<0||p.restedMs>60000||typeof p.arrived!=='boolean'||typeof p.cushionReturned!=='boolean')return null;Object.assign(out,{propId:'nest',restedMs:p.restedMs,arrived:p.arrived,cushionReturned:p.cushionReturned});if(phase==='completed'&&(!p.arrived||p.restedMs<20000||!p.cushionReturned))return null;}
 if(name==='snackEat'){if(typeof p.itemId!=='string'||p.itemId.length>80||!['fish','cake'].includes(p.food)||typeof p.opened!=='boolean'||typeof p.ate!=='boolean'||!Number.isSafeInteger(p.inventoryRevision)||p.inventoryRevision<0)return null;Object.assign(out,{itemId:p.itemId,food:p.food,opened:p.opened,ate:p.ate,inventoryRevision:p.inventoryRevision});if(phase==='completed'&&(!p.opened||!p.ate))return null;}
 return out;
}
module.exports={checkedHome};
