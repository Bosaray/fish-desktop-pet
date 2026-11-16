'use strict';
const DESKTOP_BEHAVIORS={showFavorite:'举收藏表情包',nestRest:'回小窝',snackEat:'吃盒里零食',bubbles:'戳泡泡',ball:'玩球并收好',walk:'闲逛',word:'可爱动作',rest:'坐下 / 休息',mouse:'碰到后玩鼠标',icon:'搬动图标',push:'推动窗口',perch:'窗沿休息',food:'自己找食物',askFood:'向 QQ 求投喂',chat:'QQ 主动聊天',diary:'模型随笔',observe:'观察后发言'};
const defaults={showFavorite:[10,1800],nestRest:[15,1200],snackEat:[30,600],bubbles:[15,900],ball:[10,1200],walk:[20,120],word:[15,120],rest:[10,300],mouse:[5,900],icon:[3,900],push:[3,900],perch:[5,600],food:[20,600],askFood:[15,1800],chat:[5,3600],diary:[5,10800],observe:[5,900]};
function defaultDesktopPolicy(){return {version:1,enabled:true,checkIntervalSec:60,maxQQPerHour:2,quietFrom:23,quietTo:8,captureAllowed:true,automaticObservation:true,behaviors:Object.fromEntries(Object.entries(defaults).map(([id,[probability,cooldownSec]])=>[id,{enabled:!['bubbles','ball','showFavorite','nestRest','snackEat'].includes(id),probability,cooldownSec}]))};}
const numeric=(value,name,min,max)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(name+' 数值无效');return value;};
function desktopPolicy(input={},base=defaultDesktopPolicy()){
 const out=structuredClone(base);if(!input||typeof input!=='object'||Array.isArray(input))throw Error('桌宠设置格式无效');
 for(const k of ['enabled','captureAllowed','automaticObservation'])if(k in input){if(typeof input[k]!=='boolean')throw Error(k+' 必须为开关');out[k]=input[k];}
 for(const [k,min,max] of [['checkIntervalSec',10,3600],['maxQQPerHour',0,12],['quietFrom',0,23],['quietTo',0,23]])if(k in input){out[k]=numeric(input[k],k,min,max);if(!Number.isInteger(out[k]))throw Error(k+' 必须为整数');}
 if('behaviors' in input){if(!input.behaviors||typeof input.behaviors!=='object'||Array.isArray(input.behaviors))throw Error('行为设置格式无效');for(const [id,row] of Object.entries(input.behaviors)){if(!Object.hasOwn(DESKTOP_BEHAVIORS,id)||!row||typeof row!=='object')throw Error('未知桌宠行为');const target=out.behaviors[id];if('enabled' in row){if(typeof row.enabled!=='boolean')throw Error('行为开关无效');target.enabled=row.enabled;}if('probability' in row)target.probability=numeric(row.probability,id,0,100);if('cooldownSec' in row)target.cooldownSec=numeric(row.cooldownSec,id,0,86400);}}
 return out;
}

module.exports={DESKTOP_BEHAVIORS,defaultDesktopPolicy,desktopPolicy};
