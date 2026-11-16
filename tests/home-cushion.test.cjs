const {test}=require('node:test'),a=require('node:assert/strict');
const {fixture}=require('./fixtures/home.cjs');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
async function observed(){
 const h=await fixture();let shapes=[];
 h.ctx.figure={labHandSide:()=>[50,h.ctx.LAB_CARRY_SIDE?-150:-80]};
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/object-core.js'),'utf8'),h.ctx);
 h.ctx.document.createElementNS=(_,tag)=>{const shape={tag};shapes.push(shape);return {style:{},appendChild(){},setAttribute(k,v){shape[k]=v;}};};
 h.paint=async()=>{shapes=[];await h.tick();return {nest:shapes.find(s=>s.fill==='#547f9c'),cushion:shapes.find(s=>s.fill==='#b7e7e4')};};
 let seq=0;h.place=(x,y,visible=true)=>{h.store.operate('prop',{operationId:'cushion-place-'+(++seq),name:'nest',x,y,visible});h.ctx.receive({type:'home-state',data:h.store.snapshot()});};
 return h;
}
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-6,`${x} != ${y}`);
test('R6 returned cushion follows two nest moves and width/height changes',async()=>{
 const h=await observed();await h.ctx.desktopHomeStart('nestRest');await h.tick(1800);
 a.equal(h.events.at(-1).phase,'completed');let p=await h.paint();const dx=p.cushion.cx-p.nest.cx,dy=p.cushion.cy-(p.nest.cy+6);
 for(const [x,y]of [[.7,.7],[.6,.8]]){h.place(x,y);p=await h.paint();near(p.cushion.cx-p.nest.cx,dx);near(p.cushion.cy-(p.nest.cy+6),dy);}
 h.ctx.innerWidth=1400;h.ctx.innerHeight=1100;p=await h.paint();near(p.cushion.cx-p.nest.cx,dx);near(p.cushion.cy-(p.nest.cy+6),dy);
});
test('R6 returned cushion scales locally, survives hiding, and can be taken next session',async()=>{
 const h=await observed();await h.ctx.desktopHomeStart('nestRest');await h.tick(1800);let p=await h.paint();const dx=p.cushion.cx-p.nest.cx,dy=p.cushion.cy-(p.nest.cy+6);
 for(const scale of [.5,.75,1.5]){h.ctx.productionState.cfg.scale=scale;p=await h.paint();near(p.cushion.cx-p.nest.cx,dx*scale/.75);near(p.cushion.cy-(p.nest.cy+6),dy*scale/.75);}
 h.place(.55,650/800,false);p=await h.paint();a.equal(p.cushion,undefined);a.equal(p.nest,undefined);
 h.ctx.productionState.cfg.scale=.75;h.place(.55,650/800);p=await h.paint();near(p.cushion.cx-p.nest.cx,dx);
 const previous=h.events.at(-1).actionId;
 a.equal(await h.ctx.desktopHomeStart('nestRest'),true);await h.tick(2400);a.equal(h.events.at(-1).phase,'completed');a.notEqual(h.events.at(-1).actionId,previous);p=await h.paint();near(p.cushion.cx-p.nest.cx,dx);
});
for(const frames of [1,90,1565])test(`R6 moving nest interrupts approach/rest/return at frame ${frames}`,async()=>{
 const h=await observed();await h.ctx.desktopHomeStart('nestRest');await h.tick(frames);h.place(.8,650/800);await h.tick(400);
 a.equal(h.ctx.desktopHomeActive(),false);a.equal(h.events.at(-1).phase,'interrupted');a.equal(h.events.at(-1).home.reason,'geometryChanged');a.equal(h.events.at(-1).home.cushionReturned,false);
});
for(const change of ['width','height','scale'])test(`R6 ${change} change during rest cancels without returned fact`,async()=>{
 const h=await observed();await h.ctx.desktopHomeStart('nestRest');await h.tick(100);
 if(change==='width')h.ctx.innerWidth+=100;else if(change==='height')h.ctx.innerHeight+=100;else h.ctx.productionState.cfg.scale=1.5;
 await h.tick(400);a.equal(h.events.at(-1).phase,'interrupted');a.equal(h.events.at(-1).home.cushionReturned,false);
});
test('R6 missing return anchor cannot report a returned cushion',async()=>{
 const h=await observed();await h.ctx.desktopHomeStart('nestRest');await h.tick(1565);h.ctx.labObjectPoint=()=>null;await h.tick(400);
 a.equal(h.events.at(-1).phase,'failed');a.equal(h.events.at(-1).home.cushionReturned,false);
});
test('R6 local placement refresh cancels rest, unrelated snapshot does not',async()=>{
 const h=await observed();await h.ctx.desktopHomeStart('nestRest');await h.tick(100);
 h.store.operate('stock',{operationId:'refresh-unrelated-stock',food:'fish'});
 h.ctx.dispatchEvent({type:'home-refresh',detail:h.store.snapshot()});a.equal(h.ctx.desktopHomeActive(),true);
 h.store.operate('prop',{operationId:'refresh-relocate-nest',name:'nest',x:.6,y:650/800,visible:true});
 h.ctx.dispatchEvent({type:'home-refresh',detail:h.store.snapshot()});await h.tick();
 a.equal(h.ctx.desktopHomeActive(),false);a.equal(h.events.at(-1).phase,'interrupted');a.equal(h.events.at(-1).home.cushionReturned,false);
});
