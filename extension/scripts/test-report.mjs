import {writeFile,mkdir} from 'node:fs/promises';
import {group} from './test-groups.mjs';
// Test event metadata only. Runtime has no logging; fixtures are exclusively synthetic.
export default async function* report(events) {
 const totals={pass:0,fail:0,skipped:0};const groups={},files={};
 for await(const {type,data} of events) {
  if(type!=='test:pass'&&type!=='test:fail')continue;
  const file=data.file?.split('/').at(-1)||'unknown';const category=group(file);
  const outcome=data.skip?'skipped':type==='test:pass'?'pass':'fail';
  totals[outcome]++;groups[category]??={pass:0,fail:0,skipped:0};groups[category][outcome]++;
  files[file]??={pass:0,fail:0,skipped:0};files[file][outcome]++;
  if(outcome!=='pass')yield `${outcome.toUpperCase()} ${file}: ${data.name}\n${data.details?.error?.message||''}\n`;
  else if(data.nesting===0)yield `PASS ${file}: ${data.name}\n`;
 }
 const result={total:totals.pass+totals.fail+totals.skipped,...totals,groups,files};
 await mkdir('work',{recursive:true});await writeFile('work/test-summary.json',JSON.stringify(result,null,2)+'\n');
 yield JSON.stringify(result,null,2)+'\n';
}
