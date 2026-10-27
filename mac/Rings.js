ObjC.import('AppKit');
ObjC.import('Foundation');
ObjC.import('CoreGraphics');
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

var hoverPanel,hoverLabel,hoverSince=0,lastTooltip='',hoverError='',panel, view, reader, cachePath, state={}, defaults, lastFrame='', heartbeatPath;
var fm=$.NSFileManager.defaultManager;
var lastCodexFrontAt=0,frontBundle='',visibilityReason='';
var ringSize=24, anchor={x:26,y:60,size:24}, targetBounds=null, followTimer, dragging=false, followError='', targetVisible=false;
function followWindow(){
 try{
  if(dragging)return;
  var apps=$.NSRunningApplication.runningApplicationsWithBundleIdentifier($('com.openai.codex'));
  if(!apps.count){targetVisible=false;panel.orderOut(null);return;}
  var target=apps.objectAtIndex(0);
  var list=ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(16,0)));
  targetBounds=chooseWindow(list,target.processIdentifier);
  if(!targetBounds){targetVisible=false;panel.orderOut(null);return;}
  var front=$.NSWorkspace.sharedWorkspace.frontmostApplication;frontBundle=ObjC.unwrap(front.bundleIdentifier)||'';
  if(front.processIdentifier===target.processIdentifier)lastCodexFrontAt=Date.now();
  var ownFront=front.processIdentifier===$.NSProcessInfo.processInfo.processIdentifier;
  if(!ownFront && !shouldShowForFrontApp(target.processIdentifier,front.processIdentifier,frontBundle,list,targetBounds,lastCodexFrontAt,Date.now())){targetVisible=false;visibilityReason='other-app';panel.orderOut(null);return;}
  visibilityReason='codex-or-capture';
  var top=$.NSScreen.screens.objectAtIndex(0).frame.size.height;
  var p=placement(targetBounds,top,anchor);if(panel.frame.origin.x!==p.x || panel.frame.origin.y!==p.y)panel.setFrameOrigin($.NSMakePoint(p.x,p.y));
  targetVisible=true;if(!panel.isVisible)panel.orderFrontRegardless;followError='';
 }catch(e){followError=String(e);}
}
function updateHover(){
 try{
  if(!panel || !panel.isVisible){hoverSince=0;if(hoverPanel)hoverPanel.orderOut(null);return;}
  var mouse=$.NSEvent.mouseLocation,f=panel.frame;
  var inside=mouse.x>=f.origin.x && mouse.x<=f.origin.x+ringSize && mouse.y>=f.origin.y && mouse.y<=f.origin.y+ringSize;
  if(!inside){hoverSince=0;if(hoverPanel)hoverPanel.orderOut(null);return;}
  if(!hoverSince){hoverSince=Date.now();return;}
  if(Date.now()-hoverSince<350)return;
  if(!hoverPanel){
   hoverPanel=$.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(0,0,400,124),128,2,false);
   hoverPanel.level=4;hoverPanel.hidesOnDeactivate=false;hoverPanel.collectionBehavior=257;hoverPanel.ignoresMouseEvents=true;hoverPanel.hasShadow=true;
   hoverPanel.backgroundColor=$.NSColor.windowBackgroundColor;
   hoverLabel=$.NSTextField.alloc.initWithFrame($.NSMakeRect(12,10,376,104));
   hoverLabel.editable=false;hoverLabel.selectable=false;hoverLabel.bezeled=false;hoverLabel.drawsBackground=false;
   hoverLabel.font=$.NSFont.systemFontOfSize(12);hoverLabel.textColor=$.NSColor.labelColor;
   hoverPanel.contentView.addSubview(hoverLabel);
  }
  hoverLabel.stringValue=$(details());
  hoverPanel.setFrameOrigin($.NSMakePoint(f.origin.x+ringSize+8,f.origin.y));
  if(!hoverPanel.isVisible)hoverPanel.orderFrontRegardless;
  hoverError='';
 }catch(e){hoverError=String(e);}
}
function rememberAnchor(){if(!targetBounds)return;var f=panel.frame,top=$.NSScreen.screens.objectAtIndex(0).frame.size.height;anchor.x=f.origin.x+ringSize/2-targetBounds.X;anchor.y=f.origin.y+ringSize/2-(top-targetBounds.Y-targetBounds.Height);defaults.setDoubleForKey(anchor.x,$('anchorX'));defaults.setDoubleForKey(anchor.y,$('anchorY'));}

function readJSON(path){try{return JSON.parse(ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError($(path),$.NSUTF8StringEncoding,null)));}catch(e){return null;}}
function color(r,g,b,a){return $.NSColor.colorWithSRGBRedGreenBlueAlpha(r,g,b,a===undefined?1:a);}
function arc(radius,percent,c,width){
 c.setStroke;var p=$.NSBezierPath.bezierPath;p.lineWidth=width;p.lineCapStyle=1;
 p.appendBezierPathWithArcWithCenterRadiusStartAngleEndAngleClockwise($.NSMakePoint(26,26),radius,90,90-360*Math.max(0,Math.min(percent,100))/100,true);p.stroke;
}
function draw(){
 color(.10,.12,.15,.94).setFill;$.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius($.NSMakeRect(0,0,52,52),26,26).fill;
 var stale=!state.updatedAt || Date.now()-state.updatedAt>180000 || state.status!=='ready';
 arc(20,100,color(.35,.20,.28),4);arc(12,100,color(.18,.33,.29),4);
 if(state.fiveHour)arc(20,state.fiveHour.usedPercent,color(1,.33,.48,stale?.4:1),4);
 if(state.weekly)arc(12,state.weekly.usedPercent,color(.33,.90,.70,stale?.4:1),4);
 if(stale){color(1,.73,.28).setFill;$.NSBezierPath.bezierPathWithOvalInRect($.NSMakeRect(24,24,4,4)).fill;}
}
function details(){
 function row(label,w){return label+'：'+(w?('已用 '+Math.round(w.usedPercent)+'%'+(w.resetsAt?' · 重置 '+new Date(w.resetsAt*1000).toLocaleString('zh-CN'):'')):'当前账户未提供此额度');}
 var stale=!state.updatedAt || Date.now()-state.updatedAt>180000;
 return row('5 小时（粉色外圈）',state.fiveHour)+'\n'+row('每周（绿色内圈）',state.weekly)+'\n'+(state.status==='ready'?(stale?'数据已过期，正在重试':'每分钟刷新 · '+new Date(state.updatedAt).toLocaleTimeString('zh-CN')):(state.status||'正在连接 Codex…'))+'\n拖动移动 · 右键打开菜单';
}
function resetPosition(){anchor={x:26,y:60,size:24};defaults.removeObjectForKey($('anchorX'));defaults.removeObjectForKey($('anchorY'));followWindow();}
function savePosition(){}
function closeReader(){if(reader){try{reader.terminate;}catch(e){}reader=null;}}
function refresh(){closeReader();startReader();}
function stop(){savePosition();closeReader();$.NSApplication.sharedApplication.terminate(null);}
ObjC.registerSubclass({name:'RingsActions',superclass:'NSObject',methods:{
 'refresh:':{types:['void',['id']],implementation:function(sender){refresh();}},
 'reset:':{types:['void',['id']],implementation:function(sender){resetPosition();}},
 'tick:':{types:['void',['id']],implementation:function(sender){followWindow();updateHover();}},
 'stop:':{types:['void',['id']],implementation:function(sender){stop();}}
}});
var actions=$.RingsActions.alloc.init;
function menu(event){var menu=$.NSMenu.alloc.initWithTitle($('Codex Usage Rings'));
 [['立即刷新','refresh:'],['重置位置','reset:'],['退出圆环','stop:']].forEach(function(pair){var item=$.NSMenuItem.alloc.initWithTitleActionKeyEquivalent($(pair[0]),pair[1],$(''));item.target=actions;menu.addItem(item);});
 $.NSMenu.popUpContextMenuWithEventForView(menu,event,view);
}
ObjC.registerSubclass({name:'UsageRingView',superclass:'NSView',methods:{
 'drawRect:':{implementation:function(rect){$.NSGraphicsContext.saveGraphicsState;var t=$.NSAffineTransform.transform;t.scaleBy(ringSize/52);t.concat;draw();$.NSGraphicsContext.restoreGraphicsState;}},
 'mouseDown:':{types:['void',['id']],implementation:function(event){dragging=true;panel.performWindowDragWithEvent(event);rememberAnchor();dragging=false;}},
 'rightMouseDown:':{types:['void',['id']],implementation:function(event){menu(event);}}
}});
function startReader(){
 var resource=ObjC.unwrap($.NSBundle.mainBundle.resourcePath)+'/mac';
 var config=readJSON(resource+'/runtime.json');
 reader=$.NSTask.alloc.init;reader.executableURL=$.NSURL.fileURLWithPath($(config.node));
 reader.arguments=$([resource+'/reader.cjs','--output='+cachePath,'--parent='+$.NSProcessInfo.processInfo.processIdentifier]);
 reader.standardOutput=$.NSFileHandle.fileHandleWithNullDevice;reader.standardError=$.NSFileHandle.fileHandleWithNullDevice;
 try{reader.launch;}catch(e){state={status:'无法启动数据读取器，请检查 Node 路径'};}
}
function launchUI(){
 var app=$.NSApplication.sharedApplication;
 var others=$.NSRunningApplication.runningApplicationsWithBundleIdentifier($('local.codex.usage-rings.macos'));
 if(others.count>1){app.terminate(null);return;}
 app.setActivationPolicy(2);
 defaults=$.NSUserDefaults.standardUserDefaults;
 var support=ObjC.unwrap($.NSHomeDirectory())+'/Library/Application Support/CodexUsageRings';
 fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($(support),true,null,null);
 cachePath=support+'/usage.json';heartbeatPath=support+'/ui-status.json';
 panel=$.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(24,100,ringSize,ringSize),128,2,false);
 panel.opaque=false;panel.backgroundColor=$.NSColor.clearColor;panel.hasShadow=false;panel.level=3;
 panel.hidesOnDeactivate=false;panel.collectionBehavior=257;panel.releasedWhenClosed=false;panel.title=$('Codex Usage Rings');
 view=$.UsageRingView.alloc.initWithFrame($.NSMakeRect(0,0,ringSize,ringSize));panel.contentView=view;
 if(ObjC.unwrap(defaults.objectForKey($('anchorX')))!=null){anchor.x=defaults.doubleForKey($('anchorX'));anchor.y=defaults.doubleForKey($('anchorY'));if(defaults.integerForKey($('alignmentRevision'))<1){anchor.x+=2;defaults.setDoubleForKey(anchor.x,$('anchorX'));}}
 defaults.setIntegerForKey(1,$('alignmentRevision'));
 startReader();followWindow();followTimer=$.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(.1,actions,'tick:',null,true);idle();
}
function idle(){
 try{
  var latest=readJSON(cachePath);if(latest)state=latest;
  var tip=details();if(tip!==lastTooltip){view.toolTip=$(tip);lastTooltip=tip;}view.needsDisplay=true;panel.displayIfNeeded;savePosition();
  $(JSON.stringify({updatedAt:Date.now(),visible:!!panel.isVisible,readerRunning:reader?!!reader.running:false,status:state.status||'connecting',frame:{x:panel.frame.origin.x,y:panel.frame.origin.y,width:ringSize,height:ringSize},following:true,targetBounds:targetBounds,anchor:anchor,followError:followError,hoverVisible:hoverPanel?!!hoverPanel.isVisible:false,hoverError:hoverError,frontBundle:frontBundle,visibilityReason:visibilityReason})).writeToFileAtomicallyEncodingError($(heartbeatPath),true,$.NSUTF8StringEncoding,null);
 }catch(e){$(String(e)).writeToFileAtomicallyEncodingError($(heartbeatPath+'.error'),true,$.NSUTF8StringEncoding,null);}
 return 1;
}
function quit(){if(followTimer)followTimer.invalidate;closeReader();}

function run(){try{launchUI();}catch(e){$(String(e)+" line "+e.line+" "+e.stack).writeToFileAtomicallyEncodingError($(ObjC.unwrap($.NSHomeDirectory())+"/Library/Application Support/CodexUsageRings/startup-error.txt"),true,$.NSUTF8StringEncoding,null);}}
