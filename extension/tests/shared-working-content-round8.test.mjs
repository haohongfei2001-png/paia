import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,success} from './harness/original-complete.mjs';

const op=()=>crypto.randomUUID();
async function organized(text='合成输入：这一整条内容应当成为跨视图共享的工作正文。',options={}){
  const f=await completeFixture({texts:[text],...options});
  const result=await f.runner.wake({userActionId:'round8-'+crypto.randomUUID()});
  assert.ok(result?.result?.created?.length===1,JSON.stringify(result));
  const block=(await rows(f.s,'blocks'))[0].value;
  const thought=(await rows(f.s,'thoughts'))[0];
  return {...f,text,block,thought};
}
async function sourceText(s){return (await rows(s,'records'))[0].value.originalText;}
async function editInput(s,id,patch){const b=await s.input(id);return s.editDocument({operationId:op(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...patch}]});}

test('Round 8: a full original Input is safely bound and Input edits update every linked reading view without changing Source',async()=>{
  const f=await organized();
  assert.equal(f.thought.workingInputId,f.block.id);
  assert.equal(await sourceText(f.s),f.text);
  const changed='合成输入：这是用户在 Input Archive 中修改后的共享工作正文。';
  await editInput(f.s,f.block.id,{libraryText:changed});
  await f.s.drainInvalidations();
  const input=await f.s.input(f.block.id),thought=(await rows(f.s,'thoughts'))[0],entry=await f.s.entry(f.thought.id);
  assert.equal(input.libraryText,changed);
  assert.equal(thought.thoughtText,changed);
  assert.equal(entry.body,changed);
  assert.equal(entry.freshness,'current');
  assert.equal(await sourceText(f.s),f.text);
});

test('Round 8: direct Thought editing writes the same canonical Input and leaves the immutable Source intact',async()=>{
  const f=await organized();
  const before=await f.s.entry(f.thought.id),changed='合成输入：这是从 Thought Library 直接维护后的同一份正文。';
  const saved=await f.s.editLibraryFields({operationId:op(),id:before.id,expectedRevision:before.revision,expectedFieldRevisions:before.fieldRevisions,changes:{body:changed}});
  assert.equal(saved.id,before.id);
  const input=await f.s.input(f.block.id),entry=await f.s.entry(before.id),raw=(await rows(f.s,'thoughts'))[0];
  assert.equal(input.libraryText,changed);
  assert.equal(entry.body,changed);
  assert.equal(raw.workingInputId,f.block.id);
  assert.equal(raw.protections.body.locked,true);
  assert.equal(await sourceText(f.s),f.text);
});

test('Round 8: a partial exact excerpt never becomes a shared full Input and editing it cannot overwrite the Input',async()=>{
  const text='合成输入：前半段保留；后半段也必须继续存在。';
  const fetchImpl=async(_url,init)=>success(init,(items)=>{items[0].spans=[{start:0,end:8}];return items;});
  const f=await organized(text,{fetchImpl});
  assert.equal(Object.hasOwn(f.thought,'workingInputId'),false);
  const e=await f.s.entry(f.thought.id),changed='只修改局部思想片段';
  await f.s.editLibraryFields({operationId:op(),id:e.id,expectedRevision:e.revision,expectedFieldRevisions:e.fieldRevisions,changes:{body:changed}});
  assert.equal((await f.s.input(f.block.id)).libraryText,null);
  assert.equal((await f.s.entry(e.id)).body,changed);
  assert.equal(await sourceText(f.s),text);
});

test('Round 8: a legacy independently human-edited Thought is never rebound or overwritten by a later Input edit',async()=>{
  const f=await organized();
  await f.s.foundationWrite(async t=>{const row=await t.get('thoughts',f.thought.id);delete row.workingInputId;row.thoughtText='旧版用户已经独立维护的 Thought 正文';row.hasHumanAction=true;row.userEdited=true;row.protections.body.locked=true;row.authorship.body.everHumanConfirmed=true;row.fieldRevisions.body++;row.revision++;await t.put('thoughts',row);});
  await editInput(f.s,f.block.id,{libraryText:'Input Archive 后来的修改'});
  await f.s.drainInvalidations();
  const row=(await rows(f.s,'thoughts'))[0];
  assert.equal(row.thoughtText,'旧版用户已经独立维护的 Thought 正文');
  assert.equal(Object.hasOwn(row,'workingInputId'),false);
  assert.equal((await f.s.input(f.block.id)).libraryText,'Input Archive 后来的修改');
});

test('Round 8: removing and restoring a shared Input invalidates then reactivates the same linked Thought without data resurrection from Source',async()=>{
  const f=await organized();
  const changed='共享正文先由用户修改，再测试移除和恢复。';await editInput(f.s,f.block.id,{libraryText:changed});await f.s.drainInvalidations();
  await editInput(f.s,f.block.id,{excluded:true});await f.s.drainInvalidations();
  let row=(await rows(f.s,'thoughts'))[0];assert.equal(row.workingInputId,f.block.id);assert.equal(row.lifecycle,'invalidated');
  await editInput(f.s,f.block.id,{excluded:false});await f.s.drainInvalidations();
  row=(await rows(f.s,'thoughts'))[0];assert.equal(row.lifecycle,'active');assert.equal(row.thoughtText,changed);assert.equal(row.workingInputId,f.block.id);assert.equal(await sourceText(f.s),f.text);
});

test('Round 8: coalesced identical Inputs are not left bound to one arbitrary canonical Input',async()=>{
  const text='重复输入：相同文字来自两个独立输入来源。';
  const f=await completeFixture({texts:[text,text]});
  const result=await f.runner.wake({userActionId:'round8-duplicates'});assert.equal(result.result.created.length,1);
  const thoughts=await rows(f.s,'thoughts');assert.equal(thoughts.length,1);assert.equal(Object.hasOwn(thoughts[0],'workingInputId'),false);
  const blocks=(await rows(f.s,'blocks')).map(x=>x.value);await editInput(f.s,blocks[0].id,{libraryText:'只修改第一个 Input'});await f.s.drainInvalidations();
  assert.equal((await rows(f.s,'thoughts'))[0].thoughtText,text);
});
