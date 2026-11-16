const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('nest and box draw below shadow and pet; held layer stays separate and click-through',()=>{
 const node=tag=>({tag,children:[],attrs:{},style:{},setAttribute(k,v){this.attrs[k]=v;},appendChild(e){this.children.push(e);},insertBefore(e,b){this.children.splice(b?this.children.indexOf(b):0,0,e);},replaceChildren(){this.children=[];}});
 const stage=node('div'),svg=node('svg'),shadow=node('ellipse'),pet=node('g');svg.appendChild(shadow);svg.appendChild(pet);svg.firstChild=shadow;let receive;
 const ctx={window:null,document:{getElementById:id=>id==='stageSvg'?svg:stage,createElementNS:(_,tag)=>node(tag)},productionState:{cfg:{scale:.75}},desktopAPI:{onEvent:fn=>receive=fn},desktopBoot:new Promise(()=>{}),addEventListener(){},innerWidth:1000,innerHeight:800};ctx.window=ctx;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/renderer/home-adapter.js'),'utf8'),ctx);
 receive({type:'home-state',data:{items:[],props:{nest:{x:.5,y:.7,visible:true},box:{x:.5,y:.7,visible:true}}}});
 const ground=svg.children[0];a.equal(ground.attrs.id,'home-ground-props');a.equal(svg.children[1],shadow);a.equal(svg.children[2],pet);a.ok(ground.children.some(e=>e.tag==='rect'));a.ok(ground.children.some(e=>e.tag==='ellipse'));a.equal(stage.children[0].children.length,0);a.equal(ground.style.pointerEvents,'none');a.equal(stage.children[0].style.pointerEvents,'none');
});
