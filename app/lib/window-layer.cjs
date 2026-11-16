'use strict';
function createWindowLayer({window,enabled,setTimer=setTimeout,clearTimer=clearTimeout}){
 let pending=null,closed=false;
 function apply(){if(closed||window.isDestroyed()||!window.isVisible())return;window.setAlwaysOnTop(enabled()===true,enabled()?'screen-saver':'normal');if(enabled())window.moveTop();}
 function restore(){apply();if(pending)clearTimer(pending);pending=setTimer(()=>{pending=null;apply();},180);pending?.unref?.();}
 return {apply,restore,close(){closed=true;if(pending)clearTimer(pending);}};
}
module.exports={createWindowLayer};
