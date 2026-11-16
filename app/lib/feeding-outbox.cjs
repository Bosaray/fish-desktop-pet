'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports.createFeedingOutbox=({profile,send,now=Date.now})=>{
 const file=path.join(profile,'feeding-feedback.json');let rows=[];try{const value=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(value))rows=value;}catch{}
 const prune=()=>{rows=rows.filter(r=>/^fed-[a-f0-9]{32}$/.test(r.id)&&['fish','cake'].includes(r.food)&&Number.isFinite(r.at)&&now()-r.at<600000).slice(-32);};
 const save=()=>{prune();fs.mkdirSync(profile,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(rows));fs.renameSync(file+'.tmp',file);};
 const flush=()=>{prune();for(const row of rows.slice(0,4))send({...row,completed:true,kind:'food.fed'});};
 return {add(id,food){if(!/^[a-f0-9]{32}$/.test(id)||!['fish','cake'].includes(food))return false;const key='fed-'+id;if(rows.some(r=>r.id===key))return false;rows.push({id:key,food,at:now()});save();flush();return true;},ack(id){if(!rows.some(r=>r.id===id))return;rows=rows.filter(r=>r.id!==id);save();},flush,pending:()=>rows.length};
};
