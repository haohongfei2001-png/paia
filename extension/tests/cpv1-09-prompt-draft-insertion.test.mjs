import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_MESSAGE_LENGTH} from '../core/constants.js';
import {planPromptDraftInsertion,PromptDraftInsertionError} from '../core/prompt-draft-insertion.js';
const plan=(fields={})=>planPromptDraftInsertion({mode:'append',text:'人工模板',draft:'',expectedDraft:'',...fields});
const refusal=(fields,code)=>assert.throws(()=>plan(fields),error=>error instanceof PromptDraftInsertionError&&error.code===code&&error.message===code);

test('P2 empty draft uses the complete human template without transformation',()=>{
 const text='  人工表达 🧑🏽‍💻 é\n<svg onload="never()">\n不要发送。  ';
 assert.deepEqual(plan({text}),{mode:'append',text});
});
test('P2 append preserves every existing draft character and one explicit separator',()=>{
 const draft='  未完成的人工草稿\r\n代码\\n与空白  ',text='完整模板\n最后否定。';
 assert.deepEqual(plan({draft,expectedDraft:draft,text}),{mode:'append',text:draft+'\n'+text});
});
test('P2 whitespace-only draft is preserved by append and protected from replacement',()=>{
 const draft=' \t\r\n';
 assert.equal(plan({draft,expectedDraft:draft}).text,draft+'\n人工模板');
 refusal({mode:'replace',draft,expectedDraft:draft},'PROMPT_REPLACE_CONFIRMATION_REQUIRED');
});
test('P2 existing draft replacement requires an explicit true confirmation',()=>{
 const draft='必须保护的草稿';
 for(const replaceConfirmed of [undefined,false])refusal({mode:'replace',draft,expectedDraft:draft,replaceConfirmed},'PROMPT_REPLACE_CONFIRMATION_REQUIRED');
 assert.deepEqual(plan({mode:'replace',draft,expectedDraft:draft,replaceConfirmed:true}),{mode:'replace',text:'人工模板'});
});
test('P2 empty replacement does not invent a draft or consent',()=>{
 assert.deepEqual(plan({mode:'replace'}),{mode:'replace',text:'人工模板'});
});
test('P2 changed draft refuses before replacement confirmation can erase it',()=>{
 for(const mode of ['append','replace'])refusal({mode,draft:'新的私人草稿',expectedDraft:'旧的私人草稿',replaceConfirmed:true},'PROMPT_INSERT_STALE');
});
test('P2 draft fence distinguishes Unicode, whitespace, code and final negation exactly',()=>{
 for(const [draft,expectedDraft] of [['é','é'],['保留 ','保留'],['a\r\nb','a\nb'],['不要发送','发送'],['foo\\nbar','foo\nbar']])
  refusal({draft,expectedDraft},'PROMPT_INSERT_STALE');
});
test('P2 full maximum template retains its final negation and refuses any clipped append',()=>{
 const tail='🧑🏽‍💻 é\n最后否定：不要发送。',text='完整人工表达 '.repeat(Math.ceil(MAX_MESSAGE_LENGTH/7)).slice(0,MAX_MESSAGE_LENGTH-tail.length)+tail;
 assert.equal(text.length,MAX_MESSAGE_LENGTH);
 assert.equal(plan({text}).text,text);
 refusal({text,draft:'先前草稿',expectedDraft:'先前草稿'},'PROMPT_INSERT_LIMIT');
});
test('P2 full maximum joined draft is accepted exactly; one extra character refuses',()=>{
 const draft='草'.repeat(MAX_MESSAGE_LENGTH-3),text='否定';
 assert.equal(plan({draft,expectedDraft:draft,text}).text,draft+'\n'+text);
 refusal({draft:draft+'草',expectedDraft:draft+'草',text},'PROMPT_INSERT_LIMIT');
});
test('P2 oversize template or draft refuses with a finite body-free error',()=>{
 const full='私人正文'.repeat(Math.ceil(MAX_MESSAGE_LENGTH/4))+'不要外泄';
 refusal({text:full},'PROMPT_INSERT_LIMIT');
 refusal({draft:full,expectedDraft:full},'PROMPT_INSERT_LIMIT');
});
test('P2 modes, body types and confirmation cannot be coerced into an insertion',()=>{
 for(const fields of [{mode:'send'},{mode:'APPEND'},{text:''},{text:' \t\n'},{text:123},{draft:null},{expectedDraft:[]},{replaceConfirmed:'true'},{replaceConfirmed:1}])
  refusal(fields,'PROMPT_INSERT_INVALID');
});
test('P2 descriptors refuse accessors, hidden, foreign, symbol and surplus authority fields before read',()=>{
 let reads=0;const base={mode:'append',text:'PRIVATE_BODY_NEVER_IN_ERROR',draft:'',expectedDraft:''};
 const getter={...base};Object.defineProperty(getter,'text',{enumerable:true,get(){reads++;return 'private';}});
 const hidden={...base};Object.defineProperty(hidden,'draft',{enumerable:false,value:''});
 const symbol={...base,[Symbol('private')]:true},foreign=Object.assign(Object.create({private:true}),base);
 for(const value of [getter,hidden,symbol,foreign,{...base,send:true},{...base,grant:{enabled:true}},{...base,clipboard:true},[],null]){
  assert.throws(()=>planPromptDraftInsertion(value),e=>e.code==='PROMPT_INSERT_INVALID'&&e.message==='PROMPT_INSERT_INVALID');
 }
 assert.equal(reads,0);
});
test('P2 missing fields and frozen results cannot smuggle a future send operation',()=>{
 for(const field of ['mode','text','draft','expectedDraft']){
  const request={mode:'append',text:'人工模板',draft:'',expectedDraft:''};delete request[field];
  assert.throws(()=>planPromptDraftInsertion(request),e=>e.code==='PROMPT_INSERT_INVALID');
 }
 const result=plan();assert.deepEqual(Object.keys(result).sort(),['mode','text']);assert.equal(Object.isFrozen(result),true);
 assert.throws(()=>{result.send=true;},TypeError);
});
test('P2 deterministic full append/replace retains original arguments across many human drafts',()=>{
 const bodies=['代码\n    x=1\n不要改写',' 🧑🏽‍💻 é ','<b>只是文字</b>','\r\n真实正文\r\n'];
 for(const text of bodies)for(const draft of ['',...bodies]){
  const request={mode:'append',text,draft,expectedDraft:draft},original={...request};
  assert.equal(planPromptDraftInsertion(request).text,draft?draft+'\n'+text:text);
  assert.deepEqual(request,original);
  assert.equal(planPromptDraftInsertion({...request,mode:'replace',replaceConfirmed:true}).text,text);
 }
});
