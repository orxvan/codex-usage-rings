'use strict';
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {normalize}=require('./usage.cjs');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime.json'),'utf8'));
const args=process.argv.slice(2),once=args.includes('--once');
const output=args.find(x=>x.startsWith('--output='))?.slice(9) ?? path.join(__dirname,'usage.json');
const parent=Number(args.find(x=>x.startsWith('--parent='))?.slice(9));
let child,timer,watchdog,retry,buffer='',next=1,stopping=false,last={status:'connecting'},pending=new Map();
function write(value){last=value;fs.mkdirSync(path.dirname(output),{recursive:true});const tmp=output+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value),{mode:0o600});fs.renameSync(tmp,output);}
function status(message){write({...last,status:message});}
function send(method,params,kind){const id=next++;pending.set(id,{kind,time:Date.now()});child.stdin.write(JSON.stringify({id,method,params})+'\n');}
function poll(){if(child && !child.killed && ![...pending.values()].some(x=>x.kind==='usage'))send('account/rateLimits/read',{},'usage');}
function cleanup(){clearInterval(timer);clearInterval(watchdog);pending.clear();}
function stop(code=0){stopping=true;clearTimeout(retry);cleanup();if(child)child.kill();setTimeout(()=>process.exit(code),100).unref();}
function start(){
 buffer='';pending.clear();status('connecting');
 child=spawn(config.codex,['app-server','--listen','stdio://'],{stdio:['pipe','pipe','pipe'],env:{...process.env,PATH:path.dirname(config.node)+':'+path.dirname(config.codex)+':'+(process.env.PATH||'/usr/bin:/bin')}});
 child.stderr.resume();child.stdin.on('error',()=>{});
 child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
  buffer+=chunk;let pos;while((pos=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,pos);buffer=buffer.slice(pos+1);let m;try{m=JSON.parse(line);}catch{continue;}
   const request=pending.get(m.id);if(!request)continue;pending.delete(m.id);
   if(m.error){status('读取失败：'+String(m.error.message||'未知错误').slice(0,180));if(once)stop(2);continue;}
   if(request.kind==='initialize'){
    child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');poll();timer=setInterval(poll,60000);
   }else if(request.kind==='usage' && m.result){write(normalize(m.result));if(once){console.log(JSON.stringify(last));stop();}}
  }
 });
 child.on('error',()=>status('无法启动 Codex CLI'));
 child.on('exit',()=>{cleanup();if(!stopping){status('连接中断，15 秒后重试');if(once)stop(2);else retry=setTimeout(start,15000);}});
 watchdog=setInterval(()=>{if([...pending.values()].some(x=>Date.now()-x.time>30000)){status('请求超时，正在重连');child.kill();}},5000);
 send('initialize',{clientInfo:{name:'codex-usage-rings-macos',version:'1.0.0'}},'initialize');
}
if(parent)setInterval(()=>{try{process.kill(parent,0);}catch{stop();}},3000).unref();
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
start();
