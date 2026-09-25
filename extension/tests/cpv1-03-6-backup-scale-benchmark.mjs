// Hosted GitHub Actions diagnostic for VS-03 scale recovery. No local user profile or network data.
import assert from 'node:assert/strict';
import {createReadStream,createWriteStream} from 'node:fs';
import {cp,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
import {scaleBody} from './fixtures/scale-v092.mjs';

const size=Number(process.env.PAIA_BACKUP_SCALE_SIZE||10000);
const longContent=process.env.PAIA_BACKUP_SCALE_LONG_CONTENT==='1';
assert.ok(Number.isSafeInteger(size)&&size>=1000&&size<=100000);
const root=new URL('../',import.meta.url).pathname;
const dir=await mkdtemp(join(tmpdir(),'paia-backup-scale-'));
const output=process.env.PAIA_BACKUP_SCALE_REPORT||join(process.cwd(),'backup-scale-report.json');
const report={syntheticOnly:true,currentLive:false,platform:process.platform,size,longContent,phases:[],result:'INCOMPLETE'};
let harness;
const phase=(name)=>{report.phases.push({name,at:new Date().toISOString()});};
const worker=()=>{const found=harness.context.serviceWorkers().find(w=>w.url().includes('/background/service-worker.js'));assert.ok(found);return found;};
const open=async()=>{
 harness=await FakeChatGPT.start({extensionPath:dir,headless:true});
 await harness.archive.locator('#consent-check').check();
 await harness.archive.locator('#enable-consent').click();
};
try{
 await cp(root,dir,{recursive:true,filter:path=>{
  const relative=path.startsWith(root)?path.slice(root.length):path;
  return !/^(?:\.git|node_modules|work|outputs)(?:\/|$)/.test(relative);
 }});
 const path=join(dir,'background/service-worker.js');
 await writeFile(path,(await readFile(path,'utf8'))+
  "\nimport {seedScale} from '../tests/fixtures/scale-v092.mjs';globalThis.cpv1036={seed:n=>seedScale(store,n),backups,store};\n");
 await open();
 phase('seed');
 report.seed=await worker().evaluate(({size,longContent})=>globalThis.cpv1036.seed(size,{longContent}),{size,longContent});
 const count=await worker().evaluate(()=>globalThis.cpv1036.store.repository.transaction(false,async t=>({
  sources:await t.count('records'),inputs:await t.count('blocks')
 })));
 assert.equal(count.sources,size);assert.equal(count.inputs,size);
 report.sourceCounts=count;
 phase('export');
 const session=await worker().evaluate(async()=>{const value=await globalThis.cpv1036.backups.beginExport();globalThis.cpv1036.exportSession=value.sessionId;return value;});
 const stream=createWriteStream(join(dir,'backup.ndjson'));
 let itemCount=0,bytes=0,sequence=0,done=false;
 const write=async row=>{const line=JSON.stringify(row)+'\n';bytes+=Buffer.byteLength(line);if(!stream.write(line))await once(stream,'drain');};
 try{
  await write(session.header);
  while(!done){
   const page=await worker().evaluate(sequence=>globalThis.cpv1036.backups.exportPage({sessionId:globalThis.cpv1036.exportSession,sequence}),sequence);
   for(const row of page.items){await write(row);if(row.type==='item')itemCount++;}
   done=page.done;sequence++;
  }
 }finally{stream.end();await once(stream,'finish');}
 report.export={itemCount,bytes,pages:sequence};
 assert.ok(itemCount>=size*3,'all source, input and input-state rows must be exported');
 assert.equal(harness.externalRequests,0);
 await harness.close();harness=undefined;
 phase('restore');
 await open();
 const restore=await worker().evaluate(()=>globalThis.cpv1036.backups.beginRestore());
 let chunk=[],received=0;
 const input=createInterface({input:createReadStream(join(dir,'backup.ndjson')),crlfDelay:Infinity});
 for await(const line of input){
  if(!line)continue;chunk.push(JSON.parse(line));
  if(chunk.length===40){
   await worker().evaluate(({sessionId,items})=>globalThis.cpv1036.backups.stageRestore({sessionId,items}),{sessionId:restore.sessionId,items:chunk});
   received+=chunk.length;chunk=[];
  }
 }
 if(chunk.length){await worker().evaluate(({sessionId,items})=>globalThis.cpv1036.backups.stageRestore({sessionId,items}),{sessionId:restore.sessionId,items:chunk});received+=chunk.length;}
 report.restoreReceived=received;
 const preview=await worker().evaluate(sessionId=>globalThis.cpv1036.backups.previewRestore({sessionId}),restore.sessionId);
 report.preview={itemCount:preview.itemCount,bytes:preview.bytes,canRestore:preview.canRestore,reason:preview.reason||null};
 assert.equal(preview.canRestore,true);
 phase('activate');
 await worker().evaluate(({sessionId,confirmation})=>globalThis.cpv1036.backups.restore({sessionId,confirmation}),{sessionId:restore.sessionId,confirmation:preview.integrity});
 const restored=await worker().evaluate(()=>globalThis.cpv1036.store.repository.transaction(false,async t=>({
  sources:await t.count('records'),inputs:await t.count('blocks')
 })));
 assert.deepEqual(restored,count);
 report.restoredCounts=restored;
 if(longContent){
  const indices=[20,21,25,100,1000,size-1];
  const observed=await worker().evaluate(async indices=>globalThis.cpv1036.store.repository.transaction(false,async t=>{
   const values=[];
   for(const i of indices)values.push((await t.get('records','scale-record-'+String(i).padStart(8,'0')))?.value?.originalText);
   return values;
  }),indices);
  for(let n=0;n<indices.length;n++)assert.equal(observed[n],scaleBody(indices[n],true));
  assert.ok(bytes>10*1024*1024,'long-content export must exceed 10 MiB');
  report.longContentSamples=indices;
 }
 assert.equal(harness.externalRequests,0);
 assert.deepEqual(harness.errors,[]);
 report.result='PASS';
}catch(error){
 report.result='FAIL';
 report.error={name:error?.name||'Error',code:error?.code||null,message:String(error?.message||error)};
 throw error;
}finally{
 report.finishedAt=new Date().toISOString();
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 await harness?.close();
 await rm(dir,{recursive:true,force:true});
 console.log(JSON.stringify(report));
}
