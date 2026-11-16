// One lottery per eligible intent, independent of rendering frame rate.
(function(root){
 class Autonomy {
  constructor({random=Math.random,now=()=>performance.now()}={}){this.random=random;this.now=now;this.lastCheck=0;this.cooldowns={};this.recent=[];this.satiety=70;this.activeSeconds=0;}
  record(row){this.recent.push(row);if(this.recent.length>24)this.recent.shift();return row;}
  tick(seconds,{visible=true,connected=true,paused=false}={}){if(!visible||!connected||paused)return;const dt=Math.min(2,Math.max(0,seconds));this.activeSeconds+=dt;this.satiety=Math.max(0,this.satiety-dt/120);}
  fed(){this.satiety=Math.min(100,this.satiety+35);}
  check(policy,eligible,execute){const now=this.now();if(!policy?.enabled||now-this.lastCheck<policy.checkIntervalSec*1000)return false;this.lastCheck=now;
   const choices=eligible.filter(id=>policy.behaviors[id]?.enabled);if(!choices.length)return false;
   // Uniformly choose a candidate, then apply its independent configured gate.
   const offset=Math.floor(this.random()*choices.length);for(let i=0;i<choices.length;i++){
    const id=choices[(i+offset)%choices.length],rule=policy.behaviors[id];if(now<(this.cooldowns[id]||0))continue;
    const roll=this.random()*100,passed=roll<rule.probability,row=this.record({at:Date.now(),id,roll:Number(roll.toFixed(4)),threshold:rule.probability,reason:passed?'passed':'probability'});
    // One attempt per behavior per cooldown, including rejected intents: no redraw loops.
    this.cooldowns[id]=now+Math.max(policy.checkIntervalSec,rule.cooldownSec)*1000;
    if(passed){try{const result=execute(id);row.outcome=result?.outcome||(result===true?'started':'blocked');row.detail=String(result?.detail||(result===true?'动作已开始':'动作未受理')).slice(0,120);if(result?.completion)Promise.resolve(result.completion).then(ok=>{row.outcome=ok?'started':'blocked';row.detail=ok?'走到合适位置，动作已开始':'准备动作时被中断或没有足够空间';},()=>{row.outcome='blocked';row.detail='准备动作未完成';});}catch{row.outcome='blocked';row.detail='动作执行异常';}return true;}
   }return false;
  }
  snapshot(){return {satiety:Math.round(this.satiety),activeMinutes:Math.round(this.activeSeconds/60),nonlethal:true,offlineFrozen:true,recent:this.recent};}
 }
 if(typeof module==='object')module.exports={Autonomy};else root.DesktopAutonomy=Autonomy;
})(globalThis);
