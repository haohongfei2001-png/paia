import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {decideLight,validFilterDecision,UNCERTAIN_REASONS} from '../core/smart-filter.js';import {evaluatePureControlProvider} from '../core/classifier-contract.js';import {coverageCases,highRisk,metadata} from './fixtures/light-coverage-cases.mjs';
// Historical v0.6.2 benchmark evidence recorded in TEST_RESULTS.md: 2432 fixed
// synthetic cases, 0.78125% baseline coverage (19 filtered), zero false filters.
// Keep the evidence self-contained instead of depending on a local-only short git SHA.
const HISTORICAL_BASELINE=Object.freeze({cases:2432,filtered:19,falseFiltered:0});
test('fixed coverage corpus: pure whole-input productions improve synthetic coverage with zero high-risk false filters',async()=>{
 const cases=coverageCases();assert.equal(cases.length,HISTORICAL_BASELINE.cases);const reports={baseline:{filtered:HISTORICAL_BASELINE.filtered,falseFiltered:HISTORICAL_BASELINE.falseFiltered},current:{filtered:0,falseFiltered:0}};const reasonCounts={};let missed=0;
 for(const c of cases){const result=decideLight(c);reasonCounts[result.reasonCode]=(reasonCounts[result.reasonCode]||0)+1;const yes=result.decision==='filter';reports.current.filtered+=Number(yes);reports.current.falseFiltered+=Number(yes&&c.label!=='pure_control');missed+=Number(c.label==='pure_control'&&!yes);assert.equal(yes,c.label==='pure_control','synthetic case '+c.id);}
 assert.equal(missed,0);assert.equal(reports.current.falseFiltered,0);assert.ok(reports.current.filtered>reports.baseline.filtered);for(const r of Object.values(reports)){r.precision=r.filtered?(r.filtered-r.falseFiltered)/r.filtered:null;r.coverage=r.filtered/cases.length;}
 await mkdir('work',{recursive:true});await writeFile('work/v062-coverage-benchmark.json',JSON.stringify({scope:'synthetic-only',cases:cases.length,fixedHighRiskCases:highRisk.length*metadata.length,positive:cases.filter(c=>c.label==='pure_control').length,negative:cases.filter(c=>c.label!=='pure_control').length,reports,reasonCounts,realCoverageKnown:false,populationPrecisionGuarantee:false},null,2)+'\n');
});
test('every required keep example is explicitly kept and malformed inputs never filter',()=>{
 for(const text of highRisk.slice(0,11))for(const m of metadata)assert.equal(decideLight({text,...m}).decision,'keep',text);
 for(const sample of [null,42,[],{}, {text:null,authorship:'untouched'},{text:'继续',authorship:'unsupported'},{text:'继续',authorship:'legacy_unknown',userEdited:'false'},{text:'继续',authorship:'untouched',presence:{version:99}}])assert.notEqual(decideLight(sample).decision,'filter');
 assert.equal(validFilterDecision({...metadata[0],...decideLight({text:'继续',...metadata[0]}),basedOnContentRevision:0,presenceInvalid:true},{contentRevision:0}),false);
 assert.deepEqual(UNCERTAIN_REASONS,['metadata_unknown','context_insufficient','ambiguous_ack','reference_possible','substantive_content','unsupported_expression','rule_no_match','other']);
});
test('even a confidence-one provider cannot override unverified or protected full inputs',async()=>{
 const adversary={classify:async()=>({label:'pure_control',confidence:1})};for(const c of coverageCases().filter(c=>c.label!=='pure_control'))assert.equal((await evaluatePureControlProvider(adversary,c)).pure_control,false,'synthetic case '+c.id);
 for(const provider of [null,{classify:async()=>({label:'pure_control',confidence:Infinity})},{classify:async()=>({label:'pure_control',confidence:1,text:'not allowed'})},{classify:async()=>{throw Error('SYNTHETIC');}}])assert.equal((await evaluatePureControlProvider(provider,{text:'继续',...metadata[0]})).pure_control,false);
 assert.deepEqual(await evaluatePureControlProvider(adversary,{text:'继续',...metadata[0]}),{pure_control:true,substantive:false,ambiguous:false,confidence:1});
});
