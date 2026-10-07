import report from './test-report.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
// Reuse the existing reporter unchanged; retain only bounded test event metadata
// so the one owner-deferred subtest is checked by exact name AND exact reason.
export default async function* retainedReport(events){
 const part=process.env.PAIA_TOPIC_RETAINED_PART,head=process.env.PAIA_TESTED_HEAD;
 if(!['core','content','years'].includes(part)||!/^[a-f0-9]{40}$/.test(head||''))throw Error('INVALID_RETAINED_TEST_IDENTITY');
 const cases=[];
 async function* capture(){
  for await(const event of events){
   const {type,data}=event;
   if(type==='test:pass'||type==='test:fail'){
    if(cases.length>=100)throw Error('UNEXPECTED_RETAINED_CASE_COUNT');
    cases.push({file:data.file?.split('/').at(-1)||'unknown',name:data.name,outcome:data.todo?'todo':data.skip?'skipped':type==='test:pass'?'pass':'fail',skipReason:typeof data.skip==='string'?data.skip:null});
   }
   yield event;
  }
  await mkdir(`work/topic-retained/${part}`,{recursive:true});
  await writeFile(`work/topic-retained/${part}/cases.json`,JSON.stringify({version:1,part,head,cases},null,2)+'\n');
 }
 yield* report(capture());
}
