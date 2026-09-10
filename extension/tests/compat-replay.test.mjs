import test from 'node:test';import assert from 'node:assert/strict';import {readFile,access,mkdtemp,writeFile,rm} from 'node:fs/promises';import vm from 'node:vm';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {replay} from './harness/compat-replay.mjs';import {importGolden} from '../scripts/import_golden.mjs';
import {goldenBundle} from '../scripts/compatibility-gate.mjs';
const ctx=vm.createContext({Date,URL});vm.runInContext(await readFile(new URL('../development/compat/sanitizer.js',import.meta.url),'utf8'),ctx);const S=ctx.PAIACompat;
function constructed(withDOM=false,structural=false){const chat='FAKE_CONVERSATION_0001',ids=['FAKE_USER_MESSAGE_001','FAKE_USER_MESSAGE_002','FAKE_ASSISTANT_MSG_001'];const raw={conversation_id:chat,mapping:Object.fromEntries(ids.map((id,i)=>[id,{message:{id,author:{role:i<2?'user':'assistant'},create_time:1710000000+i*60,update_time:1710000005+i*60,content:{content_type:'text',parts:['SYNTHETIC_ONLY']}}}]))};if(structural){raw.items=Object.values(raw.mapping).map(n=>n.message);delete raw.mapping;}const dom={tag:'main',attrs:{},children:ids.map((id,i)=>({tag:'div',attrs:{'data-message-id':id,'data-message-author-role':i<2?'user':'assistant',...(withDOM?{'data-message-created-at':new Date((1710000000+i*60)*1000).toISOString()}:{})},children:[{tag:'div',attrs:{class:'whitespace-pre-wrap'},children:[{text:true}]}]}))};return S.bundle(S.sanitize(raw,chat,{endpointClass:'other',contentType:'application/json'}),dom,ids.slice(0,2).map((id,i)=>withDOM?{id,domTime:new Date((1710000000+i*60)*1000).toISOString()}:id),'constructed-test');}
test('constructed toolchain: full MAIN fetch to buffer/drain to archive UI and sanitized click export',{timeout:60000},async()=>{await replay(constructed(),{verifyExport:true});});
test('constructed DOM plus response replay reaches very_high without changing resolver',{timeout:60000},async()=>{const b=constructed(true);assert.equal(b.files['expected-time.json'].messages[0].timeConfidence,'very_high');await replay(b,{verifyExport:true});});
test('negative control: no drain means early response cannot recover formal time',{timeout:60000},async()=>{await replay(constructed(),{disableDrain:true});});
test('Golden import scans first and refuses private content without writing target files',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'golden-import-'));try{const b=constructed();b.provenance='user-sampled';b.files['response.json'].body.title='PRIVATE TEXT';const p=join(temp,'sample.json');await writeFile(p,JSON.stringify(b));await assert.rejects(importGolden(p,pathToFileURL(temp+'/golden/')));await assert.rejects(access(join(temp,'golden/response.json')));}finally{await rm(temp,{recursive:true,force:true});}
});


test('browser refuses unknown private schema keys: no download, four safe self-test flags',{timeout:60000},async()=>{await replay(constructed(),{rejectSample:true});});
test('Golden import receipt binds all five sanitized files and detects tampering',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'golden-receipt-'));try{
  const b=constructed();b.provenance='user-sampled';const path=join(temp,'sample.json'),folder=pathToFileURL(temp+'/golden/');await writeFile(path,JSON.stringify(b));await importGolden(path,folder);assert.ok(await goldenBundle(folder));
  const f=JSON.parse(await readFile(new URL('expected-time.json',folder),'utf8'));f.messages[0].timeConfidence='unknown';await writeFile(new URL('expected-time.json',folder),JSON.stringify(f));await assert.rejects(goldenBundle(folder));
 }finally{await rm(temp,{recursive:true,force:true});}
});

test('unknown endpoint and unnamed collection require structural detector before exact identity recovery',{timeout:60000},async()=>{await replay(constructed(false,true),{verifyExport:true});});
test('negative control: disabling structural detector prevents unnamed collection recovery',{timeout:60000},async()=>{await replay(constructed(false,true),{disableDetector:true});});
