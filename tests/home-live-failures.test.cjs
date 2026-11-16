const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./fixtures/home.cjs'),{setup}=require('./fixtures/priority.cjs');
async function real(){const h=await fixture();h.ctx.figure={labHandSide:()=>[50,h.ctx.LAB_CARRY_SIDE?-150:-80]};vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/object-core.js'),'utf8'),h.ctx);return h;}
for(const mode of ['sit','sleep'])test(`manual home command wakes ${mode} and reaches a nest at a different height`,async()=>{
 const h=await real();h.c.act(mode);h.store.operate('prop',{operationId:'manual-move-nest',name:'nest',x:.5,y:500/800,visible:true});h.ctx.receive({type:'home-state',data:h.store.snapshot()});
 const startY=h.c.pet.fy;a.equal(await h.ctx.desktopHomeStart('nestRest'),true);a.equal(h.c.pet.fy,startY);
 let maxStep=0,last=startY;for(let i=0;i<2700;i++){await h.tick();maxStep=Math.max(maxStep,Math.abs(h.c.pet.fy-last));last=h.c.pet.fy;}
 a.ok(maxStep<10,`vertical step ${maxStep}`);a.equal(h.events.at(-1).phase,'completed');a.ok(Math.abs(h.c.pet.gy-500)<8);
});
test('autonomy stays unable to wake resting pet and owner grab remains protected',async()=>{
 const h=await real();h.c.act('sit');a.equal(await h.ctx.desktopHomeStart('nestRest',{trigger:'autonomy'}),false);h.grab();a.equal(await h.ctx.desktopHomeStart('nestRest'),false);
});
test('snack route reaches a different-height box then opens exactly one portion',async()=>{
 const h=await real();h.store.operate('prop',{operationId:'manual-move-box',name:'box',x:.5,y:500/800,visible:true});h.ctx.receive({type:'home-state',data:h.store.snapshot()});
 a.equal(await h.ctx.desktopHomeStart('snackEat'),true);await h.tick(1100);a.equal(h.store.snapshot().items[0].state,'opened');a.equal(h.ctx.labFeeding(),true);h.completeFeed();await h.tick(10);a.equal(h.store.snapshot().items[0].state,'eaten');a.equal(h.fed,1);
});
test('local menu awaits refusal, shows a bubble and reports a structured result',async()=>{
 const h=await setup(path.join(__dirname,'../app/renderer/desktop-actions.js'));const bubbles=[],results=[];h.ctx.labDialogue={receive:t=>bubbles.push(t)};h.ctx.desktopAPI.localResult=r=>results.push(r);h.ctx.desktopHomeStart=async()=>{h.ctx.desktopCommandFailureCode='empty';return false;};
 await h.ctx.desktopLocalCommand('snackEat');a.match(bubbles[0],/存|空/);a.equal(results[0].code,'empty');a.equal(results[0].ok,false);
});
test('outside-stage nest refuses before creating an action',async()=>{const h=await real();h.store.operate('prop',{operationId:'out-of-bounds-nest',name:'nest',x:0,y:0,visible:true});h.ctx.receive({type:'home-state',data:h.store.snapshot()});a.equal(await h.ctx.desktopHomeStart('nestRest'),false);a.equal(h.events.length,0);});
test('manual favorite wakes first and still completes its display and return',async()=>{const h=await real();h.c.act('sleep');a.equal(await h.ctx.desktopHomeStart('showFavorite'),true);await h.tick(1000);a.equal(h.events.at(-1).phase,'completed');a.equal(h.events.at(-1).home.returned,true);});
