import {intelligenceDataset} from './dataset.mjs';
import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const baseline=process.env.PAIA_RETRIEVAL_MODULE||new URL('../../core/memory/retrieval.js',import.meta.url).pathname;
const mod=await import(pathToFileURL(baseline));
const data=intelligenceDataset(),eligible=data.entries.filter(e=>e.eligible),rows=[];
const percentile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]||0;
const start=performance.now(),memoryBefore=process.memoryUsage();let peakHeap=memoryBefore.heapUsed;
for(const q of data.queries){
 const t=performance.now();const ranked=mod.rankAll?mod.rankAll(eligible,q.query):eligible.map(e=>mod.rankCandidate(e,q.query)).filter(e=>e.score>0).sort(mod.compareCandidates);
 const ms=performance.now()-t,ids=ranked.map(e=>e.id),relevant=new Set(q.relevant),rank=ids.findIndex(id=>relevant.has(id))+1;
 const hit=k=>ids.slice(0,k).filter(id=>relevant.has(id)).length;
 const p=mod.assemble(eligible,{query:q.query,budget:'detailed'});
 rows.push({id:q.id,taxonomy:q.taxonomy,split:q.split,rank,top1:+(rank===1),top3:+(rank>0&&rank<=3),top5:+(rank>0&&rank<=5),precision3:hit(3)/3,precision5:hit(5)/5,hit10:+(rank>0&&rank<=10),recall10:relevant.size?hit(10)/relevant.size:0,mrr:rank?1/rank:0,ms,returned:ids.length,confidence:p.retrievalConfidence||null,selected:p.items.map(e=>e.id),budgetSafe:p.characters<=p.limits.characters&&p.tokens<=p.limits.tokens,statesSafe:p.items.every(e=>e.state===mod.semanticState(e)),leak:p.items.some(e=>!e.eligible),currentFirst:q.expectedState?+(p.items[0]?.state==='current'):null,conflictWarned:q.expectedConflict?+(p.warnings.length>0):null});
 peakHeap=Math.max(peakHeap,process.memoryUsage().heapUsed);
}
const metric=rs=>({queries:rs.length,...Object.fromEntries(['top1','top3','top5','precision3','precision5','recall10','hit10','mrr'].map(k=>[k,rs.reduce((s,r)=>s+r[k],0)/(rs.length||1)])),p50Ms:percentile(rs.map(r=>r.ms),.5),p95Ms:percentile(rs.map(r=>r.ms),.95)});
const report={syntheticOnly:true,fixtureDigest:createHash('sha256').update(JSON.stringify(data)).digest('hex'),module:baseline,topics:data.topics,entries:data.entries.length,queries:data.queries.length,metrics:{all:metric(rows.filter(r=>!['N','P'].includes(r.taxonomy))),...Object.fromEntries([...new Set(rows.map(r=>r.taxonomy))].map(k=>[k,metric(rows.filter(r=>r.taxonomy===k))])),development:metric(rows.filter(r=>r.split==='development')),heldOut:metric(rows.filter(r=>r.split==='held-out'&&!['N','P'].includes(r.taxonomy)))},negativeCorrect:rows.filter(r=>r.taxonomy==='N'&&r.returned===0).length,budgetViolations:rows.filter(r=>!r.budgetSafe).length,leaks:rows.filter(r=>r.leak).length,stateViolations:rows.filter(r=>!r.statesSafe).length,currentFirst:rows.filter(r=>r.currentFirst!==null).reduce((s,r)=>s+r.currentFirst,0)/100,conflictWarned:rows.filter(r=>r.conflictWarned!==null).reduce((s,r)=>s+r.conflictWarned,0)/100,memory:{before:memoryBefore,after:process.memoryUsage(),peakSampledHeap:peakHeap,note:'Node process, sampled after each query; not Chrome peak RSS.'},elapsedMs:performance.now()-start,rows};
const output=process.env.PAIA_BENCHMARK_OUTPUT||'outputs/v0110-acceptance/baseline.json';await mkdir('outputs/v0110-acceptance',{recursive:true});await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined},null,2));
