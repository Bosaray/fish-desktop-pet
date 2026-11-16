'use strict';
const fs=require('node:fs'),path=require('node:path'),{checkedPlay}=require('./play-summary.cjs');
function openPlayStore(profile){
 const file=path.join(profile,'play-history.json');let data={rows:[],active:null,pending:[]},lastError='',dirty=false;
 try{if(fs.existsSync(file))data=JSON.parse(fs.readFileSync(file,'utf8'))||{rows:[],active:null,pending:[]};}catch{lastError='玩法存档无法读取';}
 if(!Array.isArray(data.rows))data.rows=[];if(!Array.isArray(data.pending))data.pending=[];
 const save=()=>{try{fs.mkdirSync(profile,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file);lastError='';dirty=false;return true;}catch{lastError='玩法结果尚未保存';dirty=true;return false;}};
 const recover=data.active;if(recover){data.rows.push({...recover,phase:'interrupted',play:{...recover.play,reason:'restart',cleanup:'removed'}});data.active=null;data.rows=data.rows.slice(-50);if(Date.now()-recover.at<=600000)data.pending.push({id:recover.actionId+'-restart',actionId:recover.actionId,at:Date.now(),channel:'interaction',name:recover.play.kind,phase:'interrupted',play:{...recover.play,reason:'restart',cleanup:'removed'}});data.pending=data.pending.slice(-50);save();}
 return {record(value){if(!value||!/^act-[a-z0-9-]{8,95}$/.test(value.actionId)||!['started','completed','failed','interrupted'].includes(value.phase))return false;const play=checkedPlay(value.play,value.play?.kind,value.phase);if(!play)return false;const row={actionId:value.actionId,phase:value.phase,play,at:Date.now()};if(value.phase==='started'){if(data.rows.some(r=>r.actionId===row.actionId))return dirty?save():true;data.active=row;}else{if(data.rows.some(r=>r.actionId===row.actionId))return dirty?save():true;data.rows.push(row);data.rows=data.rows.slice(-50);if(data.active?.actionId===row.actionId)data.active=null;}return save();},retry:()=>!dirty||save(),pending:()=>data.pending.filter(e=>Date.now()-e.at<=600000),ack(ids){const keys=new Set(ids);data.pending=data.pending.filter(e=>!keys.has(e.id));save();},snapshot:()=>({lastError,dirty,active:data.active,recent:data.rows.slice(-5)}),recovered:recover?data.rows.at(-1):null};
}
module.exports={openPlayStore};
