import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource,chargeOriginalOrganizeActionWork,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
const event=()=>({addListener(){},removeListener(){}});
test('UPDATE metadata verification consumes the same bounded action ledger before the action is returned',{timeout:10000},async t=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic consume accounting',operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:'document',documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db.close();});const selection=await source.select(sender,{topicId:topic.id}),before=s.repository.metrics.reads;
 const action=await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()}),metadataReads=s.repository.metrics.reads-before;assert.ok(metadataReads>0);
 let remaining=0,error;while(remaining<=4096){try{chargeOriginalOrganizeActionWork(source,action,s,1,0);remaining++;}catch(e){error=e;break;}}
 console.log(JSON.stringify({control:'consume-metadata-budget',metadataReads,remaining,error:error?.code}));assert.equal(error?.code,'BUDGET_EXCEEDED');assert.ok(remaining<4096,'the UPDATE metadata verification must debit this same action before returning it');assert.ok(remaining>0);assert.throws(()=>assertOriginalOrganizeActionFacts(source,action,s));
});
