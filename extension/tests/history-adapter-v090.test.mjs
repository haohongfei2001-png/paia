import test from 'node:test';import assert from 'node:assert/strict';
import {inspectFile} from '../core/import/reader.js';
import {officialExportAdapter,PROFILE} from '../core/import/chatgpt-export.js';
import {conversation,branched,historyFile} from './fixtures/history-v090.mjs';
async function project(value,options={}){
 const p=officialExportAdapter.createProjection(),rows=[];await inspectFile(new Blob([JSON.stringify(value)]),{consent:true,selectString:path=>p.selectString(path),onEvent:e=>p.event(e,r=>rows.push(r)),...options});return {rows,result:p.finish(),metrics:p.metrics};
}
test('supported mapping profile is distinct from real export verification',()=>{
 assert.equal(PROFILE.realExportVerified,false);assert.equal(PROFILE.id,'chatgpt-mapping-v1');
});
for(const wrap of [c=>[c],c=>c,c=>({conversations:[c]}),c=>({data:[c]}),c=>({data:{conversations:[c]}}),c=>({data:c})])test('structure profile accepts an explicit bounded conversation envelope',async()=>{
 const c=conversation(),r=await project(wrap(c));assert.equal(r.rows.length,3);assert.equal(r.result.support,'supported');assert.ok(r.rows.every(x=>x.role==='user'&&x.branch==='current'));assert.deepEqual(r.rows.map(x=>x.order),[1,2,3]);assert.equal(r.rows[0].createTime,'2020-01-01T00:00:01.000Z');
});
test('current_node follows actual parent graph, sibling users stay in review',async()=>{
 const c=branched(),r=await project([c]);assert.equal(r.rows.length,3);assert.deepEqual(r.rows.map(x=>x.branch),['current','current','other']);assert.equal(r.rows[2].order,null);assert.equal(r.result.support,'partial');
});
for(const mutate of [c=>delete c.current_node,c=>c.current_node='missing-node-123',c=>c.mapping[Object.keys(c.mapping)[1]].parent=c.current_node,c=>c.mapping[Object.keys(c.mapping)[0]].children=[],c=>c.mapping[Object.keys(c.mapping)[1]].id='different-node-id'])test('missing or contradictory graph cannot invent a current linear timeline',async()=>{
 const c=conversation();mutate(c);const r=await project([c]);assert.equal(r.rows.length,3);assert.ok(r.rows.every(x=>x.branch==='ambiguous'&&x.order===null));assert.equal(r.result.support,'partial');
});
test('only stable user text survives arbitrary property order; assistant/tool/system never emitted',async()=>{
 const c=conversation(1,5),nodes=Object.values(c.mapping).slice(1);for(const [i,role]of ['assistant','tool','system','user','user'].entries()){
  const m=nodes[i].message;nodes[i].message={content:{content_type:'text',parts:['SECRET_'+role]},author:{role},id:m.id,create_time:m.create_time};
 }
 nodes[4].message.content={content_type:'multimodal_text',parts:['user attachment',{image:'never read'}]};
 const r=await project([c]);assert.equal(r.rows.length,1);assert.equal(r.rows[0].text,'SECRET_user');assert.equal(r.result.support,'partial');
});
test('unknown structures and PAIA backup are distinguished without extracting arbitrary bodies',async()=>{
 for(const value of [{body:'PRIVATE'},[{id:'synthetic-chat',messages:[{role:'user',text:'PRIVATE'}]}],[],{conversations:[]}]){
  const r=await project(value);assert.equal(r.rows.length,0);assert.equal(r.result.support,'unknown');
 }
 assert.equal((await project({format:'PAIA Backup',formatVersion:1})).result.support,'paia_backup');
});
test('bad conversation and unsupported user types are skipped while good conversation survives',async()=>{
 const bad=conversation(1);delete bad.id;delete bad.conversation_id;const good=conversation(2);const r=await project([bad,good]);
 assert.equal(r.rows.length,3);assert.ok(r.result.issues>0);assert.equal(r.result.support,'partial');
});
test('absent identities, hidden/draft users, mixed parts and non-second times fail conservatively',async()=>{
 const c=conversation(1,6),nodes=Object.values(c.mapping).slice(1);delete nodes[0].message.id;nodes[1].message.metadata={is_visually_hidden_from_conversation:true};nodes[2].message.status='in_progress';nodes[3].message.content.parts.push({text:'no'});nodes[4].message.create_time=1577836800000;nodes[5].message.create_time='2020-01-01';const r=await project(c);
 assert.equal(r.rows.length,2);assert.ok(r.rows.every(x=>x.createTime===null));assert.ok(r.result.issues>=4);
});
test('large skipped assistant strings stay unmaterialized and oversized conversation is bounded',async()=>{
 const c=conversation(1,2);Object.values(c.mapping)[1].message.author.role='assistant';Object.values(c.mapping)[1].message.content.parts=['x'.repeat(400000)];
 const r=await project(c);assert.equal(r.rows.length,1);assert.ok(r.metrics.maxBufferedTextChars<210000);
 const p=officialExportAdapter.createProjection({maxConversationChars:30}),rows=[];
 await inspectFile(historyFile(),{consent:true,selectString:x=>p.selectString(x),onEvent:e=>p.event(e,x=>rows.push(x))});assert.equal(rows.length,0);assert.ok(p.finish().issues>0);
});
test('same text from distinct identities and edited snapshots preserve source semantics',async()=>{
 const a=conversation(1,2),b=structuredClone(a);Object.values(a.mapping)[2].message.content.parts=Object.values(a.mapping)[1].message.content.parts;Object.values(b.mapping)[1].message.content.parts=['edited source'];
 const r=await project([a,b]);assert.equal(r.rows.length,4);assert.notEqual(r.rows[0].messageId,r.rows[1].messageId);assert.equal(r.rows[0].messageId,r.rows[2].messageId);assert.notEqual(r.rows[0].text,r.rows[2].text);
});
test('many empty parts and repeated graph edges cannot grow an unbounded buffer',async()=>{
 const c=conversation(1,2);Object.values(c.mapping)[1].message.content.parts=Array(20000).fill('');
 const r=await project(c);assert.equal(r.rows.length,1);assert.equal(r.result.skippedMessages,1);
 const large=conversation();Object.values(large.mapping)[0].children=Array(10000).fill(Object.keys(large.mapping)[1]);
 const limited=await project(large);assert.equal(limited.rows.length,0);assert.equal(limited.result.skippedConversations,1);assert.ok(limited.metrics.maxNodes<4096);
});
test('short opaque root node IDs are valid graph anchors, never fallback Source IDs',async()=>{
 const c=conversation(),old=Object.keys(c.mapping)[0],root=c.mapping[old];delete c.mapping[old];root.id='root';c.mapping.root=root;
 for(const n of Object.values(c.mapping))if(n.parent===old)n.parent='root';
 const r=await project(c);assert.equal(r.rows.length,3);assert.ok(r.rows.every(x=>x.branch==='current'&&x.messageId.startsWith('synthetic-message')));
});
