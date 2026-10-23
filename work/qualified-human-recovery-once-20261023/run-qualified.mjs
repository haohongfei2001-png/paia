import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {instrumentedExtension,startNative,root} from '../../extension/tests/native-sync/storage-harness.mjs';
const mode=process.argv[2];assert.ok(['small','once'].includes(mode));
if(mode==='once')assert.equal(process.env.PAIA_QUALIFIED_129_ONCE,'approved');
const here=fileURLToPath(new URL('.',import.meta.url)),output=join(here,mode==='small'?'small-qualified':'once');await mkdir(output,{recursive:true});
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');assert.equal(git('diff','--name-only','HEAD','--','core','background','ui','content'),'','runtime must be committed');const runtimeFiles=git('ls-files','core','background','ui','content').split('\n').filter(Boolean);
const vector=async()=>Object.fromEntries(await Promise.all(runtimeFiles.map(async name=>[name,hash(await readFile(join(root,name)))])));
const before=await vector(),receipt={mode,head,groups:mode==='small'?3:129,coldPrefix:mode==='small'?1:64,result:'IN_PROGRESS',node:process.version,platform:process.platform,arch:process.arch,fullSyncQualification:false,cloudExecuted:false,startedAt:new Date().toISOString()};
await writeFile(join(output,'STARTED.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
await writeFile(join(output,'source-vector.json'),JSON.stringify(before,null,2));
let extension,browser,failed=false;const started=performance.now(),memory=[];
const sample=setInterval(()=>memory.push({atMs:performance.now()-started,nodeHost:process.memoryUsage()}),1000);
const save=async(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2));
try{
 let fixture=await readFile(join(here,'qualified-fixture.mjs'),'utf8');
 if(mode==='small'){
  assert.equal(fixture.split('const COUNT=129,PREFIX=64,').length,2);
  fixture=fixture.replace('const COUNT=129,PREFIX=64,','const COUNT=3,PREFIX=1,').replaceAll('qualified-129','qualified-small').replaceAll('synthetic_qualified_129','synthetic_qualified_small');
 }
 await writeFile(join(output,'executed-fixture.mjs'),fixture);
 receipt.fixtureSha256=hash(fixture);
 extension=await instrumentedExtension(root);
 await cp(join(root,'tests/native-sync/structural-correction-bridge.mjs'),join(extension.path,'background/generation-purge-assert.mjs'));
 await writeFile(join(extension.path,'background/qualified-recovery-fixture.mjs'),fixture);
 const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8'),marker="import './bns-native-storage-fixture.mjs';";assert.equal(original.split(marker).length,2);
 await writeFile(worker,original.replace(marker,marker+"\nimport './qualified-recovery-fixture.mjs';"));
 assert.deepEqual(Object.fromEntries(await Promise.all(runtimeFiles.filter(name=>name!=='background/service-worker.js').map(async name=>[name,hash(await readFile(join(extension.path,name)))]))),Object.fromEntries(Object.entries(before).filter(([name])=>name!=='background/service-worker.js')));
 browser=await startNative(extension.path);receipt.browserVersion=browser.browserVersion;const prefix=mode==='small'?'qualified-small':'qualified-129';
 const preparation=await browser.call(prefix+'-prepare');await save('preparation.json',preparation);
 assert.equal(preparation.schedule.groups,receipt.groups);assert.ok(preparation.schedule.references<=4096);
 await save('checkpoint-byte-hashes.json',preparation.objects.map(({ref,hex})=>({ref,bytes:hex.length/2,sha256:hash(Buffer.from(hex,'hex'))})));
 // There is exactly one continuation call, with no retry on any outcome.
 const result=await browser.call(prefix+'-continue');await save('result.json',result);assert.equal(result.result,'PASS');receipt.result='PASS';receipt.schedule=result.schedule;receipt.ledger=result.ledger;receipt.work=result.work;
}catch(error){failed=true;receipt.result='FAIL';receipt.error={message:error.message,stack:error.stack};process.exitCode=1;}
finally{
 clearInterval(sample);receipt.wallMs=performance.now()-started;receipt.memoryScope='Node orchestration process samples only; browser heap/process peak UNKNOWN';await save('memory-samples.json',memory);
 if(browser){try{await save('terminal-evidence.json',await browser.call(mode==='small'?'qualified-small-evidence':'qualified-129-evidence'));}catch(error){failed=true;receipt.evidenceError=error.message;process.exitCode=1;}
  try{receipt.isolation=await browser.isolation();}catch(error){failed=true;receipt.isolationError=error.message;process.exitCode=1;}}
 const after=await vector();receipt.sourceStable=JSON.stringify(before)===JSON.stringify(after);if(!receipt.sourceStable){failed=true;process.exitCode=1;await save('source-after.json',after);}
 if(failed)receipt.result='FAIL';await save('receipt.json',receipt);await browser?.close();await extension?.cleanup();
 console.log(JSON.stringify({mode,result:receipt.result,head,groups:receipt.groups,wallMs:receipt.wallMs,sourceStable:receipt.sourceStable,error:receipt.error?.message}));
}
