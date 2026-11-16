'use strict';
// Electron supplies DIP coordinates without waiting for the native RPC queue.
function sampleCursor({screen,display,send,visible}){if(!visible())return false;const p=screen.getCursorScreenPoint(),d=display();if(!p||!d||![p.x,p.y,d.bounds.x,d.bounds.y].every(Number.isFinite))return false;send('cursor',{x:p.x-d.bounds.x,y:p.y-d.bounds.y});return true;}
module.exports={sampleCursor};
