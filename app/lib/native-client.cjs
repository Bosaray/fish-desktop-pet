'use strict';
const {spawn}=require('node:child_process'),readline=require('node:readline');
class NativeClient{
 constructor(file,{spawnProcess=spawn,restartDelay=1000,timeout=3500}={}){this.file=file;this.spawnProcess=spawnProcess;this.restartDelay=restartDelay;this.timeout=timeout;this.next=0;this.pending=new Map();this.closed=false;this.start();}
 fail(child,error){if(this.child!==child)return;this.broken=true;this.restartAfter=Date.now()+this.restartDelay;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 start(){this.broken=false;this.restartAfter=Date.now()+this.restartDelay;const child=this.child=this.spawnProcess(this.file,[],{windowsHide:true,stdio:['pipe','pipe','ignore']});
  readline.createInterface({input:child.stdout}).on('line',line=>{if(this.child!==child)return;try{const m=JSON.parse(line),p=this.pending.get(m.id);if(p){this.pending.delete(m.id);clearTimeout(p.timer);m.ok?p.resolve(m.result):p.reject(Error(m.error));}}catch{}});
  child.on('error',e=>this.fail(child,Error('桌面接口启动失败：'+(e.code||'unknown'))));child.on('exit',()=>this.fail(child,Error('桌面接口已停止')));child.stdin.on('error',()=>this.fail(child,Error('桌面接口管道已关闭')));
 }
 request(op,data={}){
  if(this.closed)return Promise.reject(Error('桌面接口已关闭'));
  if(this.broken||this.child.killed||this.child.exitCode!=null||this.child.stdin.destroyed){if(!['snapshot','input'].includes(op)||Date.now()<this.restartAfter)return Promise.reject(Error('桌面接口正在恢复，请稍后重试'));this.start();}
  if(this.pending.size>25)return Promise.reject(Error('桌面接口忙'));
  const child=this.child;
  return new Promise((resolve,reject)=>{const id=++this.next,timer=setTimeout(()=>{if(!this.pending.has(id))return;this.fail(child,Error('桌面操作超时，已停止本次动作'));child.kill();},this.timeout);this.pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({...data,op,id})+'\n',e=>{if(e)this.fail(child,Error('桌面接口管道已关闭'));});});
 }
 close(){if(this.closed)return;this.closed=true;const child=this.child;this.fail(child,Error('桌面接口已关闭'));try{child.stdin.end();}catch{}setTimeout(()=>child.kill(),1200).unref();}
}
module.exports={NativeClient};
