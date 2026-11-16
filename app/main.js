'use strict';
const {app,BrowserWindow,ipcMain,screen,Menu,Tray,shell,nativeImage,safeStorage,desktopCapturer,powerMonitor}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {NativeClient}=require('./lib/native-client.cjs'),{DeviceConnection}=require('./lib/device-connection.cjs'),{createScreenObserver}=require('./lib/screen-observer.cjs');
const {desktopPolicy,defaultDesktopPolicy}=require('./lib/autonomy-policy.cjs');
const {createFeedingOutbox}=require('./lib/feeding-outbox.cjs');
const {createWindowLayer}=require('./lib/window-layer.cjs'),{statusIcon}=require('./lib/tray-status.cjs');
const {checkedPlay}=require('./lib/play-summary.cjs');
const {openHomeStore}=require('./lib/home-store.cjs'),{DesktopAssets}=require('./lib/desktop-assets.cjs');
const {checkedHome}=require('./lib/home-summary.cjs');
const playStore=require('./lib/play-store.cjs');
const {sampleCursor}=require('./lib/cursor-sampling.cjs');
const {createMousePass}=require('./lib/mouse-pass.cjs');let mousePass;
let windowLayer;
app.disableHardwareAcceleration();
const TEST=process.env.FISH_RELEASE_TEST==='1',PROFILE=process.env.FISH_PET_PROFILE?path.resolve(process.env.FISH_PET_PROFILE):path.join(app.getPath('appData'),'FishDesktopPet');
fs.mkdirSync(PROFILE,{recursive:true});app.setPath('userData',path.join(PROFILE,'RigRuntime'));app.setName('鱼鱼桌宠');
const PAGE=pathToFileURL(path.join(__dirname,'renderer/index.html')).href,configFile=path.join(PROFILE,'rig-settings.json'),journal=path.join(PROFILE,'rig-icon-recovery.json');
const read=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return{};}};
// Windows safeStorage data uses Chromium's profile key. Keep the legacy encrypted
// os_crypt preferences in the separate renderer profile; never export/decrypt the key.
if(process.platform==='win32'){
 try{const legacy=read(path.join(PROFILE,'Local State'));if(legacy.os_crypt?.encrypted_key){const file=path.join(PROFILE,'RigRuntime','Local State'),current=read(file);if(current.os_crypt?.encrypted_key!==legacy.os_crypt.encrypted_key){current.os_crypt={...legacy.os_crypt};fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.migration',JSON.stringify(current));fs.renameSync(file+'.migration',file);}}}catch{}
}
const homeStore=openHomeStore(PROFILE),favoriteAssets=new DesktopAssets({profile:PROFILE});
const playHistory=playStore.openPlayStore(PROFILE);
const old=read(path.join(PROFILE,'settings.json')),saved=read(configFile);
let cfg={scale:.75,soundEnabled:true,alwaysOnTop:true,ignoreMouse:false,autonomy:true,allowMouse:false,allowIcons:true,allowWindows:true,observeScreen:old.observeScreen!==false,serverEnabled:old.serverEnabled!==false,...saved};
if(![.5,.75,1,1.25,1.5,2,2.5,3].includes(cfg.scale))cfg.scale=.75;
if(TEST){cfg.serverEnabled=false;cfg.observeScreen=false;cfg.autonomy=false;cfg.allowMouse=false;cfg.allowIcons=false;cfg.allowWindows=false;}
let settingsWin;const policyAcks=new Map();
let win,tray,native,device,observer,display,world={icons:[],windows:[],autoArrange:false},input={},pose=null,carry=null,mouse=false,quitting=false,ready=false,suspended=false,snapBusy=false,inputBusy=false;
let localCommand=null;let favoriteQueue=[],lastFavoriteRefresh=0;const notes=[];const feedTickets=new Map();
let actionFlushTimer=null;
const actionFile=path.join(PROFILE,'action-feedback.json');let actionRows=Array.isArray(read(actionFile).rows)?read(actionFile).rows.slice(-96):[];
for(const event of homeStore.snapshot().pending)if(!actionRows.some(r=>r.id===event.id))actionRows.push(event);
for(const event of playHistory.pending())if(!actionRows.some(r=>r.id===event.id))actionRows.push(event);
function saveActions(){actionRows=actionRows.filter(r=>Date.now()-r.at<600000).slice(-96);fs.writeFileSync(actionFile+'.tmp',JSON.stringify({rows:actionRows}));fs.renameSync(actionFile+'.tmp',actionFile);}
function foodTicket(id,kind,manual=false){if(typeof id!=="string"||!id)return;const timer=setTimeout(()=>{feedTickets.delete(id);},26000);timer.unref?.();feedTickets.set(id,{kind,timer,manual});}
const feedingOutbox=createFeedingOutbox({profile:PROFILE,send:event=>device?.event(event)});
const timers=[],actions=new Map();let lastWorldAt=0,lastStatusAt=0,lastRefreshError='';let desktopHealth={backend:'starting',error:'',lastSuccessAt:0};
const log=s=>{try{fs.appendFileSync(path.join(PROFILE,'rig-pet.log'),new Date().toISOString()+' '+s+'\n');}catch{}};
function runtimeStatus(){if(TEST)return;try{lastStatusAt=Date.now();fs.writeFileSync(path.join(PROFILE,'rig-runtime-status.json'),JSON.stringify({at:lastStatusAt,version:app.getVersion(),ready,localCommand,connection:device?.snapshot().phase||'disconnected',icons:world.icons.length,windows:world.windows.length,play:playHistory.snapshot(),home:{revision:homeStore.snapshot().revision,error:homeStore.snapshot().error,inventory:homeStore.snapshot().items.filter(i=>i.state==='available').map(i=>({food:i.food})),pending:homeStore.snapshot().pending.length},foodWidgets:{count:world.icons.filter(o=>o.foodWidget).length,mode:"snack-box",topmost:world.foodState?.topmost,layerChanges:world.foodState?.layerChanges},desktop:desktopHealth,window:{visible:win?.isVisible(),alwaysOnTop:win?.isAlwaysOnTop(),focusable:win?.isFocusable()}}));}catch{}}
const send=(type,data)=>{if(win&&!win.isDestroyed())win.webContents.send('fish:event',{type,data});};
const persist=()=>fs.writeFileSync(configFile,JSON.stringify(cfg,null,2),'utf8');
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=display.bounds.width&&p.y<=display.bounds.height;
const local=p=>{const d=screen.screenToDipPoint({x:Math.round(p.x),y:Math.round(p.y)});return{x:d.x-display.bounds.x,y:d.y-display.bounds.y};};
const physical=p=>screen.dipToScreenPoint({x:Math.round(display.bounds.x+p.x),y:Math.round(display.bounds.y+p.y)});
function showText(text){lastRefreshError=String(text).slice(0,180);runtimeStatus();}
function settings(){if(settingsWin&&!settingsWin.isDestroyed()){settingsWin.show();return;}settingsWin=new BrowserWindow({width:620,height:760,title:'鱼鱼桌宠设置',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'settings-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});settingsWin.webContents.setWindowOpenHandler(()=>({action:'deny'}));settingsWin.webContents.on('will-navigate',e=>e.preventDefault());settingsWin.loadFile(path.join(__dirname,'settings.html'));}
function configure(patch){cfg={...cfg,...patch};persist();if(patch.autonomy===false||patch.autonomyPolicy?.enabled===false){void stopCursor();void endCarry(false);}windowLayer?.restore();mousePass?.update(false,cfg.ignoreMouse===true);send('config',cfg);menu();}
async function refresh(){if(snapBusy||!native)return;snapBusy=true;try{
 const raw=await native.request('snapshot');const own=Number(win.getNativeWindowHandle().readBigUInt64LE());
 const icons=raw.icons.map(o=>{const p=local({x:o.ScreenX,y:o.ScreenY});return {key:o.Key,name:o.Name,x:p.x,y:p.y,sx:o.ScreenX,sy:o.ScreenY,foodWidget:o.Key.startsWith("fish-widget:"),topmost:o.Key.startsWith("fish-widget:")&&raw.foodState?.topmost===true};}).filter(o=>o.x>-70&&o.x<display.bounds.width&&o.y>-70&&o.y<display.bounds.height);
 const windows=raw.windows.filter(w=>w.Id!==own&&!w.Title.startsWith('鱼鱼桌宠')&&!['Program Manager','Windows 输入体验','任务切换'].includes(w.Title)).map(w=>{const p=local({x:w.X,y:w.Y}),q=local({x:w.X+w.Width,y:w.Y+w.Height});return{id:w.Id,name:w.Title,x:p.x,y:p.y,w:q.x-p.x,h:q.y-p.y,sx:w.X,sy:w.Y};}).filter(w=>w.w>100&&w.h>70&&w.x<display.bounds.width&&w.x+w.w>0&&w.y<display.bounds.height&&w.y+w.h>0);
 world={icons,windows,autoArrange:raw.autoArrange,foodState:raw.foodState};lastWorldAt=Date.now();desktopHealth={backend:raw.backend||'shell-com',error:raw.desktopError||'',lastSuccessAt:raw.desktopError?desktopHealth.lastSuccessAt:lastWorldAt};send('world',world);
 if(desktopHealth.error!==lastRefreshError){lastRefreshError=desktopHealth.error;if(lastRefreshError)log('桌面对象读取：'+lastRefreshError);runtimeStatus();}else if(lastWorldAt-lastStatusAt>10000)runtimeStatus();
 }catch(e){const error=String(e.message||e).slice(0,180);desktopHealth={...desktopHealth,error};world={...world,icons:[],autoArrange:true};send('world',world);if(error!==lastRefreshError){lastRefreshError=error;log('桌面对象读取：'+error);runtimeStatus();}}finally{snapBusy=false;}}
async function stopCursor(){mouse=false;try{await native.request('cursorStop');}catch{}send('mouse-release');}
async function endCarry(commit){if(!carry)return;const c=carry;carry=null;try{if(!commit){const raw=await native.request('snapshot'),current=raw.icons.find(i=>i.Key===c.key);if(current&&[c.last,c.pending].filter(Boolean).some(p=>Math.hypot(current.ScreenX-p.x,current.ScreenY-p.y)<15))await native.request('restoreIcon',{key:c.key,x:c.from.x,y:c.from.y});}fs.rmSync(journal,{force:true});}catch{log('图标归位待下次启动重试');}await refresh();}
function contact(point,object){return validPoint(point)&&Math.hypot(point.x-object.x-24,point.y-object.y-20)<=30;}
async function call(op,a={}){
 if(op==='feedStatus'){
  const ticket=feedTickets.get(a.id);if(!ticket||!['accepted','completed','cancelled','busy','failed'].includes(a.phase))return false;
  if(a.phase!=='accepted'){clearTimeout(ticket.timer);feedTickets.delete(a.id);}const result=await native.request('foodResult',{key:a.id,text:a.phase});
  if(ticket.manual&&a.phase==='completed')feedingOutbox.add(a.id,ticket.kind);return result;
 }
 if(op==='iconBegin'){
  if(!carry&&fs.existsSync(journal)){carry=read(journal);await endCarry(false);if(fs.existsSync(journal))throw Error('上一次搬运尚未归位，请稍后再试');}
  if(!cfg.allowIcons||world.autoArrange)throw Error('请先关闭桌面自动排列，或在托盘允许搬动图标');const o=world.icons.find(o=>o.key===a.key&&!o.foodWidget);if(!o||!contact(a.point,o))throw Error('手还没有碰到图标');await endCarry(false);carry={key:o.key,from:{x:o.sx,y:o.sy},last:{x:o.sx,y:o.sy}};fs.writeFileSync(journal,JSON.stringify(carry));let image='';try{image=(await app.getFileIcon(o.key,{size:'normal'})).toDataURL();}catch{}return{image,name:o.name};
 }
 if(op==='iconMove'){
  if(!carry||!validPoint(a.point))throw Error('当前没有拿着图标');const moving=carry,p=physical({x:Math.max(0,a.point.x-24),y:Math.max(0,a.point.y-20)});if(Math.hypot(p.x-moving.last.x,p.y-moving.last.y)>120)throw Error('图标移动跨度过大');moving.pending=p;fs.writeFileSync(journal,JSON.stringify(moving));const actual=await native.request('icon',{key:moving.key,...p});moving.last=actual;delete moving.pending;if(carry===moving)fs.writeFileSync(journal,JSON.stringify(moving));return true;
 }
 if(op==='iconEnd'){await endCarry(a.commit===true);return true;}
 if(op==='windowMove'){
  if(!cfg.allowWindows||!validPoint(a.point))throw Error('窗口推动已暂停');const w=world.windows.find(w=>w.id===a.id);if(!w||!validPoint(a.hand)||Math.min(Math.abs(a.hand.x-w.x),Math.abs(a.hand.x-w.x-w.w))>35||a.hand.y<w.y||a.hand.y>w.y+w.h)throw Error('没有碰到窗口侧边');const p=physical(a.point);if(Math.hypot(p.x-w.sx,p.y-w.sy)>100)throw Error('窗口推动跨度过大');await native.request('window',{hwnd:a.id,...p});w.x=a.point.x;w.y=a.point.y;w.sx=p.x;w.sy=p.y;return true;
 }
 if(op==='mouseContact'){
  if(!cfg.allowMouse||cfg.ignoreMouse||!validPoint(a.point))return{held:false};const p=physical(a.point),r=await native.request('cursorStart',{...p,tol:Math.round(10*display.scaleFactor)});mouse=r.held;return r;
 }
 if(op==='mouseMove'){
  if(!mouse||!validPoint(a.point))return{held:false};const r=await native.request('cursor',physical(a.point));mouse=r.held;return r;
 }
 if(op==='mouseStop'){await stopCursor();return true;}
 if(op==='redeem')throw Error('请使用零食盒取用零食');
 if(op==='foods'||op==='redeem')throw Error('请使用零食盒存入和取用零食');
 throw Error('未知动作');
}
function menu(){if(!tray)return;const connected=device?.snapshot().connected===true;tray.setImage(statusIcon(nativeImage,path.join(__dirname,'renderer/assets/icon.png'),connected));tray.setToolTip('鱼鱼桌宠 · '+(connected?'已连接':'未连接 / 重连中'));tray.setContextMenu(Menu.buildFromTemplate([
 {label:win.isVisible()?'隐藏鱼鱼':'显示鱼鱼',click:()=>{win.isVisible()?win.hide():win.showInactive();menu();}},
 {label:'桌宠设置…',click:settings},
 {type:'separator'},
 {label:'和鱼鱼玩',submenu:[
  {label:'戳泡泡',click:()=>send('command',{kind:'bubbles'})},
  {label:'玩球',click:()=>send('command',{kind:'ball'})},
  {label:'收起玩具',click:()=>send('command',{kind:'tidy'})},
  {type:'separator'},
  {label:'举一张收藏',click:()=>send('command',{kind:'showFavorite'})},
  {label:'回小窝休息',click:()=>send('command',{kind:'nestRest'})},
  {label:'吃一份零食',click:()=>send('command',{kind:'snackEat'})}
 ]},
 {label:'摆放道具',submenu:[
  ...['nest','box'].map(name=>({label:'把'+(name==='nest'?'小窝':'零食盒')+'放到旁边',click:()=>send('home-place',{name})})),
  {type:'separator'},
  ...['nest','box'].map(name=>({label:'显示'+(name==='nest'?'小窝':'零食盒'),type:'checkbox',checked:homeStore.snapshot().props[name]?.visible===true,click:item=>{const p=homeStore.snapshot().props[name];if(p){homeStore.operate('prop',{operationId:require('node:crypto').randomUUID(),name,...p,visible:item.checked});send('home-state',homeStore.snapshot());menu();}}}))
 ]},
 {type:'separator'},
 {label:cfg.autonomy?'暂停自主活动':'恢复自主活动',click:()=>configure({autonomy:!cfg.autonomy})},
 {label:'停止当前动作',click:()=>{send('command',{kind:'stop'});void stopCursor();void endCarry(false);}},
 {label:'找回鱼鱼',click:()=>{configure({alwaysOnTop:true});win.showInactive();send('command',{kind:'reset'});windowLayer.restore();}},
 {type:'separator'},
 {label:'退出',click:()=>app.quit()}
 ]));}
async function connect(){
 observer=createScreenObserver({getSources:o=>desktopCapturer.getSources(o),displayId:()=>display.id,allowed:explicit=>cfg.captureAllowed!==false&&cfg.autonomyPolicy?.captureAllowed!==false&&!suspended&&device?.snapshot().connected&&(explicit||cfg.observeScreen&&cfg.autonomyPolicy?.automaticObservation!==false&&cfg.autonomyPolicy?.enabled!==false&&win.isVisible()),send:c=>device.observe(c),shouldObserve:()=>{const p=cfg.autonomyPolicy||defaultDesktopPolicy(),b=p.behaviors.observe,now=Date.now();if(!b.enabled||now<(observer.nextIntent||0))return false;observer.nextIntent=now+Math.max(p.checkIntervalSec,b.cooldownSec)*1000;return Math.random()*100<b.probability;},log});
 device=new DeviceConnection({loadConfig:async()=>JSON.parse((await safeStorage.decryptStringAsync(fs.readFileSync(path.join(PROFILE,'device-connection.bin')))).result),isReady:()=>ready,onStatus:()=>{menu();runtimeStatus();send('connection',device?.snapshot().connected===true);},onAsset:m=>{try{const complete=favoriteAssets.receive(m);if(m.type==='favorite.catalog.result'){if(!favoriteAssets.catalog.length)send('favorite-images',[]);favoriteQueue=favoriteAssets.catalog.slice(0,3).map(i=>i.assetId);const next=favoriteQueue.shift();if(next)device.send({type:'favorite.asset.request',assetId:next});}if(m.type==='favorite.asset.chunk')device.send({type:'favorite.asset.ack',transferId:m.transferId,seq:m.seq});if(complete){send('favorite-images',[...favoriteAssets.cache].filter(([assetId])=>favoriteAssets.catalog.some(i=>i.assetId===assetId)).map(([assetId,b])=>({assetId,base64:b.toString('base64'),sourceAnimated:favoriteAssets.catalog.find(i=>i.assetId===assetId)?.sourceAnimated})));const next=favoriteQueue.shift();if(next)device.send({type:'favorite.asset.request',assetId:next});}}catch(e){favoriteAssets.clear();showText(e.message);}},onActionAck:ids=>{try{homeStore.operate('ack',{operationId:require('node:crypto').randomUUID(),ids});}catch{}playHistory.ack(ids);const confirmed=new Set(ids);actionRows=actionRows.filter(r=>!confirmed.has(r.id));saveActions();},onFeedbackAck:id=>feedingOutbox.ack(id),onSpeech:m=>{if(win.isVisible()&&ready)send('speech',m);if(m.purpose==='diary'&&m.expiresAt>=Date.now())void native.request('essay',{text:m.text}).catch(e=>showText(e.message));},onCapture:m=>observer.capture({explicit:m.explicit===true}),onPolicy:policy=>new Promise((resolve,reject)=>{const clean={...desktopPolicy(policy),version:policy.version};const timer=setTimeout(()=>{policyAcks.delete(policy.version);reject(Error('渲染器未确认配置'));},4000);policyAcks.set(policy.version,{resolve:()=>{clearTimeout(timer);resolve();}});configure({autonomyPolicy:clean});}),onAction:r=>new Promise(resolve=>{if(!ready||!win.isVisible()||suspended||r.expiresAt<Date.now()){resolve(false);return;}const timer=setTimeout(()=>{actions.delete(r.id);send('home-cancel-request',{id:r.id});resolve({ok:false,reason:'timeout'});},6000);actions.set(r.id,{resolve,timer});send('remote-action',r);})});
 if(cfg.serverEnabled)await device.start();timers.push(setInterval(()=>{feedingOutbox.flush();if(device?.snapshot().connected&&Date.now()-lastFavoriteRefresh>600000){lastFavoriteRefresh=Date.now();device.send({type:'favorite.catalog.request'});}},15000));timers.push(setInterval(()=>{if(powerMonitor.getSystemIdleTime()<180)void observer.sample().catch(()=>{});},30000));
}
function trusted(e){return win&&!win.isDestroyed()&&e.sender===win.webContents&&e.senderFrame===win.webContents.mainFrame&&e.senderFrame.url===PAGE;}
function ipc(){
 ipcMain.handle('fish:local-settings',(e,patch)=>{if(!settingsWin||e.sender!==settingsWin.webContents||e.senderFrame!==settingsWin.webContents.mainFrame||e.senderFrame.url!==pathToFileURL(path.join(__dirname,'settings.html')).href)throw Error('无效设置窗口');if(patch?.openPanel){void shell.openExternal('http://127.0.0.1:18788/#chat/desktop');return cfg;}if(patch){const next={};for(const k of ['soundEnabled','alwaysOnTop','ignoreMouse','allowMouse','allowIcons','allowWindows','observeScreen','captureAllowed','serverEnabled'])if(k in patch){if(typeof patch[k]!=='boolean')throw Error('开关无效');next[k]=patch[k];}if('scale' in patch){if(![.5,.75,1,1.25,1.5,2,2.5,3].includes(patch.scale))throw Error('尺寸无效');next.scale=patch.scale;}if(patch.displayId!=null){const d=screen.getAllDisplays().find(d=>d.id===patch.displayId);if(!d)throw Error('屏幕不存在');display=d;win.setBounds(d.bounds);send('command',{kind:'rebound'});void refresh();}configure(next);if('serverEnabled' in next){if(next.serverEnabled)void device.start();else device.stop();}}return {cfg,connection:device?.snapshot(),displays:screen.getAllDisplays().map((d,i)=>({id:d.id,label:'屏幕 '+(i+1),selected:d.id===display.id}))};});
 ipcMain.on('fish:policy-applied',(e,version)=>{if(trusted(e)){policyAcks.get(version)?.resolve();policyAcks.delete(version);}});
 ipcMain.on('fish:autonomy-event',(e,value)=>{if(!trusted(e)||!ready||!win.isVisible()||suspended||!cfg.autonomy||cfg.autonomyPolicy?.enabled===false)return;const kind=String(value?.kind||'');if(!/^(food\.(want|help|found|eaten)|action\.(note|failed)|interaction\.pat|chat\.idle|diary\.want)$/.test(kind))return;device?.event({id:require('node:crypto').randomUUID(),version:cfg.autonomyPolicy?.version||0,at:Date.now(),kind,detail:String(kind==='diary.want'&&notes.length?notes.slice(-8).join('；'):value.detail||'').slice(0,240),gateApplied:value.gateApplied===true,satiety:Math.max(0,Math.min(100,Number(value.satiety)||0))});});
 ipcMain.handle('fish:stock-snack',(e,food)=>{if(!trusted(e)||!['fish','cake'].includes(food))throw Error('无效零食');try{const result=homeStore.operate('stock',{operationId:require('node:crypto').randomUUID(),food});const snapshot=homeStore.snapshot();send('home-state',snapshot);menu();return {result,snapshot};}catch(error){return {error:error.message,snapshot:homeStore.snapshot()};}});
 ipcMain.handle('fish:home',(e,{op,args={}}={})=>{if(!trusted(e))throw Error('来源无效');try{if(!['snapshot','reserve','open','finish','prop','evidence'].includes(op))throw Error('操作无效');if(op==='evidence'){const v=args.event;if(!v||!checkedHome(v.home,v.name,v.phase))throw Error('结果无效');}const result=homeStore.operate(op,{...args,operationId:require('node:crypto').randomUUID()});if(op==='evidence'||op==='finish'){for(const event of homeStore.snapshot().pending)if(!actionRows.some(r=>r.id===event.id))actionRows.push(event);saveActions();device?.activity({actions:actionRows.slice(0,24),evidenceOnly:true});}return {result,snapshot:homeStore.snapshot()};}catch(error){return {error:error.message,snapshot:homeStore.snapshot()};}});
 ipcMain.on('fish:play-state',(e,value)=>{if(trusted(e))playHistory.record(value);});
 ipcMain.on('fish:action-trace',(e,value)=>{if(!trusted(e)||!ready||!value||typeof value.id!=='string'||value.id.length>100||typeof value.actionId!=='string'||value.actionId.length>100||!Number.isFinite(value.at)||Math.abs(Date.now()-value.at)>30000)return;actionRows.push({id:value.id,actionId:value.actionId,at:value.at,channel:String(value.channel||'').slice(0,20),name:String(value.name||'').slice(0,24),phase:String(value.phase||'').slice(0,20),...(value.play&&checkedPlay(value.play,value.name,value.phase)?{play:checkedPlay(value.play,value.name,value.phase)}:{}),...(value.touch?{touch:{kind:String(value.touch.kind||'').slice(0,20),from:value.touch.from,to:value.touch.to,durationMs:value.touch.durationMs,reason:String(value.touch.reason||'').slice(0,24)}}:{})});if(actionRows.length>96)actionRows.shift();if((value.touch||value.play)&&!actionFlushTimer){actionFlushTimer=setTimeout(()=>{actionFlushTimer=null;saveActions();device?.activity({actions:actionRows.slice(0,24),evidenceOnly:true});},3000);actionFlushTimer.unref?.();}});
 ipcMain.on('fish:activity',(e,value)=>{if(trusted(e)){playHistory.retry();for(const event of homeStore.snapshot().pending)if(!actionRows.some(r=>r.id===event.id))actionRows.push(event);
for(const event of playHistory.pending())if(!actionRows.some(r=>r.id===event.id))actionRows.push(event);saveActions();device?.activity({...value,home:{revision:homeStore.snapshot().revision,receivedAt:Date.now(),inventory:{fish:homeStore.snapshot().items.filter(i=>i.state==='available'&&i.food==='fish').length,cake:homeStore.snapshot().items.filter(i=>i.state==='available'&&i.food==='cake').length},error:!!homeStore.snapshot().error},actions:actionRows.slice(0,24),visible:win.isVisible(),suspended});}});
 ipcMain.handle('fish:init',e=>{if(!trusted(e))throw Error('无效窗口');return{cfg,world,input,position:saved.position};});
 ipcMain.handle('fish:call',(e,m)=>{if(!trusted(e)||typeof m?.op!=='string')throw Error('无效窗口');return call(m.op,m.args);});
 ipcMain.on('fish:hit',(e,v)=>{if(trusted(e)){mousePass?.update(v===true,cfg.ignoreMouse===true);}});
 ipcMain.on('fish:layer-restore',e=>{if(trusted(e))windowLayer?.restore();});
 ipcMain.on('fish:position-trace',(e,p)=>{if(trusted(e)&&['explicit-reset','perch-detach'].includes(p?.reason)&&validPoint(p.from)&&validPoint(p.to))log('位置变化 '+JSON.stringify(p));});
 ipcMain.on('fish:local-result',(e,v)=>{if(!trusted(e)||!['showFavorite','nestRest','snackEat'].includes(v?.name)||!['empty','noFavorite','differentSupport','storage','timeout','unreachable','blocked','accepted','completed'].includes(v.code))return;localCommand={name:v.name,ok:v.ok===true,code:v.code,at:Date.now()};runtimeStatus();});
 ipcMain.on('fish:pose',(e,p)=>{if(trusted(e)&&validPoint(p)){pose=p;if(typeof p.note==='string'&&p.note.length<200){notes.push(p.note);if(notes.length>30)notes.shift();}}});
 ipcMain.on('fish:menu',e=>{if(trusted(e))tray.popUpContextMenu();});
 ipcMain.on('fish:renderer-error',(e,message)=>{if(!trusted(e))return;log('渲染错误：'+message);if(TEST){fs.appendFileSync(path.join(PROFILE,'renderer-error.txt'),message+'\n');app.quit();}});
 ipcMain.on('fish:displayed',(e,id)=>{if(trusted(e)&&win.isVisible()&&typeof id==='string')device?.confirmDisplayed(id);});
 ipcMain.on('fish:action-result',(e,r)=>{if(!trusted(e))return;const a=actions.get(r.id);if(a){actions.delete(r.id);clearTimeout(a.timer);a.resolve({ok:r.ok===true,reason:['noFavorite','differentSupport','empty','storage','timeout','blocked'].includes(r.reason)?r.reason:'blocked'});}});
 ipcMain.on('fish:ready',e=>{if(!trusted(e))return;ready=true;device?.ready();runtimeStatus();if(TEST){ipcMain.emit('fish:pose',{sender:win.webContents,senderFrame:win.webContents.mainFrame},{x:display.bounds.width/2,y:display.bounds.height/2,note:'启动活动事件检查'});fs.writeFileSync(path.join(PROFILE,'release-ready.json'),JSON.stringify({version:app.getVersion(),ready:true,icons:world.icons.length,windows:world.windows.length}));win.webContents.capturePage().then(image=>fs.writeFileSync(path.join(PROFILE,'release-render.png'),image.toPNG())).catch(()=>{}).finally(()=>setTimeout(()=>app.quit(),1500));} });
}
async function start(){
 display=screen.getPrimaryDisplay();native=new NativeClient(path.join(app.isPackaged?process.resourcesPath:__dirname,'helper/NativeDesktop.exe'));ipc();
 win=new BrowserWindow({...display.bounds,title:'鱼鱼桌宠 · 骨骼版',show:false,transparent:true,backgroundColor:'#00000000',frame:false,thickFrame:false,resizable:false,hasShadow:false,alwaysOnTop:cfg.alwaysOnTop,skipTaskbar:true,fullscreenable:false,focusable:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,spellcheck:false,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('will-attach-webview',e=>e.preventDefault());win.webContents.session.setPermissionRequestHandler((w,p,cb)=>cb(false));win.webContents.session.setPermissionCheckHandler(()=>false);
 win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(d,cb)=>cb({cancel:true}));
 win.webContents.on('render-process-gone',()=>{ready=false;void stopCursor();void endCarry(false);log('骨骼渲染中断');if(!quitting)win.reload();});
 win.on('hide',()=>{send('visibility',false);send('command',{kind:'stop'});void stopCursor();void endCarry(false);});win.on('show',()=>send('visibility',true));
 win.on('close',e=>{if(!quitting){e.preventDefault();win.hide();menu();}});mousePass=createMousePass(win);mousePass.update(false,cfg.ignoreMouse===true);windowLayer=createWindowLayer({window:win,enabled:()=>cfg.alwaysOnTop});win.on('blur',()=>windowLayer.restore());win.on('show',()=>windowLayer.restore());win.on('restore',()=>windowLayer.restore());timers.push(setInterval(()=>windowLayer.apply(),2000));
 tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'renderer/assets/icon.png')));tray.setToolTip('鱼鱼桌宠 · 骨骼版');tray.on('click',()=>{win.showInactive();menu();});menu();
 if(fs.existsSync(journal)){carry=read(journal);await endCarry(false);}
 // Legacy detached feed widgets are retired; the snack box owns food UI.
 await refresh();await win.loadFile(path.join(__dirname,'renderer/index.html'));win.showInactive();await connect();
 timers.push(setInterval(()=>void refresh(),1300));
 timers.push(setInterval(()=>{try{sampleCursor({screen,display:()=>display,send,visible:()=>!suspended&&win.isVisible()});}catch{}},32));
 timers.push(setInterval(async()=>{if(inputBusy||suspended||!win.isVisible())return;inputBusy=true;try{const r=await native.request('input');const p=local(r);input={...p,interrupt:r.interrupt,escape:r.escape};send('input',input);if(r.feed&&['fish','cake'].includes(r.feed.kind)&&typeof r.feed.id==='string'){if(ready&&!suspended){foodTicket(r.feed.id,r.feed.kind,true);if(!win.isVisible())win.showInactive();send('feed-button',r.feed);}else void native.request('foodResult',{key:r.feed.id,text:'failed'}).catch(()=>{});}if(r.interrupt&&mouse)await stopCursor();}catch{}finally{inputBusy=false;}},60));
 screen.on('display-removed',()=>{display=screen.getPrimaryDisplay();win.setBounds(display.bounds);send('command',{kind:'rebound'});void refresh();});
 powerMonitor.on('suspend',()=>{suspended=true;send('command',{kind:'stop'});void stopCursor();void endCarry(false);});powerMonitor.on('resume',()=>{suspended=false;void refresh();});
}
if(app.requestSingleInstanceLock())app.whenReady().then(start).catch(e=>{log('启动失败：'+e.message);if(TEST)fs.writeFileSync(path.join(PROFILE,'release-error.txt'),e.stack||e.message);app.exit(1);});else app.quit();
app.on('second-instance',()=>{if(win){win.showInactive();windowLayer?.restore();}});
let drained=false;app.on('before-quit',e=>{if(drained)return;e.preventDefault();quitting=true;ready=false;windowLayer?.close();device?.stop();timers.forEach(clearInterval);clearTimeout(actionFlushTimer);for(const ticket of feedTickets.values())clearTimeout(ticket.timer);feedTickets.clear();for(const a of actions.values()){clearTimeout(a.timer);a.resolve(false);}actions.clear();if(pose){cfg.position={x:pose.x,y:pose.y};try{persist();}catch{}}Promise.allSettled([stopCursor(),endCarry(false)]).finally(()=>{drained=true;native?.close();app.quit();});});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
