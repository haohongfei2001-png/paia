import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),root=new URL('../',import.meta.url).pathname;
for(const name of ['readableEntry','sourcePresent','isFiltered','canonicalTopic'])for(const replace of [false,true])test(`fresh original ${name} declaration loaded before consumer: ${replace?'reject replaced method':'accept original method'}`,async t=>{
 const module=name==='isFiltered'?'smart-filter-store.js':'thought-store.js',owner=name==='isFiltered'?'SmartFilterStore':'LibraryFoundationStore';
 const script=`
  import assert from 'node:assert/strict';
  const {${owner}:Owner}=await import('./core/${module}');
  const descriptor=Object.getOwnPropertyDescriptor(Owner.prototype,'${name}');
  let armed=false,calls=0;
  if(${replace})Object.defineProperty(Owner.prototype,'${name}',{...descriptor,value:async function(...args){if(armed)calls++;return descriptor.value.apply(this,args);}});
  const {fixture,material}=await import('./tests/harness/organize-material-method-fixture.mjs');
  const {captureOriginalOrganizeScopeReader}=await import('./background/organize-processing-policy.js');
  const cleanup=[],f=await fixture({after(fn){cleanup.push(fn);}},{input:true});
  try{
   let captured=false,result;
   result=await f.read(async(_reader,grant,tx)=>{armed=true;const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);captured=true;return material(f,tx,cap);}).then(value=>({value}),error=>({error}));
   console.log(JSON.stringify({name:'${name}',replace:${replace},captured,returned:!!result.value,calls,error:result.error?.code}));
   if(${replace}){assert.equal(captured,false,'preloaded replacement must not acquire a real material capability');assert.equal(calls,0);assert.ok(result.error);}
   else{assert.equal(result.value?.topic.id,f.topic.id);assert.equal(result.value?.inputs.length,1);}
  }finally{Object.defineProperty(Owner.prototype,'${name}',descriptor);for(const close of cleanup.reverse())await close();}
 `;
 try{const {stdout}=await exec(process.execPath,['--input-type=module','-e',script],{cwd:root,maxBuffer:1024*1024});t.diagnostic(stdout.trim());}
 catch(error){t.diagnostic(error.stdout||'');t.diagnostic(error.stderr||'');throw error;}
});
