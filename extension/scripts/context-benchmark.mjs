import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {contextBenchmark} from '../tests/fixtures/context-benchmark-v0101.mjs';
const modulePath=process.env.PAIA_RETRIEVAL_MODULE||new URL('../core/memory/retrieval.js',import.meta.url).pathname;
const {rankCandidate,compareCandidates,assemble}=await import(pathToFileURL(modulePath));
const data=contextBenchmark(),output=process.env.PAIA_BENCHMARK_OUTPUT||'work/context-v0101/enhanced.json';
const eligible=data.entries.filter(x=>x.eligible),results=[];
const started=performance.now();for(const q of data.queries){const ranked=eligible.map(x=>rankCandidate(x,q.query)).filter(x=>x.score>0).sort(compareCandidates),rank=ranked.findIndex(x=>q.relevant.includes(x.id))+1,p=assemble(eligible,{query:q.query});results.push({id:q.id,group:q.group,category:q.category,rank,top1:Number(rank===1),top3:Number(rank>0&&rank<=3),recall10:rank>0&&rank<=10?1:0,mrr:rank?1/rank:0,selected:p.items.map(x=>x.id),budgetSafe:p.characters<=p.limits.characters&&p.tokens<=p.limits.tokens,excludedLeak:p.items.some(x=>!x.eligible)});}
const metric=rows=>Object.fromEntries(['top1','top3','recall10','mrr'].map(k=>[k,rows.reduce((s,r)=>s+r[k],0)/rows.length]));
const report={syntheticOnly:true,note:'Fixed synthetic labels; held-out wording is separate from exact queries, not independently authored or semantic validation.',fixtureDigest:createHash('sha256').update(JSON.stringify(data)).digest('hex'),topics:data.topics,entries:data.entries.length,queries:data.queries.length,metrics:{all:metric(results),deterministic:metric(results.filter(x=>x.group==='deterministic')),'held-out':metric(results.filter(x=>x.group==='held-out')),exact:metric(results.filter(x=>x.category==='exact'))},budgetViolations:results.filter(x=>!x.budgetSafe).length,excludedLeaks:results.filter(x=>x.excludedLeak).length,elapsedMs:performance.now()-started,results};
await mkdir(new URL('../work/context-v0101',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));
