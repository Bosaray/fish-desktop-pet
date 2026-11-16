'use strict';
const WebSocket=require('ws'),tls=require('node:tls');
const {X509Certificate,createHash}=require('node:crypto');
function checkedConfig(input){
  const url=new URL(input?.url);
  if(url.protocol!=='wss:'||url.pathname!=='/fish/desktop/v1'||url.username||url.password||url.search||url.hash)throw Error('桌宠连接地址无效');
  if(!/^[\w-]{8,80}$/.test(input.deviceId)||!/^[-\w]{32,128}$/.test(input.token))throw Error('桌宠配对资料无效');
  const cert=new X509Certificate(input.certificate),fingerprint=createHash('sha256').update(cert.raw).digest('hex');
  if(fingerprint!==input.certSha256)throw Error('桌宠证书校验失败');
  return {url:url.href,deviceId:input.deviceId,token:input.token,certificate:input.certificate,certSha256:fingerprint};
}
class DeviceConnection {
  constructor({loadConfig,onStatus=()=>{},onSpeech=()=>{},onCapture=async()=>({ok:false}),onAction=async()=>false,onPolicy=async()=>{},onFeedbackAck=()=>{},onActionAck=()=>{},onAsset=()=>{},isReady=()=>true}={}){
    Object.assign(this,{loadConfig,onStatus,onSpeech,onCapture,onAction,onPolicy,onFeedbackAck,onActionAck,onAsset,isReady});
    this.socket=null;this.config=null;this.timer=null;this.enabled=false;this.generation=0;this.attempt=0;this.phase='disconnected';this.lastError='';this.messages=new Map();this.requests=new Set();
  }
  snapshot(){return {phase:this.phase,connected:this.phase==='connected',lastError:this.lastError,paired:!!this.config};}
  state(phase,error=''){this.phase=phase;this.lastError=error;this.onStatus(this.snapshot());}
  async start(){
    this.stop();this.enabled=true;const generation=this.generation;
    try{this.config=checkedConfig(await this.loadConfig());if(generation===this.generation&&this.enabled)this.connect();}
    catch{this.state('unpaired','尚未配对，或配对资料暂时不可用');}
  }
  connect(){
    if(!this.enabled||!this.config)return;const generation=++this.generation;this.state('connecting');
    const config=this.config;
    const socket=new WebSocket(config.url,{headers:{Authorization:'Bearer '+config.token,'X-Fish-Device':config.deviceId},ca:config.certificate,rejectUnauthorized:true,minVersion:'TLSv1.2',handshakeTimeout:10000,maxPayload:16000,perMessageDeflate:false,
      checkServerIdentity:(hostname,cert)=>tls.checkServerIdentity(hostname,cert)|| (createHash('sha256').update(cert.raw).digest('hex')===config.certSha256?undefined:Error('certificate pin mismatch'))});
    this.socket=socket;
    socket.on('message',raw=>{if(this.generation===generation)void this.receive(raw).catch(()=>this.state(this.phase,'桌宠消息暂未完成'));});
    socket.on('error',error=>{if(this.generation===generation)this.lastError=error.code==='CERT_HAS_EXPIRED'?'连接证书已过期，需要更新配对':/CERT|TLS/.test(error.code||'')?'服务器证书未通过校验':'服务器暂时连不上';});
    socket.on('close',()=>{
      if(this.generation!==generation||!this.enabled)return;this.socket=null;this.state('reconnecting',this.lastError);
      clearTimeout(this.timer);this.timer=setTimeout(()=>this.connect(),Math.min(60000,1000*2**Math.min(6,this.attempt++))+Math.random()*500);this.timer.unref?.();
    });
  }
  send(message){if(this.socket?.readyState!==WebSocket.OPEN||this.socket.bufferedAmount>1800000)return false;this.socket.send(JSON.stringify({v:1,...message}));return true;}
  ready(){if(this.phase==='connected'&&this.isReady()){this.send({type:'ready',controlVersion:1,features:['play-v1','favorite-display-v1','nest-v1','snackbox-v1']});this.send({type:'favorite.catalog.request'});}}
  async receive(raw){
    const message=JSON.parse(String(raw));if(message.v!==1)return;
    if(message.type==='hello'){
      if(message.deviceId!==this.config.deviceId){this.socket.close(1008);return;}
      this.attempt=0;this.state('connected');this.ready();return;
    }
    if(this.phase!=='connected')return;
    if(message.type.startsWith('favorite.')){this.onAsset(message);return;}
    if(message.type==='actions.ack'&&Array.isArray(message.ids)&&message.ids.length<=24){this.onActionAck(message.ids.filter(id=>typeof id==='string'&&/^act-[a-z0-9-]{8,95}$/.test(id)));return;}
    if(message.type==='feeding.ack'&&typeof message.id==='string'&&/^fed-[a-f0-9]{32}$/.test(message.id)){this.onFeedbackAck(message.id);return;}
    if(message.type==='policy'){if(!Number.isSafeInteger(message.policy?.version))return;try{await this.onPolicy(message.policy);this.send({type:'policy.applied',version:message.policy.version});}catch{this.lastError='桌宠设置尚未应用';}return;}
    if(message.type==='speech'){
      if(typeof message.id!=='string'||message.id.length>100||typeof message.text!=='string'||!message.text.trim()||message.text.length>600||!['screen','qq'].includes(message.source)||!Number.isFinite(message.expiresAt)||message.expiresAt<Date.now()||message.expiresAt>Date.now()+65000)return;
      for(const [id,m] of this.messages)if(m.expiresAt<Date.now())this.messages.delete(id);
      if(this.messages.has(message.id))return;
      if(this.messages.size>=100)this.messages.delete(this.messages.keys().next().value);
      this.messages.set(message.id,{...message,displayed:false});this.onSpeech(message);return;
    }
    if(!['capture','action'].includes(message.type)||typeof message.id!=='string'||message.id.length>100||!Number.isFinite(message.expiresAt)||message.expiresAt<Date.now()||message.expiresAt>Date.now()+20000||this.requests.has(message.id))return;
    this.requests.add(message.id);if(this.requests.size>100)this.requests.delete(this.requests.values().next().value);
    if(message.type==='capture'){
      let capture;try{capture=await this.onCapture(message);}catch{capture={ok:false,error:'unavailable'};}
      if(message.expiresAt>=Date.now())this.send({type:'capture.result',id:message.id,capture});return;
    }
    let ok=false,reason='blocked';try{const result=await this.onAction(message);ok=result===true||result?.ok===true;reason=['noFavorite','differentSupport','empty','storage','timeout','blocked'].includes(result?.reason)?result.reason:'blocked';}catch{}
    if(message.expiresAt>=Date.now())this.send({type:'action.result',id:message.id,ok,...(!ok?{reason}:{}),action:message.action});
  }
  confirmDisplayed(id){const message=this.messages.get(id);if(!message||message.displayed||message.expiresAt<Date.now())return false;message.displayed=true;return this.send({type:'displayed',id,at:Date.now()});}
  event(event){return this.phase==='connected'&&this.send({type:'autonomy.event',...event});}
  activity(activity){return this.phase==='connected'&&this.send({type:'activity.status',activity});}
  observe(capture){return this.phase==='connected'&&this.send({type:'observation',capture});}
  stop(){this.enabled=false;this.generation++;clearTimeout(this.timer);this.timer=null;const socket=this.socket;this.socket=null;if(socket){socket.removeAllListeners('close');socket.terminate();}this.state('disconnected');}
}
module.exports={DeviceConnection,checkedConfig};
