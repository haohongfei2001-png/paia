// No browser console, network, screenshot, tracing, credential or storage-state capture.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {launchQA,loadTarget,saveTarget,locateTarget,smoke} from './harness.mjs';
import {targetURL,safeReport} from './safe.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let qa,server,status=safeReport('STARTING','QA_START'),config=null,closed=false,controlOrigin='',authWait=false;
const csrf=randomBytes(24).toString('hex');
async function report(value){status=value;process.stdout.write(JSON.stringify(status)+'\n');if(qa)await writeFile(join(qa.local,'smoke-report.json'),JSON.stringify(status,null,2)+'\n',{mode:0o600});}
const html=()=>`<!doctype html><meta charset="utf-8"><title>PAIA 独立 QA 控制</title><style>body{max-width:720px;margin:60px auto;font:17px/1.7 system-ui}input{width:90%;padding:10px}button{padding:10px;margin:10px 0}pre{padding:16px;background:#eef2f5}</style><h1>独立 QA 浏览器</h1><p>只需首次登录，并在旁边 ChatGPT 标签中打开目标旧聊天；其余步骤自动完成。默认 A：本地仅记住不可逆别名。</p><p>请勿在本页填写密码。本页不会读取登录凭证、聊天正文或标题。</p><details><summary>B：可选的本地 URL 配置</summary><p>用于跨重启直接复用。URL 只存 QA 本地配置，不进 Git 或报告。</p><form method="post" action="/target"><input type="hidden" name="csrf" value="${csrf}"><input name="url" placeholder="目标聊天 URL" required autocomplete="off"><button>保存到本地并自动测试</button></form></details><h2>安全状态</h2><pre id="status"></pre><script>setInterval(()=>fetch('/status').then(r=>r.json()).then(s=>document.getElementById('status').textContent=JSON.stringify(s,null,2)),1000)</script>`;
async function main(){
 await report(status);qa=await launchQA();config=await loadTarget(qa.local);
 qa.context.on('close',()=>{closed=true;});
 server=createServer(async(req,res)=>{
  try{
   if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(html());}
   if(req.method==='GET'&&req.url==='/status'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify(status));}
   if(req.method==='POST'&&req.url==='/target'&&req.headers.origin===controlOrigin){
    let body='';for await(const part of req){body+=part;if(body.length>4096){res.writeHead(413);return res.end('INVALID_TARGET');}}
    const form=new URLSearchParams(body);if(form.get('csrf')!==csrf){res.writeHead(403);return res.end('INVALID_TARGET');}
    config=await saveTarget(qa.local,form.get('url'),'url');res.writeHead(303,{location:'/'});return res.end();
   }
   res.writeHead(404);res.end('NOT_FOUND');
  }catch{res.writeHead(400);res.end('INVALID_TARGET');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));controlOrigin='http://127.0.0.1:'+server.address().port;
 const control=await qa.context.newPage();await control.goto(controlOrigin);
 let page=qa.context.pages().find(p=>p.url().startsWith('https://chatgpt.com/'))||await qa.context.newPage();
 if(!config){try{await page.goto('https://chatgpt.com/auth/login',{waitUntil:'domcontentloaded',timeout:60000});}catch{}}
 else if(config.mode==='url'){try{await page.goto(config.url,{waitUntil:'domcontentloaded',timeout:60000});}catch{}}
 else if(!page.url().startsWith('https://chatgpt.com/')){try{await page.goto('https://chatgpt.com/',{waitUntil:'domcontentloaded',timeout:60000});}catch{}}
 await page.bringToFront();await report(safeReport('WAITING',config?'TARGET_ALIAS_UNAVAILABLE':'LOGIN_OR_TARGET_REQUIRED'));
 while(!closed){
  if(authWait){
   let ready=false;for(const p of qa.context.pages()){if(!p.url().startsWith('https://chatgpt.com/'))continue;ready ||= await p.locator('main [data-message-author-role="user"],[data-testid="profile-button"],[data-testid="accounts-profile-button"],[data-testid="user-menu-button"]').count().then(n=>n>0).catch(()=>false);}
   if(!ready){await delay(1000);continue;}authWait=false;
  }
  let url=config?await locateTarget(qa.context,config):null;
  if(!config){for(const p of qa.context.pages()){
   const candidate=targetURL(p.url());if(!candidate)continue;
   const visible=await p.locator('main [data-message-author-role="user"][data-message-id]').count().catch(()=>0);
   if(visible>0){config=await saveTarget(qa.local,candidate,'alias');url=candidate;page=p;break;}
  }}
  if(url){
   const current=qa.context.pages().find(p=>targetURL(p.url())===url);if(current)page=current;
   if(page.isClosed())page=await qa.context.newPage();
   const result=await smoke(page,url,{onReport:r=>{void report(r);}});
   await report(result);
   if(result.status==='WAITING'){authWait=true;await delay(1000);continue;}
   // Release the dedicated profile after completion so future runs need no manual browser shutdown.
   await writeFile(join(qa.local,'complete.json'),JSON.stringify(result)+'\n',{mode:0o600});await qa.close();server.close();return;
  }
  await delay(750);
 }
 await report(safeReport('WAITING','BROWSER_CLOSED'));
}
process.stdout.write(JSON.stringify({status:'STOPPED',reason:'QA_WORKFLOW_RETIRED'})+'\n');
process.on('SIGTERM',()=>{void qa?.close().finally(()=>server?.close());});
process.on('SIGINT',()=>{void qa?.close().finally(()=>server?.close());});
process.on('uncaughtException',()=>{void report(safeReport('FAIL','HARNESS_ERROR'));});
process.on('unhandledRejection',()=>{void report(safeReport('FAIL','HARNESS_ERROR'));});
