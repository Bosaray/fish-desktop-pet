'use strict';
function checkedPlay(p,name,phase){
 if(!p||p.v!==1||!['bubbles','ball','tidy'].includes(name)||p.kind!==name||!['owner','autonomy'].includes(p.trigger))return null;
 const out={v:1,kind:name,trigger:p.trigger};
 for(const [key,max]of [['durationMs',60000],['spawned',3],['fishPopped',3],['ownerPopped',3],['expired',3],['pushes',3]]){if(!Number.isInteger(p[key])||p[key]<0||p[key]>max)return null;out[key]=p[key];}
 if(typeof p.retrieved!=='boolean'||!['none','cleared','stowed','removed'].includes(p.cleanup)||!['normal','ownerGrab','ownerHoldTimeout','stop','superseded','hidden','disconnected','geometryChanged','unreachable','timeout','renderUnavailable','restart'].includes(p.reason))return null;
 Object.assign(out,{retrieved:p.retrieved,cleanup:p.cleanup,reason:p.reason});
 if(name==='bubbles'&&(p.pushes||p.retrieved||p.cleanup==='stowed'||p.fishPopped+p.ownerPopped+p.expired>p.spawned))return null;
 if(name!=='bubbles'&&(p.spawned||p.fishPopped||p.ownerPopped||p.expired))return null;
 if(phase==='completed'&&(name==='bubbles'?(p.cleanup!=='cleared'||p.spawned!==3||p.fishPopped+p.ownerPopped+p.expired!==3):name==='ball'?(!p.retrieved||p.cleanup!=='stowed'||p.pushes<1):!['stowed','cleared','removed'].includes(p.cleanup)))return null;
 return out;
}
module.exports={checkedPlay};
