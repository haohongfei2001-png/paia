import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Each child has a genuinely cold ESM registry: no production preload, loader,
// browser, database or network. In particular, importing the runner first in
// this parent would hide the local-session/repository/worker entrypoint cycle.
const root=new URL('../',import.meta.url);
function cold(entry,body){
 const script=`import assert from 'node:assert/strict';
 globalThis.fetch=()=>assert.fail('cold module checks must not use the network');
 const entry=process.argv[1];
 ${body}`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',script,new URL(entry,root).href],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:''},timeout:15000});
 assert.equal(result.error,undefined,result.error?.message);
 assert.equal(result.signal,null,result.stderr);
 assert.equal(result.status,0,result.stdout+result.stderr);
}

for(const entry of ['core/ai-usage/local-maintenance-session.js','core/ai-usage/maintenance-runner.js','core/idb-repository.js']){
 test(`cold ${entry} evaluates its actual production dependency closure`,()=>cold(entry,`
  const module=await import(entry);
  assert.ok(Object.keys(module).length>0);
 `));
}

test('cold actual service-worker entry reaches its first host use without an initialization-cycle failure',()=>cold('background/service-worker.js',`
 // Stop at the first actual entry-body host use, not in a substituted module.
 // This does NOT qualify storage startup, consent UI, or native Chrome. The
 // original native-bootstrap descriptor capture never invokes this accessor.
 let reads=0,stop;
 Object.defineProperty(globalThis,'chrome',{configurable:true,get(){reads++;throw stop=new Error('SYNTHETIC_WORKER_HOST_BOUNDARY');}});
 await assert.rejects(import(entry),error=>error===stop&&/background\\/service-worker\\.js/.test(error.stack));
 assert.equal(reads,1);
`));

test('owner-captured availability stays original before runner use and keeps default-null and identity denials',()=>cold('core/ai-usage/local-maintenance-session.js',`
 const {LocalMaintenanceSession,readLocalMaintenanceSessionAvailability}=await import(entry);
 const {createMaintenanceRunner,readMaintenanceRunnerSession}=await import(new URL('maintenance-runner.js',entry));
 let touches=0,poisonCalls=0;
 const store=new Proxy({}, {get(){touches++;throw Error('default-null cannot inspect the store');}});
 const session=new LocalMaintenanceSession(store);
 assert.equal(readLocalMaintenanceSessionAvailability(session),false);
 for(const fake of [{},Object.create(LocalMaintenanceSession.prototype),null])assert.throws(()=>readLocalMaintenanceSessionAvailability(fake),TypeError);
 const descriptor=Object.getOwnPropertyDescriptor(LocalMaintenanceSession.prototype,'available');
 let runner;
 try{
  Object.defineProperty(LocalMaintenanceSession.prototype,'available',{...descriptor,value(){poisonCalls++;return true;}});
  assert.equal(readLocalMaintenanceSessionAvailability(session),false);
  runner=createMaintenanceRunner(store,null);
  assert.equal(readMaintenanceRunnerSession(runner,store),null);
  assert.equal(poisonCalls,0);
  assert.equal(touches,0);
 }finally{Object.defineProperty(LocalMaintenanceSession.prototype,'available',descriptor);}
 const foreign=new Proxy({}, {get(){assert.fail('foreign stores must not be touched');}});
 assert.throws(()=>readMaintenanceRunnerSession(runner,foreign),error=>error.code==='UNAVAILABLE');
 for(const fake of [{...runner},Object.create(runner),null])assert.throws(()=>readMaintenanceRunnerSession(fake,store),error=>error.code==='UNAVAILABLE');
 assert.equal((await runner.wake()).state,'UNAVAILABLE');
 assert.equal(touches,0);
 runner.dispose();session.dispose();
 assert.throws(()=>readMaintenanceRunnerSession(runner,store),error=>error.code==='UNAVAILABLE');
 assert.equal(touches,0);
`));
