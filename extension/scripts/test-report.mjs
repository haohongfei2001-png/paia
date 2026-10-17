import {writeFile,mkdir} from 'node:fs/promises';
import {group} from './test-groups.mjs';
import {inspect} from 'node:util';
// Test event metadata only. Runtime has no logging; fixtures are exclusively synthetic.
export default async function* report(events) {
 const totals={pass:0,fail:0,skipped:0};const groups={},files={};
 for await(const {type,data} of events) {
  if(type!=='test:pass'&&type!=='test:fail')continue;
  const file=data.file?.split('/').at(-1)||'unknown';const category=group(file);
  const outcome=data.skip?'skipped':type==='test:pass'?'pass':'fail';
  totals[outcome]++;groups[category]??={pass:0,fail:0,skipped:0};groups[category][outcome]++;
  files[file]??={pass:0,fail:0,skipped:0};files[file][outcome]++;
  if(outcome!=='pass'){
   yield `${outcome.toUpperCase()} ${file}: ${data.name}\n`;
   // Node wraps assertion errors; retain their actual fixture location too.
   const seen=new Set();let error=data.details?.error;
   for(let depth=0;error&&depth<8&&!seen.has(error);depth++,error=error.cause){seen.add(error);yield `${depth?'Caused by: ':''}${error.stack||error.message||inspect(error,{depth:4,maxArrayLength:40,customInspect:false,getters:false})}\n`;}
   // A child can exit before its next case emits an assertion. Node places
   // process outcome on the wrapping error, not in its short stack/message.
   // Fixed primitive metadata only; never inspect stdout, payloads or getters.
   const metadata={};
   for(const key of ['exitCode','signal','failureType']){
    const property=data.details?.error&&Object.getOwnPropertyDescriptor(data.details.error,key);
    if(!property||!Object.hasOwn(property,'value'))continue;const value=property.value;
    if(key==='exitCode'&&(value===null||Number.isInteger(value)&&value>=0&&value<=255)||key==='signal'&&(value===null||typeof value==='string'&&/^SIG[A-Z0-9]{1,16}$/.test(value))||key==='failureType'&&['testCodeFailure','testTimeoutFailure','cancelledByParent','testAborted','subtestsFailed','hookFailed','parentAlreadyFinished','callbackAndPromisePresent'].includes(value))metadata[key]=value;
   }
   if(Object.keys(metadata).length)yield `FAILURE_METADATA ${JSON.stringify(metadata)}\n`;
  }
  else if(data.nesting===0)yield `PASS ${file}: ${data.name}\n`;
 }
 const result={total:totals.pass+totals.fail+totals.skipped,...totals,groups,files};
 await mkdir('work',{recursive:true});await writeFile('work/test-summary.json',JSON.stringify(result,null,2)+'\n');
 yield JSON.stringify(result,null,2)+'\n';
}
