'use strict';
const {contextBridge,ipcRenderer}=require('electron');
addEventListener('error',e=>ipcRenderer.send('fish:renderer-error',String(e.message).slice(0,500)));
addEventListener('unhandledrejection',e=>ipcRenderer.send('fish:renderer-error',String(e.reason?.message||e.reason).slice(0,500)));
contextBridge.exposeInMainWorld('desktopAPI',Object.freeze({
 localResult:value=>ipcRenderer.send('fish:local-result',value),stockSnack:food=>ipcRenderer.invoke('fish:stock-snack',food),home:(op,args={})=>ipcRenderer.invoke('fish:home',{op,args}),playState:value=>ipcRenderer.send('fish:play-state',value),init:()=>ipcRenderer.invoke('fish:init'),hit:v=>ipcRenderer.send('fish:hit',v===true),state:v=>ipcRenderer.send('fish:pose',v),
 call:(op,args)=>ipcRenderer.invoke('fish:call',{op,args}),ready:()=>ipcRenderer.send('fish:ready'),
 displayed:id=>ipcRenderer.send('fish:displayed',id),actionResult:(id,ok,reason)=>ipcRenderer.send('fish:action-result',{id,ok:ok===true,reason}),
 actionTrace:event=>ipcRenderer.send('fish:action-trace',event),event:event=>ipcRenderer.send('fish:autonomy-event',event),activity:value=>ipcRenderer.send('fish:activity',value),policyApplied:version=>ipcRenderer.send('fish:policy-applied',version),
 positionTrace:value=>ipcRenderer.send('fish:position-trace',value),restoreLayer:()=>ipcRenderer.send('fish:layer-restore'),menu:()=>ipcRenderer.send('fish:menu'),onEvent:fn=>{const cb=(_,m)=>fn(m);ipcRenderer.on('fish:event',cb);return()=>ipcRenderer.removeListener('fish:event',cb);}
}));
