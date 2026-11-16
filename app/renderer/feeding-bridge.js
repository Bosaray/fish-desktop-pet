// Reuses the accepted three-bite animation without changing its bones or timing.
let homeFeed=null;window.labFeed=(kind,options={})=>{const c=window.ctl;if(!c||FEED||!['fish','cake'].includes(kind)||c.busy())return false;window.selectReviewExpression?.(null);c.act('stand');c.holdRoam(15);FEED={kind,start:null};homeFeed=options.feedId||null;if(!options.deferSatiety)window.desktopLife?.fed();return true;};
window.labFeeding=()=>!!FEED;
window.labStopFeed=feedId=>{if(feedId!=null&&homeFeed!==feedId)return false;const previous=FEED;FEED=null;if(previous)dispatchEvent(new CustomEvent('fish-feed-ended',{detail:{kind:previous.kind,feedId:homeFeed,completed:false}}));};
const originalFeedFrame=feedFrame;
feedFrame=function(o){const previous=FEED,result=originalFeedFrame(o);if(previous&&!FEED)dispatchEvent(new CustomEvent('fish-feed-ended',{detail:{kind:previous.kind,feedId:homeFeed,completed:previous.start!=null&&['idle','wake','sit'].includes(o.mode)&&o.t-previous.start>9.4}}));return result;};
