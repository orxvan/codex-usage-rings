const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const {placement,chooseWindow,shouldShowForFrontApp}=require('../mac/follow.js');
function followWith(windows,bundle="com.tencent.xinWeChat"){
 const source=fs.readFileSync(require('node:path').join(__dirname,'../mac/Rings.js'),'utf8');
 let visible=false;
 const target={processIdentifier:10};
 const bridge=x=>x;
 Object.assign(bridge,{NSRunningApplication:{runningApplicationsWithBundleIdentifier:()=>({count:1,objectAtIndex:()=>target})},NSWorkspace:{sharedWorkspace:{frontmostApplication:{processIdentifier:20,bundleIdentifier:bundle}}},NSProcessInfo:{processInfo:{processIdentifier:30}},CGWindowListCopyWindowInfo:()=>windows,NSScreen:{screens:{objectAtIndex:()=>({frame:{size:{height:1080}}})}},NSMakePoint:(x,y)=>({x,y})});
 const context={placement,chooseWindow,shouldShowForFrontApp,$:bridge,ObjC:{unwrap:x=>x,deepUnwrap:x=>x,castRefToObject:x=>x},lastCodexFrontAt:Date.now(),dragging:false,anchor:{x:24,y:60,size:24},panel:{frame:{origin:{x:0,y:0}},orderOut:()=>{visible=false},setFrameOrigin:()=>{}}};
 Object.defineProperty(context.panel,'orderFrontRegardless',{get(){visible=true}});
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function followWindow(){'),source.indexOf('function rememberAnchor(){'))+'\nfollowWindow();',context);
 assert.equal(context.followError||'','');return visible;
}
test('WeChat foreground does not hide a visible Codex window ring',()=>{
 assert.equal(followWith([{kCGWindowOwnerPID:10,kCGWindowLayer:0,kCGWindowIsOnscreen:true,kCGWindowBounds:{X:0,Y:25,Width:1200,Height:900}},{kCGWindowOwnerPID:20,kCGWindowLayer:25,kCGWindowIsOnscreen:true,kCGWindowBounds:{Width:1920,Height:1080}}]),true);
});
test('ring still hides when Codex has no on-screen window',()=>{assert.equal(followWith([]),false)});
