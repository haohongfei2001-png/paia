import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalComparison} from '../core/historical-comparison.js';
import {searchMaterialPage} from '../core/search-material-page.js';
import {completeFixture,rows} from './harness/original-complete.mjs';

const item=(id,sourceSentAt,body)=>({kind:'input',historical:true,id,title:'Synthetic '+id,
 source:'chatgpt',sourceSentAt,body,ref:{kind:'source',id,sourceId:'source-'+id,revision:0},
 working:{body:'Current '+id,revision:1,editedAt:'2026-09-01T00:00:00Z'}});
const a=item('earlier','2020-01-01T00:00:00Z','原话：我尚未决定。👩🏽‍💻\n第二段 <script>不执行</script>'),
 b=item('later','2021-01-01T00:00:00Z','后续表达：我收回提议，但引用不是我的判断。');
test('CPV1-07 comparison copies two complete original expressions with separate current edits',()=>{
 const input=[structuredClone(b),structuredClone(a)],before=structuredClone(input);
 const result=historicalComparison(input);
 assert.deepEqual(result.map(x=>x.id),['earlier','later']);
 assert.equal(result[0].body,a.body);assert.equal(result[1].body,b.body);
 assert.equal(result[0].working.body,a.working.body);
 assert.equal(result[0].sourceSentAt,a.sourceSentAt);assert.equal(result[0].working.editedAt,a.working.editedAt);
 assert.equal(Object.hasOwn(result[0],'currentBelief'),false);assert.equal(Object.hasOwn(result[0],'supersedes'),false);
 result[0].working.body='consumer change';
 assert.deepEqual(input,before);
});
test('CPV1-07 comparison preserves unknown time, empty current edits and complete long evidence',()=>{
 const long='Synthetic original quotation 👩🏽‍💻\n'.repeat(1200)+'FULL_SOURCE_END';
 const x=item('unknown','2026-02-30T00:00:00Z',long);x.working={body:'',revision:2,editedAt:'2026'};
 const y=item('known','2026-01-01T00:30:00+01:00',b.body);y.working.revision=0;
 const result=historicalComparison([x,y]);
 assert.deepEqual(result.map(v=>v.id),['known','unknown']);
 assert.equal(result[1].sourceSentAt,null);assert.equal(result[1].body,long);
 assert.equal(result[1].working.body,'');assert.equal(result[1].working.editedAt,null);
 assert.equal(result[0].working.editedAt,null,'initial capture is not an edit date');
});
const faults=[
 ['nonhistorical',x=>{x.historical=false;}],['current reference',x=>{x.ref.kind='input';}],
 ['mismatched input',x=>{x.ref.id='different';}],['missing source',x=>{delete x.ref.sourceId;}],
 ['source span',x=>{x.ref.span={start:0,end:1};}],['source revision',x=>{x.ref.revision=1;}],
 ['nonstring original',x=>{x.body={text:'PRIVATE_ORIGINAL_CANARY'};}],
 ['nonstring current',x=>{x.working.body={text:'PRIVATE_WORKING_CANARY'};}],
 ['boolean revision',x=>{x.working.revision=true;}],['fractional revision',x=>{x.working.revision=1.5;}],
 ['negative revision',x=>{x.working.revision=-1;}],['unsafe revision',x=>{x.working.revision=Number.MAX_SAFE_INTEGER+1;}],
 ['AI authorship',x=>{x.kind='ai';}]
];
for(const [name,mutate]of faults)test('CPV1-07 comparison refuses ambiguous evidence: '+name,()=>{
 const x=structuredClone(a);mutate(x);assert.equal(historicalComparison([x,b]),null);
});
test('CPV1-07 comparison is exactly two distinct complete sources, never an implicit aggregate',()=>{
 for(const input of [null,{},[],[a],[a,b,a],[a,a]])assert.equal(historicalComparison(input),null);
 const duplicate=structuredClone(b);duplicate.ref.sourceId=a.ref.sourceId;
 assert.equal(historicalComparison([a,duplicate]),null);
 const missingCurrent=structuredClone(a);missingCurrent.working=null;
 assert.equal(historicalComparison([missingCurrent,b])[0].working,null,'unavailable current content has no Source fallback');
});

const expressions=[
 'HIST_COMPARE 原话：全部合并仍未决定。\n反例与限定条件完整保留。',
 'HIST_COMPARE 后续修正：我收回合并提议。引用“全部合并更好”不是我的观点。',
 'HIST_COMPARE 时间未知：不能拿收录日期代替表达日期。',
 'HIST_COMPARE long '+('多段合成材料 👩🏽‍💻 <script>字面证据</script>\n'.repeat(1000))+'SOURCE_END'
];
async function fixture(){
 const f=await completeFixture({texts:expressions});await f.s.finishFoundation();
 const records=await rows(f.s,'records'),all=(await rows(f.s,'blocks')).map(x=>x.value);
 const blocks=expressions.map(text=>all.find(b=>records.find(r=>r.id===b.originalTextReference)?.value.originalText===text));
 assert.equal(new Set(blocks.map(b=>b.id)).size,4);
 await f.s.repository.transaction(true,async t=>{
  for(let i=0;i<blocks.length;i++){const b=blocks[i],record=await t.get('records',b.originalTextReference),index=await t.get('recordIndex',b.originalTextReference);
   const time=i===0?'2020-01-01T00:00:00Z':i===1?'2021-01-01T00:00:00Z':null;
   record.value.sourceSentAt=time;index.sourceSentAt=time;await t.put('records',record);await t.put('recordIndex',index);
  }
 });return {...f,blocks};
}
const authority=async s=>({records:await rows(s,'records'),recordIndex:await rows(s,'recordIndex'),
 blocks:await rows(s,'blocks'),inputStates:await rows(s,'inputStates')});
test('CPV1-07 actual comparison separates current rewrite and edit date from immutable original expression',async()=>{
 const f=await fixture(),block=f.blocks[0],originals=await rows(f.s,'records');
 await f.s.editDocument({operationId:crypto.randomUUID(),documentId:block.documentId,blocks:[{
  id:block.id,expectedRevision:block.revision,libraryText:'CURRENT_COMPARE 现在的工作改写，不是2020年原话',note:'',excluded:false}]});
 const before=await authority(f.s),result=await searchMaterialPage(f.s,{query:'HIST_COMPARE',mode:'history',limit:20});
 assert.equal(result.items.length,4);
 const edited=result.items.find(x=>x.id===block.id),pair=historicalComparison([edited,result.items.find(x=>x.id===f.blocks[1].id)]);
 assert.equal(pair[0].body,expressions[0]);assert.equal(pair[0].sourceSentAt,'2020-01-01T00:00:00Z');
 assert.equal(pair[0].working.body,'CURRENT_COMPARE 现在的工作改写，不是2020年原话');
 assert.equal(pair[0].working.revision,1);
 assert.equal(pair[0].working.editedAt,(await rows(f.s,'blocks')).find(r=>r.value.id===block.id).value.editedAt);
 assert.notEqual(pair[0].working.editedAt,pair[0].sourceSentAt);
 assert.equal(result.items.find(x=>x.id===f.blocks[3].id).body,expressions[3]);
 assert.equal((await searchMaterialPage(f.s,{query:'CURRENT_COMPARE',mode:'history'})).items.length,0);
 assert.equal((await searchMaterialPage(f.s,{query:'CURRENT_COMPARE'})).items.length,1);
 assert.deepEqual(await rows(f.s,'records'),originals);assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual empty rewrite remains empty instead of reviving original content as current work',async()=>{
 const f=await fixture(),b=f.blocks[0];await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{
  id:b.id,expectedRevision:b.revision,libraryText:'',note:'',excluded:false}]});
 const before=await authority(f.s),result=await searchMaterialPage(f.s,{query:'HIST_COMPARE',mode:'history',limit:20});
 const pair=historicalComparison([result.items.find(x=>x.id===b.id),result.items.find(x=>x.id===f.blocks[2].id)]);
 assert.equal(pair[0].body,expressions[0]);assert.equal(pair[0].working.body,'');assert.equal(pair[1].sourceSentAt,null);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual removed and permanently purged evidence cannot reappear as current comparison work',async()=>{
 const f=await fixture(),b=f.blocks[0];await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{
  id:b.id,expectedRevision:b.revision,libraryText:expressions[0],note:'',excluded:true}]});
 assert.equal((await searchMaterialPage(f.s,{query:'HIST_COMPARE',mode:'history',limit:20})).items.some(x=>x.id===b.id),false);
 const explicit=await searchMaterialPage(f.s,{query:'HIST_COMPARE',mode:'history',includeRemoved:true,limit:20});
 assert.equal(explicit.items.find(x=>x.id===b.id).working,null);
 await f.s.permanentDelete(f.blocks[1].originalTextReference);
 const before=await authority(f.s),remaining=await searchMaterialPage(f.s,{query:'HIST_COMPARE',mode:'history',includeRemoved:true,limit:20});
 assert.equal(remaining.items.length,3);assert.equal(remaining.items.some(x=>x.id===f.blocks[1].id),false);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
