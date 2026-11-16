'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
class DesktopAssets{
 constructor({now=Date.now,profile}={}){this.now=now;this.folder=profile&&path.join(profile,'favorite-cache');this.catalog=[];this.cache=new Map();this.transfer=null;if(this.folder){fs.mkdirSync(this.folder,{recursive:true});for(const name of fs.readdirSync(this.folder).filter(n=>/^[a-f0-9]{64}\.png$/.test(n)).slice(-24)){try{const b=fs.readFileSync(path.join(this.folder,name));if(b.length<=196608&&b.length>=24&&b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')this.cache.set(name.slice(0,64),b);}catch{}}}}
 receive(m){
  if(m.type==='favorite.catalog.result'){this.catalog=(m.items||[]).filter(i=>/^[a-f0-9]{64}$/.test(i.assetId)).slice(0,24);return;}
  if(m.type==='favorite.asset.begin'){if(!this.catalog.some(i=>i.assetId===m.assetId)||!Number.isInteger(m.size)||m.size<1||m.size>196608||!/^[a-f0-9]{64}$/.test(m.hash))throw Error('图片清单无效');this.transfer={...m,at:this.now(),chunks:[],sizeReceived:0};return;}
  const t=this.transfer;if(!t||m.transferId!==t.transferId||this.now()-t.at>15000){this.transfer=null;return;}
  if(m.type==='favorite.asset.chunk'){if(!Number.isInteger(m.seq)||m.seq<0||m.seq>=32||typeof m.data!=='string'||m.data.length>8192||!/^[A-Za-z0-9+/]+=*$/.test(m.data))throw Error('图片分块无效');if(m.seq<t.chunks.length)return;if(m.seq!==t.chunks.length)throw Error('图片分块顺序无效');const b=Buffer.from(m.data,'base64');t.sizeReceived+=b.length;if(b.length>6144||t.sizeReceived>t.size)throw Error('图片超限');t.chunks.push(b);return;}
  if(m.type==='favorite.asset.end'){this.transfer=null;const b=Buffer.concat(t.chunks);if(b.length!==t.size||createHash('sha256').update(b).digest('hex')!==t.hash||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.length<24||b.readUInt32BE(16)<1||b.readUInt32BE(20)<1||b.readUInt32BE(16)>384||b.readUInt32BE(20)>384)throw Error('图片校验失败');this.cache.delete(t.assetId);this.cache.set(t.assetId,b);if(this.folder){const f=path.join(this.folder,t.assetId+'.png');fs.writeFileSync(f+'.tmp',b);fs.renameSync(f+'.tmp',f);}while(this.cache.size>24){const key=this.cache.keys().next().value;this.cache.delete(key);if(this.folder)try{fs.unlinkSync(path.join(this.folder,key+'.png'));}catch{}}return true;}
 }
 clear(){this.transfer=null;}
}
module.exports={DesktopAssets};
