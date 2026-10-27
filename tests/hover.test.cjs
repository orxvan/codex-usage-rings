const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
test('hover shows both reset times after delay and hides when ring hides',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../mac/Rings.js'),'utf8');let now=1000,visible=false;
 const bridge=x=>x;Object.assign(bridge,{NSEvent:{mouseLocation:{x:20,y:20}},NSMakePoint:(x,y)=>({x,y})});
 const hover={orderOut:()=>{visible=false},setFrameOrigin:()=>{}};Object.defineProperty(hover,'isVisible',{get:()=>visible});Object.defineProperty(hover,'orderFrontRegardless',{get(){visible=true}});
 const context={$:bridge,Date:class extends Date{static now(){return now}},state:{status:'ready',updatedAt:1000,fiveHour:{usedPercent:31,resetsAt:1793120880},weekly:{usedPercent:35,resetsAt:1793600695}},panel:{isVisible:true,frame:{origin:{x:10,y:10}}},ringSize:24,hoverPanel:hover,hoverLabel:{},hoverSince:0,hoverError:''};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function details(){'),source.indexOf('function resetPosition(){'))+source.slice(source.indexOf('function updateHover(){'),source.indexOf('function rememberAnchor(){')),context);
 vm.runInContext('updateHover()',context);assert.equal(visible,false);now=1400;vm.runInContext('updateHover()',context);
 assert.equal(visible,true);assert.equal((context.hoverLabel.stringValue.match(/重置/g)||[]).length,2);assert.equal(context.hoverError,'');
 context.panel.isVisible=false;vm.runInContext('updateHover()',context);assert.equal(visible,false);
});
