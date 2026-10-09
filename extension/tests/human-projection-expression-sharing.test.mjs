// Original source frozen before extraction; synthetic local I/O only, no native authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
import {historicalInstant} from '../core/historical-time.js';
import {planIndependentExpressionTime,expressionTime as exportedExpressionTime} from '../core/organizer/expression-time.js';
const ORIGINAL_SOURCE="import {prefix} from '../thought-model.js';\nimport {historicalInstant} from '../historical-time.js';\n\nexport const unknownExpressionTime=()=>({at:null,year:null,basis:'unknown'});\nexport function expressionInstant(value){\n const time=historicalInstant(value);\n if(time===null)return null;\n const normalized=new Date(time).toISOString();\n return /^\\d{4}-/.test(normalized)?normalized:null;\n}\nconst instant=expressionInstant;\n\n// This is expression chronology, not the existing capture/creation sort key.\n// Ambiguous legacy copies stay unknown. No text or new canonical record lives here.\nexport async function expressionTime(s,t,row){\n if(!row||row.lifecycle!=='active'||row.staleReasons?.includes('source_purged'))return unknownExpressionTime();\n if(row.provenanceType==='input_original'){\n  const refs=(await t.all('provenance','byOwner',prefix(['entry',row.id]))).filter(p=>p.role!=='context_only');\n  if(!refs.length||refs.length>100||refs.some(p=>p.contributionType!=='exact_excerpt'))return unknownExpressionTime();\n  const times=new Set();\n  for(const ref of refs){\n   const input=await t.get('inputStates',ref.inputId),dependency=await t.edge('dependencies','byInputTarget',prefix([ref.inputId,'entry',row.id]));\n   if(!input||input.removalState!=='active'||input.sourcePurged||!dependency||(input.lastRemovalSequence||0)>(dependency.eligibilityEpochAtUse||0))return unknownExpressionTime();\n   if(!ref.sourceRecordIds?.length||!await s.sourcePresent(t,ref.sourceRecordIds))return unknownExpressionTime();\n   for(const id of ref.sourceRecordIds){const at=instant((await t.get('records',id))?.value?.sourceSentAt);if(!at)return unknownExpressionTime();times.add(at);}\n  }\n  // Consolidated identical text can have multiple actual expression dates.\n  // Without one attributable event, do not choose the earliest by convenience.\n  if(times.size!==1)return unknownExpressionTime();\n  const at=[...times][0];return {at,year:Number(at.slice(0,4)),basis:'source'};\n }\n if(row.provenanceType!=='user_created'||row.origin!=='user')return unknownExpressionTime();\n const receipt=await t.edge('operationReceipts','byOwner',prefix(['thought-library',row.id]));\n const evidence=receipt?.result?.independentExpression,at=instant(evidence?.at);\n if(receipt?.namespace!=='thought-library'||receipt.ownerId!==row.id||receipt.result?.id!==row.id||evidence?.version!==1||evidence?.kind!=='committed_human_expression'||!at||at!==instant(row.createdAt))return unknownExpressionTime();\n return {at,year:Number(at.slice(0,4)),basis:'independent_creation'};\n}\n";
const ORIGINAL_SHA='1e5d69ada3c783fea484e2935839f88624079edd42a243263031c69847f59ab7';
const ORIGINAL_INDEPENDENT_BRANCH_SHA='6b4501494428c574755a6544481a94b41b785bc1bbe64b649c11849cee203e73';

assert.equal(sha(ORIGINAL_SOURCE),ORIGINAL_SHA);
const independentStart=ORIGINAL_SOURCE.indexOf(" const receipt=await t.edge('operationReceipts'");
assert.equal(sha(ORIGINAL_SOURCE.slice(independentStart,ORIGINAL_SOURCE.indexOf('\n}',independentStart)+2)),ORIGINAL_INDEPENDENT_BRANCH_SHA);
const actualSource=await readFile(new URL('../core/organizer/expression-time.js',import.meta.url),'utf8');
const compile=source=>new Function('historicalInstant','prefix',source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\nreturn expressionTime;');
const prefix=parts=>({syntheticOriginalPrefix:parts});
const old=compile(ORIGINAL_SOURCE)(historicalInstant,prefix),actual=compile(actualSource)(historicalInstant,prefix);
function fixture(mode){
 const events=[],primary=mode==='edge-null'?null:new Error('SYNTHETIC original expression failure');
 const values={id:'synthetic-entry',createdAt:'2026-10-01T00:00:00.000Z',evidenceAt:'2026-10-01T00:00:00Z'};
 const row={lifecycle:'active',staleReasons:[],provenanceType:'user_created',origin:'user'};
 for(const key of ['id','createdAt'])Object.defineProperty(row,key,{enumerable:true,get(){events.push('get:row-'+key);return values[key];}});
 const evidence={version:1,kind:'committed_human_expression'};Object.defineProperty(evidence,'at',{enumerable:true,get(){events.push('get:evidence-at');if(mode==='evidence-getter-error')throw primary;return values.evidenceAt;}});
 const result={id:'synthetic-entry',independentExpression:evidence},receipt={namespace:'thought-library',ownerId:'synthetic-entry',result};
 if(mode==='missing-receipt')receipt.missing=true;
 if(mode==='inactive')row.lifecycle='removed';
 if(mode==='source-purged')row.staleReasons=['source_purged'];
 if(mode==='wrong-provenance')row.provenanceType='legacy';
 if(mode==='wrong-origin')row.origin='ai';
 if(mode==='wrong-namespace')receipt.namespace='other';
 if(mode==='wrong-owner')receipt.ownerId='other';
 if(mode==='wrong-result')result.id='other';
 if(mode==='wrong-version')evidence.version=2;
 if(mode==='wrong-kind')evidence.kind='other';
 if(mode==='missing-evidence')delete result.independentExpression;
 if(mode==='invalid-time')values.evidenceAt='not-a-date';
 if(mode==='invalid-calendar')values.evidenceAt='2026-02-30T00:00:00Z';
 if(mode==='missing-zone')values.evidenceAt='2026-10-01T00:00:00';
 if(mode==='different-created')values.createdAt='2026-10-02T00:00:00Z';
 if(mode==='timezone-equivalent')values.evidenceAt='2026-10-01T08:00:00+08:00';
 if(mode==='leap-day')values.evidenceAt=values.createdAt='2024-02-29T00:00:00Z';
 if(mode==='numeric-time')values.evidenceAt=0;
 const t={async edge(name,index,range){events.push('io:edge:start:'+name+':'+index);assert.deepEqual(range,{syntheticOriginalPrefix:['thought-library','synthetic-entry']});if(mode==='edge-error'||mode==='edge-null')throw primary;await Promise.resolve();if(mode==='edge-mutation')values.createdAt='2026-10-02T00:00:00Z';events.push('io:edge:end');return receipt.missing?null:receipt;},async all(){throw Error('Unexpected provenance read in synthetic independent branch');},async get(){throw Error('Unexpected record input read');}};
 return {events,primary,row:mode==='null-row'?null:row,t,store:{},receipt,evidence};
}
async function run(fn,mode){const f=fixture(mode);let thrown=false,error,result;try{result=await fn(f.store,f.t,f.row);}catch(e){thrown=true;error=e;assert.equal(e,f.primary);}return {events:f.events,thrown,errorKind:thrown?(error===null?'null':'identity-error'):null,result,keys:result?Object.keys(result):null};}
const modes=['valid','missing-receipt','null-row','inactive','source-purged','wrong-provenance','wrong-origin','wrong-namespace','wrong-owner','wrong-result','wrong-version','wrong-kind','missing-evidence','invalid-time','invalid-calendar','missing-zone','different-created','timezone-equivalent','leap-day','numeric-time','edge-mutation','edge-error','edge-null','evidence-getter-error'];
for(const mode of modes)test('original independent expression actual edge/time/error order '+mode,async()=>{
 const before=await run(old,mode),after=await run(actual,mode);assert.deepEqual(after,before);assert.equal(JSON.stringify(after.result),JSON.stringify(before.result));
 if(['valid','timezone-equivalent'].includes(mode)){assert.deepEqual(after.result,{at:'2026-10-01T00:00:00.000Z',year:2026,basis:'independent_creation'});assert.ok(after.events.indexOf('io:edge:end')<after.events.indexOf('get:evidence-at'));assert.ok(after.events.indexOf('io:edge:end')<after.events.indexOf('get:row-createdAt'));}
 if(mode==='leap-day')assert.deepEqual(after.result,{at:'2024-02-29T00:00:00.000Z',year:2024,basis:'independent_creation'});
 if(['null-row','inactive','source-purged','wrong-provenance','wrong-origin'].includes(mode))assert.equal(after.events.some(v=>v.startsWith('io:edge:')),false);
 if(!after.thrown&&!['valid','timezone-equivalent','leap-day'].includes(mode))assert.deepEqual(after.result,{at:null,year:null,basis:'unknown'});
});


test('actual exported receipt computation matches original after-edge independent branch across every nonthrowing receipt/time case',async()=>{
 for(const mode of ['valid','missing-receipt','wrong-namespace','wrong-owner','wrong-result','wrong-version','wrong-kind','missing-evidence','invalid-time','invalid-calendar','missing-zone','different-created','timezone-equivalent','leap-day','numeric-time']){
  const f=fixture(mode),receipt=f.receipt.missing?null:f.receipt,expected=(await run(old,mode)).result;assert.deepEqual(planIndependentExpressionTime(f.row,receipt),expected,mode);
 }
});
test('actual exported original expression caller still rejects inactive or source-purged before reading receipts',async()=>{
 for(const row of [null,{lifecycle:'removed'},{lifecycle:'active',staleReasons:['source_purged']}]){let reads=0;const t={edge(){reads++;throw Error('Unexpected receipt read');},all(){reads++;throw Error('Unexpected provenance read');}};assert.deepEqual(await exportedExpressionTime({},t,row),{at:null,year:null,basis:'unknown'});assert.equal(reads,0);}
});
test('actual exported receipt helper retains original getter order and propagates original evidence failure',()=>{
 const events=[],row={get id(){events.push('row-id');return 'entry';},get createdAt(){events.push('createdAt');return '2026-10-01T00:00:00Z';}},evidence={get at(){events.push('at');return '2026-10-01T00:00:00Z';},get version(){events.push('version');return 1;},get kind(){events.push('kind');return 'committed_human_expression';}},result={get independentExpression(){events.push('evidence');return evidence;},get id(){events.push('result-id');return 'entry';}},receipt={get result(){events.push('result');return result;},get namespace(){events.push('namespace');return 'thought-library';},get ownerId(){events.push('ownerId');return 'entry';}};
 assert.deepEqual(planIndependentExpressionTime(row,receipt),{at:'2026-10-01T00:00:00.000Z',year:2026,basis:'independent_creation'});
 assert.deepEqual(events,['result','evidence','at','namespace','ownerId','row-id','result','result-id','row-id','version','kind','createdAt']);
 for(const primary of [new Error('SYNTHETIC original receipt error'),null]){let failed=false;try{planIndependentExpressionTime(row,{result:{get independentExpression(){throw primary;}}});}catch(e){failed=true;assert.equal(e,primary);}assert.equal(failed,true);}
});
test('actual exported receipt helper has no eligibility/read/native authority; original caller keeps those checks',()=>{
 const row=Object.freeze({id:'entry',createdAt:'2026-10-01T00:00:00Z',lifecycle:'removed',origin:'ai',provenanceType:'legacy'}),receipt=Object.freeze({namespace:'thought-library',ownerId:'entry',result:Object.freeze({id:'entry',independentExpression:Object.freeze({version:1,kind:'committed_human_expression',at:'2026-10-01T00:00:00Z'})})});
 const facts=planIndependentExpressionTime(row,receipt);assert.deepEqual(facts,{at:'2026-10-01T00:00:00.000Z',year:2026,basis:'independent_creation'});assert.deepEqual(Object.keys(facts),['at','year','basis']);assert.equal(Object.hasOwn(facts,'nativeQualified'),false);assert.equal(Object.hasOwn(facts,'capability'),false);assert.equal(row.lifecycle,'removed');
});
