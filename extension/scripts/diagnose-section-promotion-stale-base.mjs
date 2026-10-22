// Opt-in synthetic diagnostic, outside automatic test discovery. No runtime edits.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const mode=process.argv[2];
if(!['observe','clock-rollback'].includes(mode)||Number(process.versions.node.split('.')[0])!==22)
 throw Error('Use Node22 and choose observe or clock-rollback. Injection is diagnostic, not historical causation.');
const root=new URL('../',import.meta.url),sourceURL=new URL('tests/ai-section-promotion-detached-proposal.test.mjs',root);
const source=await readFile(sourceURL,'utf8'),name='stage rollback preserves the exact original signed work for a fresh independently granted retry';
const start=source.indexOf(`test('${name}'`),end=source.indexOf('\n});',start)+4;
if(start<0||end<=start||source.indexOf(`test('${name}'`,start+1)!==-1)throw Error('Original case not uniquely located');
const original=source.slice(start,end),header=source.slice(0,source.indexOf("\ntest('"));
if(original.split('const f=await fixture();').length!==2)throw Error('Original fixture seam changed');
const sha=value=>createHash('sha256').update(value).digest('hex');
const directory=new URL('work/section-promotion-stale-diagnostic/',root);await mkdir(directory,{recursive:true});
const traceURL=new URL(mode+'.json',directory),probeURL=new URL(mode+'.mjs',directory);
const observer=`
import {writeFileSync as saveTrace} from 'node:fs';
const diagnostic={mode:${JSON.stringify(mode)},sourceSha256:${JSON.stringify(sha(source))},caseSha256:${JSON.stringify(sha(original))},node:process.version,phases:[],clock:{samples:0,backsteps:0,maxBackstepMs:0},injected:false};
const originalNow=Date.now;let lastWall=null,pendingRollback=false,ownerNumber=0,phase='fixture';
Date.now=()=>{const actual=originalNow(),value=pendingRollback?lastWall-1000:actual;pendingRollback=false;diagnostic.clock.samples++;if(lastWall!==null&&value<lastWall){diagnostic.clock.backsteps++;diagnostic.clock.maxBackstepMs=Math.max(diagnostic.clock.maxBackstepMs,lastWall-value);}lastWall=value;return value;};
const safeStack=error=>String(error?.stack||'').split('\\n').filter(line=>/^Error:|^    at /.test(line)).slice(0,12).map(line=>line.replaceAll(${JSON.stringify(fileURLToPath(root))},'extension/'));
async function tracedFixture(){
 const f=await fixture(),originalOwner=f.owner,close=f.close;
 f.owner=async options=>{
  const index=++ownerNumber,lease=await originalOwner(options);
  const guard=lease.service.retrieval.guard;
  for(const method of ['assertProcessingCurrent','assertProcessingFacts']){
   const originalMethod=guard[method];guard[method]=function(...args){
    if(method==='assertProcessingCurrent'&&diagnostic.mode==='clock-rollback'&&!diagnostic.injected&&phase==='owner2.stage'&&new Error().stack.includes('runFinalReadFences')){diagnostic.injected=true;pendingRollback=true;}
    try{return originalMethod.apply(this,args);}catch(error){
    if(diagnostic.phases.at(-1)?.phase===phase&&!diagnostic.phases.at(-1).innerRefusal)diagnostic.phases.at(-1).innerRefusal={method,stack:safeStack(error)};throw error;
   }};
  }
  for(const method of ['prepare','confirm','stage','activate']){
   const originalMethod=lease.service[method];lease.service[method]=async function(...args){
    const previous=phase;phase='owner'+index+'.'+method;
    const entry={phase,status:'pending',wallStarted:originalNow()},started=performance.now();diagnostic.phases.push(entry);
    try{const result=await originalMethod.apply(this,args);entry.status='fulfilled';return result;}
    catch(error){entry.status='rejected';entry.stack=safeStack(error);throw error;}
    finally{entry.elapsedMs=performance.now()-started;entry.budget={reads:lease.workBudget.reads,hashBytes:lease.workBudget.hashBytes,hashFields:lease.workBudget.hashFields};entry.grantRemainingMs=lease.expiresAt-originalNow();entry.aborted={request:lease.signal.signal.aborted,fields:lease.fieldSignal.signal.aborted,identity:lease.identitySignal.signal.aborted};phase=previous;}
   };
  }
  return lease;
 };
 f.close=async()=>{try{await close();}finally{Date.now=originalNow;saveTrace(${JSON.stringify(fileURLToPath(traceURL))},JSON.stringify(diagnostic,null,2)+'\\n');}};
 return f;
}
`;
// Only import resolution and the one fixture seam change. Every original assertion remains.
const imports=header.replace(/from '([^']+)'/g,(_all,path)=>`from ${JSON.stringify(path.startsWith('.')?new URL(path,sourceURL).href:path)}`);
await writeFile(probeURL,imports+observer+'\n'+original.replace('const f=await fixture();','const f=await tracedFixture();')+'\n');
const child=spawnSync(process.execPath,['--test','--test-reporter=tap',fileURLToPath(probeURL)],{cwd:fileURLToPath(root),encoding:'utf8',timeout:60000});
const output=(child.stdout||'')+(child.stderr||'');await writeFile(new URL(mode+'.tap',directory),output.replaceAll(fileURLToPath(root),'extension/'));
if(child.error)throw child.error;
const trace=JSON.parse(await readFile(traceURL,'utf8'));
console.log(JSON.stringify({mode,exitCode:child.status,trace},null,2));
// A controlled rejection stays a failed original test; it is never relabelled PASS.
process.exitCode=mode==='clock-rollback'&&!trace.injected?2:child.status??1;
