const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'usage.json');
const cli = path.join(process.env.APPDATA, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
let child, buffer = '', next = 1, timer;
function start() {
  child = spawn(process.execPath, [cli, 'app-server'], {windowsHide:true, stdio:['pipe','pipe','ignore']});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk; const lines = buffer.split('\n'); buffer = lines.pop();
    for (const line of lines) { try { const m=JSON.parse(line);
      if (m.id===1) { child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n'); poll(); timer=setInterval(poll,60000); }
      else if (m.result?.rateLimits) { const {primary,secondary}=m.result.rateLimits; fs.writeFileSync(out, JSON.stringify({primary,secondary,updatedAt:Date.now()})); }
    } catch {} }
  });
  child.on('error', () => {});
  child.on('exit', () => { clearInterval(timer); setTimeout(start,15000); });
  child.stdin.write(JSON.stringify({id:1,method:'initialize',params:{clientInfo:{name:'codex-usage-rings',version:'1.0'}}})+'\n');
}
function poll(){ if(child && !child.killed) child.stdin.write(JSON.stringify({id:++next,method:'account/rateLimits/read',params:{}})+'\n'); }
start();
