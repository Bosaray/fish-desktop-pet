const {test}=require('node:test'),a=require('node:assert/strict'),{choose}=require('../app/renderer/perch-target.js');
const bounds={minX:50,maxX:1950,minY:150,floorY:1000},pet={x:900,gy:600};
test('window with blocked 40 percent point still uses exposed right edge',()=>{const front={id:1,x:300,y:0,w:1000,h:800},back={id:2,x:800,y:300,w:1100,h:600};const p=choose([front,back],bounds,pet,.5);a.equal(p.window.id,2);a.ok(p.x>1300);});
test('fully covered or too-high window has no perch',()=>{a.equal(choose([{x:0,y:0,w:2000,h:1100},{x:500,y:300,w:500,h:600}],bounds,pet),null);});
