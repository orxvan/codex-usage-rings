function placement(bounds,screenTop,anchor){return {x:bounds.X+anchor.x-anchor.size/2,y:screenTop-bounds.Y-bounds.Height+anchor.y-anchor.size/2,size:anchor.size};}
function chooseWindow(list,pid){
 var selected=null,area=0;
 for(var i=0;i<list.length;i++){var w=list[i],b=w.kCGWindowBounds;
  if(w.kCGWindowOwnerPID!==pid || w.kCGWindowLayer!==0 || !b || b.Width<300 || b.Height<200)continue;
  var size=b.Width*b.Height;if(size>area){selected=w;area=size;}
 }
 if(!selected || selected.kCGWindowIsOnscreen!==true || selected.kCGWindowAlpha===0)return null;
 return selected.kCGWindowBounds;
}
function shouldShowForFrontApp(targetPID,frontPID,bundle,windows,bounds,lastCodexAt,now){
 if(frontPID===targetPID)return true;
 if(!lastCodexAt || now-lastCodexAt>20000)return false;
 if(/screencapture|screenshot/i.test(bundle))return true;
 if(!/com\.tencent\.(xinWeChat|WeChat)/i.test(bundle))return false;
 for(var i=0;i<windows.length;i++){var w=windows[i],b=w.kCGWindowBounds;
  if(w.kCGWindowOwnerPID===frontPID && w.kCGWindowIsOnscreen===true && w.kCGWindowLayer>=8 && b && b.Width>=bounds.Width*.9 && b.Height>=bounds.Height*.9)return true;
 }
 return false;
}
if(typeof module!=='undefined')module.exports={placement:placement,chooseWindow:chooseWindow,shouldShowForFrontApp:shouldShowForFrontApp};
