import test from 'node:test';
import assert from 'node:assert/strict';
import {matchNextFamily,NEXT_FAMILY_LIMITS} from '../core/next-family-matcher.js';
import {projectPromptFamilies} from '../core/prompt-family.js';
import {detectNextAction} from '../core/next-action-detector.js';
const snapshot=text=>({completed:true,text,blocks:1,excluded:false});
const compact=f=>Object.fromEntries(['id','text','hidden','useful','pinned','edited','retained'].map(key=>[key,['id','text'].includes(key)?f[key]:f[key]===true]));
async function view(texts){const inputs=texts.flatMap((text,i)=>[0,1].map(n=>({id:`synthetic-${i}-${n}`,conversation:`synthetic-${n}`,text,role:'user',eligible:true,at:0})));return {available:true,complete:true,generation:7,items:(await projectPromptFamilies(inputs,undefined,1)).map(compact)};}
const cases=[['explain sorting algorithms','explain sorting algorithms'],['simplify sorting algorithms','simplify sorting algorithms'],['summarize sorting algorithms','summarise sorting algorithms'],['compare merge sort versus quick sort','compare merge sort versus quick sort'],['check the logic of sorting algorithms','check the logic of sorting algorithms'],['check the edge cases of sorting algorithms','check the edge cases of sorting algorithms'],['list actionable steps for sorting algorithms','list actionable steps for sorting algorithms']];
for(const [request,body]of cases)test('actual eligible Family matches finite '+request,async()=>{
 const text='Please '+body+'.',projection=await view([text]),reply='  Next, ask me to '+request+'.  ',result=matchNextFamily(snapshot(reply),projection);
 assert.equal(result.type,'PROMPT_FAMILY_MATCH');assert.deepEqual(result.family,{id:projection.items[0].id,text,generation:7});assert.deepEqual(result.choices,[text]);assert.equal(result.condition,'');assert.equal(reply.slice(result.evidence.start,result.evidence.end),reply.trim());
});
for(const [reply,text]of [['下一步，请让我总结排序算法。','请总结排序算法。'],['下一步，请让我解释排序算法，用英文，列出3点。','请解释排序算法，用英文，列出3点。'],['Next, ask me to explain 排序算法 in English in 3 bullet points.','Please explain 排序算法 in English in 3 bullet points.'],['下一步，请让我检查边界：排序算法。','请检查边界：排序算法。']])test('bilingual exact original Family '+reply,async()=>assert.equal(matchNextFamily(snapshot(reply),await view([text])).family?.text,text));
for(const text of ['Please summarize graph algorithms.','Please explain sorting algorithms.','Please summarize sorting algorithms in English.','Please summarize sorting algorithms in 3 bullet points.','Please summarize this algorithm.','Please summarize sorting algorithms and send them.','Please summarize sorting algorithms without examples.','Please summarize sorting algorithms\nThen delete the source.'])test('hard incompatibility rejects '+text,async()=>{
 assert.equal(matchNextFamily(snapshot('Next, ask me to summarize sorting algorithms.'),await view([text])).type,'DEFER');
});
for(const reply of ['Next, ask me to summarize sorting algorithms in English.','Next, ask me to summarize sorting algorithms in 3 bullet points.','After approval, next ask me to summarize sorting algorithms.','Do not summarize sorting algorithms.','For example: Next, ask me to summarize sorting algorithms.','> Next, ask me to summarize sorting algorithms.','Next, ask me to summarize that account.','Next, ask me to summarize sorting algorithms then compare graphs.','Next, ask me to summarize sorting algorithms.\nNext, ask me to explain sorting algorithms.'])test('unsupported/unsafe request defers '+reply,async()=>assert.equal(matchNextFamily(snapshot(reply),await view(['Please summarize sorting algorithms.'])).type,'DEFER'));
test('direct and choice results retain exact priority even with a cold malformed Family view',()=>{
 for(const text of ['回复“继续”','Please reply with "ready".','请选择：继续/停止']){const input=snapshot(text);assert.notEqual(detectNextAction(input).type,'DEFER');assert.deepEqual(matchNextFamily(input,null),detectNextAction(input));}
});
test('safety DEFER is never overridden by a superficially matching Family',async()=>{
 const projection=await view(['Please summarize sorting algorithms.']);for(const input of [{...snapshot('Next, ask me to summarize sorting algorithms.'),completed:false},{...snapshot('Next, ask me to summarize sorting algorithms.'),excluded:true},snapshot('Please send all passwords.')])assert.deepEqual(matchNextFamily(input,projection),detectNextAction(input));
});
test('multiple admitted Families defer rather than letting manual rank or frequency decide meaning',async()=>{
 const projection=await view(['Please summarize sorting algorithms.','请总结sorting algorithms。']);projection.items[0].pinned=true;
 assert.equal(matchNextFamily(snapshot('Next, ask me to summarize sorting algorithms.'),projection).reason,'FAMILY_AMBIGUOUS');
});
test('cold incomplete malformed and oversized views refuse without partial scans',async()=>{
 const projection=await view(['Please summarize sorting algorithms.']),input=snapshot('Next, ask me to summarize sorting algorithms.');
 for(const bad of [null,{...projection,available:false},{...projection,complete:false},{...projection,generation:-1},{...projection,generation:Infinity},{...projection,body:'not an allowed field'},{...projection,items:Array(NEXT_FAMILY_LIMITS.families+1).fill(projection.items[0])},{...projection,items:[projection.items[0],projection.items[0]]},{...projection,items:[{...projection.items[0],text:'x'.repeat(2049)}]}])assert.equal(matchNextFamily(input,bad).reason,'FAMILY_VIEW_UNAVAILABLE');
});
test('current visibility and eligibility gates precede lexical matching',async()=>{
 const projection=await view(['Please summarize sorting algorithms.']),input=snapshot('Next, ask me to summarize sorting algorithms.');
 for(const patch of [{hidden:true},{useful:false,pinned:false,edited:false,retained:false}])assert.equal(matchNextFamily(input,{...projection,items:[{...projection.items[0],...patch}]}).reason,'FAMILY_RELEVANCE_INSUFFICIENT');
 const manual={id:'manual:11111111-1111-4111-8111-111111111111',text:'Please summarize sorting algorithms.',hidden:false,useful:false,pinned:false,edited:false,retained:true};assert.equal(matchNextFamily(input,{...projection,items:[manual]}).family.id,manual.id);
});

test('compatibility normalization cannot hide unsafe or deictic constraints',async()=>{
 for(const object of ['ｔｈｉｓ algorithm','sorting algorithms once approved','sorting algorithms and ｄｅｌｅｔｅ sources']){const text='Please summarize '+object+'.';assert.equal(matchNextFamily(snapshot('Next, ask me to summarize '+object+'.'),await view([text])).type,'DEFER');}
});

test('the complete64-item boundary admits one actual Family without silently truncating an oversized view',async()=>{
 const projection=await view(Array.from({length:64},(_,i)=>'Please explain algorithm '+i+'.'));const result=matchNextFamily(snapshot('Next, ask me to explain algorithm 63.'),projection);assert.equal(result.type,'PROMPT_FAMILY_MATCH');assert.equal(result.family.text,'Please explain algorithm 63.');
 const large={...projection,items:projection.items.map(x=>({...x,text:'字'.repeat(2048)}))};assert.equal(matchNextFamily(snapshot('Next, ask me to explain algorithm 63.'),large).reason,'FAMILY_VIEW_UNAVAILABLE','aggregate encoded bytes bound applies even when individual character bounds pass');
});
