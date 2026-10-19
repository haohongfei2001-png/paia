// Body-free summary only. Never starts a browser or edits either evidence file.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateEvidence} from './validate-evidence.mjs';
const pins=JSON.parse(readFileSync(new URL('./variants.json',import.meta.url),'utf8'));
const quantile=(x,p)=>{const sorted=[...x].sort((a,b)=>a-b),i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);};
const percentageEntry=(name,before,after)=>before===0?{[name+'Unavailable']:'Zero baseline mean; no percentage is calculated.'}:{[name]:100*(after/before-1)};
const distribution=values=>{assert.equal(values.length,6);assert.ok(values.every(x=>Number.isFinite(x)&&x>=0));return {n:values.length,inExecutionOrder:values,min:Math.min(...values),q25:quantile(values,.25),median:quantile(values,.5),q75:quantile(values,.75),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length};};
function cold(e,count){
 const samples=e.samples.filter(x=>x.mode==='recreated-iframe'&&x.count===count&&x.label!=='prepare-retained');assert.equal(samples.length,6);
 return {count,clickToInitMs:distribution(samples.map(x=>x.iframeInit-x.click)),clickToContentMs:distribution(samples.map(x=>x.content-x.click)),clickToPaintOpportunityMs:distribution(samples.map(x=>x.paintOpportunity-x.click)),queryMs:distribution(samples.map(x=>x.queryEnd-x.queryStart)),scanMs:distribution(samples.map(x=>{const s=x.worker.find(t=>t.kind==='snapshot');return s.scanEnd-s.foundation;})),familyProjectionMs:distribution(samples.map(x=>{const s=x.worker.find(t=>t.kind==='snapshot');return s.familiesEnd-s.scanEnd;})),readTargetTotalMs:distribution(samples.map(x=>x.worker.filter(t=>t.kind==='readTarget').reduce((a,t)=>a+t.end-t.start,0)))};
}
export function comparePair(baseline,candidate,assembly){
 validateEvidence(baseline);validateEvidence(candidate);
 for(const e of [baseline,candidate])for(const s of e.samples.filter(s=>s.mode==='recreated-iframe'))for(const [key,value]of Object.entries({clickToInit:s.iframeInit-s.click,clickToContent:s.content-s.click,clickToPaint:s.paintOpportunity-s.click,queryDuration:s.queryEnd-s.queryStart}))assert.equal(s[key],value,s.label+' derived '+key+' must match original timestamps');
 assert.equal(assembly.schema,'paia-panel-latency-pair-assembly-v1');assert.equal(assembly.status,'PREPARED');assert.deepEqual(assembly.variants,pins);assert.deepEqual(assembly.order,['baseline','candidate']);assert.deepEqual(assembly.runtimeDifferences,pins.allowedRuntimeDifferences);assert.equal(assembly.commonFilesIdentical,true);assert.equal(assembly.separateExtensionPaths,true);
 for(const variant of pins.order){assert.deepEqual(assembly.trees[variant].runtimePins,pins[variant]);assert.match(assembly.trees[variant].inventorySha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(assembly.trees[variant].entries)&&assembly.trees[variant].entries>=3);}
 assert.equal(assembly.trees.baseline.entries,assembly.trees.candidate.entries);assert.notEqual(assembly.trees.baseline.inventorySha256,assembly.trees.candidate.inventorySha256);
 assert.equal(baseline.fixture,candidate.fixture);assert.equal(typeof baseline.fixture,'string');assert.ok(baseline.fixture.length>0);
 assert.ok(Number.isFinite(Date.parse(baseline.started)));assert.ok(Number.isFinite(Date.parse(candidate.started)));
 assert.ok(Date.parse(candidate.started)>Date.parse(baseline.started));assert.ok(Date.parse(candidate.started)>=baseline.controls.at(-1).end,'candidate must start after measured baseline retirement');
 const rows=[0,100,500].map(count=>{const b=cold(baseline,count),c=cold(candidate,count);return {count,baseline:b,candidate:c,descriptiveDelta:{meanContentMs:c.clickToContentMs.mean-b.clickToContentMs.mean,medianContentMs:c.clickToContentMs.median-b.clickToContentMs.median,...percentageEntry('meanContentPercent',b.clickToContentMs.mean,c.clickToContentMs.mean),...percentageEntry('meanScanPercent',b.scanMs.mean,c.scanMs.mean)}};});
 const warm=e=>e.samples.filter(x=>x.mode==='retained-capsule').map(x=>({label:x.label,sameFrame:x.sameFrame,postClickQueries:x.rpc.filter(r=>r.type==='PAIA_PROMPT_QUERY').length,afterClickObservedMs:x.afterClickObserved-x.click,contentAlreadyExisted:true}));
 return {schema:'paia-panel-latency-pair-summary-v1',status:'COMPLETE',samples:44,variants:assembly.variants,order:['baseline','candidate'],evidenceChecks:{baseline:{samples:22,sourceTraces:2,retirementControls:2},candidate:{samples:22,sourceTraces:2,retirementControls:2}},cold:rows,warm:{baseline:warm(baseline),candidate:warm(candidate)},limitations:['Fixed baseline-first order; runner and sequential order effects are not eliminated.','Six recreated-iframe observations per size, already running browser and warm service worker; not cold process startup or strong tail-latency evidence.','Warm observations include polling and settling overhead; existing content/paint timestamps precede the click and are not new rendering latency.','Candidate instrumentation adds one pure callback per filter-qualified Input, with one private closure per snapshot.','Both variants share the diagnostic 90d485 UI and differ only in the two recorded runtime files; this does not certify all PR304 integration bytes.','Synthetic Linux headless measurement; not the user computer, real corpus, physical display, paid provider, or product acceptance.'],distributionMethod:'Raw values in execution order; quartiles use linear interpolation; no significance test or product threshold.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,5,'usage: compare-pair.mjs baseline.json candidate.json assembly.json');
 const raw=process.argv.slice(2).map(p=>readFileSync(p));const result=comparePair(...raw.map(b=>JSON.parse(b.toString())));result.inputSha256=Object.fromEntries(['baseline','candidate','assembly'].map((name,i)=>[name,createHash('sha256').update(raw[i]).digest('hex')]));console.log(JSON.stringify(result,null,2));
}
