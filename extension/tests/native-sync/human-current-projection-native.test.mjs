import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../..',import.meta.url)),repo=resolve(root,'..'),req=createRequire(import.meta.url);
const digest=data=>createHash('sha256').update(data).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const fixture=join(root,'tests/native-sync/current-projection-native-fixture.mjs');
async function snapshot(){const paths=[];const walk=async(dir)=>{for(const item of await readdir(join(root,dir),{withFileTypes:true})){const p=dir+'/'+item.name;if(item.isDirectory())await walk(p);else if(item.name.endsWith('.js'))paths.push(p);}};await walk('core');paths.push('tests/native-sync/current-projection-native-fixture.mjs');const hashes={};for(const p of paths.sort())hashes[p]=digest(await readFile(join(root,p)));return {head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:git('status','--porcelain','--untracked-files=no'),hashes};}
let sourceProof;
for(const variant of ['source','release'])test('complete current pending Human projection genuine headless '+variant,{timeout:180000},async()=>{
 const before=await snapshot();assert.equal(before.dirty,'','freeze runtime/tests before native evidence');
 const runtime=variant==='source'?root:join(root,'work/current-release');
 if(variant==='release')assert.equal((await stat(join(runtime,'core/browser-native-sync/human-library-plan.js'))).isFile(),true,'build exact release once before this combined command');
 const served=new Map();let external=0,browser,server,session,rootSession,timer,sampling=false;const samples=[];
 let receipt={schema:1,variant,head:before.head,tree:before.tree,result:'IN_PROGRESS',sourceHashes:before.hashes,scope:'SYNTHETIC_NATIVE_CURRENT_PENDING_FAMILY_ONLY',scopeActivated:false,restoreActivated:false,providerActivated:false};
 try{
  server=createServer(async(request,response)=>{try{const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);if(path==='/'){response.writeHead(200,{'content-type':'text/html'});response.end('<!doctype html><title>Synthetic native prerequisite</title>');return;}const file=path==='/tests/native-sync/current-projection-native-fixture.mjs'?fixture:resolve(runtime,'.'+path);if(file!==fixture&&!file.startsWith(runtime+'/'))throw Error('invalid path');const data=await readFile(file);served.set(path.slice(1),digest(data));response.writeHead(200,{'content-type':['.js','.mjs'].includes(extname(file))?'text/javascript':'text/plain'});response.end(data);}catch{response.writeHead(404);response.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||req.resolve('playwright')).href);
  browser=await chromium.launch({headless:true});const context=await browser.newContext();await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external++;return route.abort();}return route.continue();});
  const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);session=await context.newCDPSession(page);rootSession=await browser.newBrowserCDPSession();
  const sample=async()=>{if(sampling)return;sampling=true;try{const heap=await session.send('Runtime.getHeapUsage'),pids=(await rootSession.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);const rss=execFileSync('ps',['-o','rss=','-p',pids.join(',')],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean).map(Number).reduce((a,b)=>a+b,0)*1024;samples.push({jsUsed:heap.usedSize,jsTotal:heap.totalSize,embedderUsed:heap.embedderHeapUsedSize??null,processRss:rss});}finally{sampling=false;}};
  await sample();timer=setInterval(()=>{sample().catch(()=>{});},25);
  const outcome=await page.evaluate(async()=>{const {runCurrentProjectionNativeCases}=await import('/tests/native-sync/current-projection-native-fixture.mjs');try{return await runCurrentProjectionNativeCases();}catch(error){return {status:'FAIL',cases:error.nativeCases??[],error:{name:error.name,message:error.message,code:error.code}};}});
  clearInterval(timer);timer=null;await sample();receipt={...receipt,browserVersion:browser.version(),locale:await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().locale),externalNetworkAttempts:external,...outcome,memory:{kind:'FINITE_SYNTHETIC_SAMPLED_JS_AND_BROWSER_PROCESS_RSS_INCLUDING_NATIVE_NOT_UNIVERSAL_HEAP_PROOF',sampleIntervalMs:25,samples,maxJsUsed:Math.max(...samples.map(s=>s.jsUsed)),maxProcessRss:Math.max(...samples.map(s=>s.processRss)),nativeOnlyPeak:'NOT_ISOLATED'},servedHashes:Object.fromEntries(served)};
  assert.equal(outcome.status,'SYNTHETIC_REAL_NATIVE_CASES_PASS_NOT_COMPLETE_SYNC',JSON.stringify(outcome));assert.equal(outcome.cases.length,17);assert.equal(outcome.cases.every(row=>row.result==='PASS'&&row.assertions>0),true);assert.equal(outcome.canonicalRowsRestored,true);assert.equal(external,0);
  for(const [path,hash]of served){assert.equal(hash,before.hashes[path],'exact imported source or fixture bytes: '+path);if(path.startsWith('core/'))assert.equal(digest(await readFile(join(runtime,path))),hash,'actual imported runtime remains unchanged');}
  const after=await snapshot();assert.deepEqual(after,before,'source/proof/git unchanged');
  const common={...after,names:outcome.cases.map(row=>row.name),servedHashes:receipt.servedHashes};if(variant==='source')sourceProof=common;else assert.deepEqual(common,sourceProof,'same exact production module closure, fixture, git and cases');receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.failure={name:error.name,message:error.message};throw error;}
 finally{if(timer)clearInterval(timer);await session?.detach().catch(()=>{});await rootSession?.detach().catch(()=>{});await browser?.close();if(server)await new Promise(r=>server.close(r));const out=join(root,'work/qa-current-projection-native');await mkdir(out,{recursive:true});await writeFile(join(out,variant+'.json'),JSON.stringify(receipt,null,2)+'\n');}
});
