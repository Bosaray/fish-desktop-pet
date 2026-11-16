'use strict';
// Repeated hit heartbeats must not reset native mouse capture.
function createMousePass(window){let last=null;return {update(hit,forced=false){const ignore=forced||!hit,forward=!forced;const key=ignore+':'+forward;if(key===last)return false;window.setIgnoreMouseEvents(ignore,{forward});last=key;return true;}};}
module.exports={createMousePass};
