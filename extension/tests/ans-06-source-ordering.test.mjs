import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,seedMetadata,ArchiveNavigationQuery} from './harness/ans-navigation.mjs';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {clearSourceStructureEphemeral} from '../core/source-structure-backup.js';
import {
 ArchiveOrderPreferenceService,SourceOrderRegistry,SourceOrderStore,
 validateSourceOrderResult,unavailableSourceOrderProvider
} from '../core/source-ordering.js';

const NOW=Date.UTC(2026,8,20,2);
const project=(id,providerKey='synthetic',namespace='account-main')=>({providerKey,namespace,projectId:id});
const windowRef=(id,providerKey='synthetic',namespace='account-main')=>({providerKey,namespace,sourceConversationId:id});
const order=(overrides={})=>({
 availability:'available',providerKey:'synthetic',namespace:'account-main',
 scopeKind:'projects',scopeRef:null,orderedRefs:[project('alpha'),project('beta')],
 contractId:'ans06.synthetic.order',contractVersion:1,evidenceKind:'synthetic_fixture',
 observationId:'order-1',observedAt:new Date(NOW).toISOString(),
 expiresAt:new Date(NOW+7*86400000).toISOString(),completeness:'complete_scope',generation:'g1',
 ...overrides
});
const sourceEvidence=n=>({
 id:'ans06-evidence-'+n,contractId:'ans06.synthetic.structure',contractVersion:1,
 channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,
 evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')
});
async function sourcePage(q,options,max=1000){
 let last;
 for(let i=0;i<max;i++){
  last=await q.page({...options,mode:'source'});
  if(last.coverage.state==='complete'&&last.effectiveOrdering==='source')return last;
 }
 throw Error('source-order projection did not publish: '+JSON.stringify({reason:last?.unavailableReason,coverage:last?.coverage}));
}
async function seedProjects(s){
 await seedMetadata(s,5,{providers:['synthetic']});
 const structure=new SourceStructureStore(s),refs=[project('alpha'),project('beta')];
 for(let i=0;i<5;i++){
  const conversationRef={platform:'synthetic',sourceConversationId:'ans04-chat-'+i};
  const target=i<3?refs[0]:refs[1],current=await structure.conversation(conversationRef);
  await structure.observeConversation({
   conversationRef,expectedRevision:current?.relationshipRevision||0,
   observedAt:new Date(NOW+i*1000).toISOString(),evidence:sourceEvidence(i+1),
   membership:{state:'project',projectRef:target},projectName:target.projectId.toUpperCase(),
   sourceStatus:'observed_active'
  });
 }
 for(let i=0;i<refs.length;i++){
  const current=await structure.project(refs[i]);
  await structure.observeProject({projectRef:refs[i],expectedRevision:current?.relationshipRevision||0,
   observedAt:new Date(NOW+10000+i*1000).toISOString(),evidence:sourceEvidence(10+i),
   currentName:refs[i].projectId.toUpperCase(),sourceStatus:'observed_active'});
 }
 return refs;
}
test('ANS-06 registry is provider-generic while ChatGPT can remain unavailable',async()=>{
 const synthetic={status:()=>({availability:'available'}),getOrder:async q=>order({providerKey:q.providerKey,namespace:q.namespace,scopeKind:q.scopeKind,scopeRef:q.scopeRef})};
 const registry=new SourceOrderRegistry([['synthetic',synthetic],['chatgpt',unavailableSourceOrderProvider('UNVERIFIED')]]);
 assert.equal(registry.status('chatgpt').availability,'unavailable');
 const got=await registry.getOrder({providerKey:'synthetic',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW});
 assert.equal(got.availability,'available');assert.equal(got.providerKey,'synthetic');assert.deepEqual(got.orderedRefs.map(x=>x.projectId),['alpha','beta']);
 const denied=await registry.getOrder({providerKey:'chatgpt',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW});
 assert.equal(denied.availability,'unavailable');assert.equal(denied.reasonCode,'UNVERIFIED');
});

test('ANS-06 order admission rejects duplicate, cross-scope, oversized and future evidence',()=>{
 const req={providerKey:'synthetic',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW};
 assert.throws(()=>validateSourceOrderResult(order({orderedRefs:[project('alpha'),project('alpha')]}),req));
 assert.throws(()=>validateSourceOrderResult(order({orderedRefs:[project('alpha','other')]}),req));
 assert.throws(()=>validateSourceOrderResult(order({orderedRefs:Array.from({length:10001},(_,i)=>project('p'+i))}),req));
 assert.throws(()=>validateSourceOrderResult(order({observedAt:new Date(NOW+5*60*1000+1).toISOString()}),req));
});

test('ANS-06 cache publishes complete generations only and preserves last good pointer on interrupted replacement',async()=>{
 const {s}=await completeFixture({texts:[]}),store=new SourceOrderStore(s);
 await store.observe(order(),{now:NOW});
 let active=await store.active({providerKey:'synthetic',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW+1000});
 assert.deepEqual(active.orderedRefs.map(x=>x.projectId),['alpha','beta']);
 const interrupted=new SourceOrderStore(s,{checkpoint:async phase=>{if(phase==='beforePointer')throw Error('synthetic interrupt');}});
 await assert.rejects(()=>interrupted.observe(order({orderedRefs:[project('beta'),project('alpha')],observationId:'order-2',generation:'g2'}),{now:NOW}),/synthetic interrupt/);
 active=await store.active({providerKey:'synthetic',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW+2000});
 assert.equal(active.observationId,'order-1');assert.deepEqual(active.orderedRefs.map(x=>x.projectId),['alpha','beta']);
});

test('ANS-06 cache fails closed on clock rollback and the 24-hour freshness ceiling',async()=>{
 const {s}=await completeFixture({texts:[]}),store=new SourceOrderStore(s);
 await store.observe(order(),{now:NOW});
 assert.equal((await store.active({providerKey:'synthetic',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW-1})).reasonCode,'CLOCK_ROLLBACK');
 assert.equal((await store.active({providerKey:'synthetic',namespace:'account-main',scopeKind:'projects',scopeRef:null,now:NOW+24*60*60*1000+1})).reasonCode,'STALE');
});

test('ANS-06 source overlay ranks verified projects/windows and keeps unranked archive members in stable PAIA tail',async t=>{
 // Match implicit projection reads to the fixture clock; stale/rollback boundaries remain tested above.
 t.mock.method(Date,'now',()=>NOW+60000);
 const {s}=await completeFixture({texts:[]}),[alpha,beta]=await seedProjects(s),store=new SourceOrderStore(s);
 await store.observe(order({orderedRefs:[beta,alpha],observationId:'projects-1'}),{now:NOW});
 await store.observe(order({scopeKind:'windows',scopeRef:alpha,orderedRefs:[windowRef('ans04-chat-1'),windowRef('ans04-chat-0')],observationId:'alpha-windows',generation:'wa'}),{now:NOW});
 const q=new ArchiveNavigationQuery(s);
 const groups=await sourcePage(q,{providerKey:'synthetic',groupKind:'groups'});
 assert.deepEqual(groups.items.filter(x=>x.groupKind==='project').map(x=>x.projectRef.projectId),['beta','alpha']);
 const windows=await sourcePage(q,{providerKey:'synthetic',groupKind:'project',projectRef:alpha});
 assert.deepEqual(windows.items.map(x=>x.conversationRef.sourceConversationId),['ans04-chat-1','ans04-chat-0','ans04-chat-2']);
 assert.equal(windows.items.at(-1).conversationRef.sourceConversationId,'ans04-chat-2');
});

test('ANS-06 namespace conflict falls back to PAIA and ephemeral reset restores default preference without touching archive facts',async t=>{
 // Match implicit projection reads to the fixture clock; stale/rollback boundaries remain tested above.
 t.mock.method(Date,'now',()=>NOW+60000);
 const {s}=await completeFixture({texts:[]}),store=new SourceOrderStore(s),preference=new ArchiveOrderPreferenceService(s);
 await seedProjects(s);
 await store.observe(order({observationId:'ns-a'}),{now:NOW});
 await store.observe(order({namespace:'other',orderedRefs:[project('outside','synthetic','other')],observationId:'ns-b',generation:'gb'}),{now:NOW});
 const q=new ArchiveNavigationQuery(s);let page;
 for(let i=0;i<100;i++){page=await q.page({providerKey:'synthetic',groupKind:'groups',mode:'source'});if(page.coverage.state==='complete')break;}
 assert.equal(page.coverage.state,'complete');assert.equal(page.effectiveOrdering,'paia');assert.equal(page.unavailableReason,'NAMESPACE_CONFLICT');
 const before=await s.page({view:'settings'});
 await preference.write('source');assert.equal((await preference.read()).mode,'source');
 const after=await s.page({view:'settings'});assert.deepEqual(after.preferences,before.preferences);
 await s.repository.transaction(true,t=>clearSourceStructureEphemeral(t));
 assert.equal((await preference.read()).mode,'paia');
 assert.equal((await store.activeProjects('synthetic',{now:NOW})).availability,'unavailable');
 const documentCount=await s.repository.transaction(false,t=>t.count('documents'));assert.equal(documentCount,5);
});
