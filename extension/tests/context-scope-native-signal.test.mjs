import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {readContextTopicScope,createContextScopeWorkBudget} from '../core/context-topic-scope.js';
const op=()=>crypto.randomUUID();
async function fixture(t){
 const {s}=await setup(OrganizerStore);t.after(()=>s.repository.close());await s.finishFoundation();await s.setFilterMode('off');const input=(await s.snapshot()).library.blocks[0];await inputEdit(s,input.id,{libraryText:'SYNTHETIC_SCOPE_INPUT_BODY',note:'SYNTHETIC_SCOPE_INPUT_NOTE'});const topic=await s.createTopic({operationId:op(),name:'Synthetic scope Topic'}),current=await s.input(input.id);await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});const cards=new ContextCardsService(s);for(const key of ['global','inputs'])await cards.change({operationId:op(),kind:'access',key,enabled:true,expectedRevision:0,epoch:'initial'});const prior=await readContextTopicScope(s,{topicId:topic.id});assert.equal(prior.available,true,prior.reason);const access=new ContextTopicAccessService(s);assert.equal((await access.change({operationId:op(),topicId:topic.id,epoch:prior.binding.epoch,enabled:true,expectedBinding:prior.binding,expectedRevision:0})).ok,true);return {s,topic};
}
for(const mode of ['ordinary active','active own true','aborted own false','late original abort'])test('original material scope reads native signal facts: '+mode,async t=>{
 const f=await fixture(t),controller=new AbortController();let getters=0,transactions=0,checks=0;if(mode!=='ordinary active')Object.defineProperty(controller.signal,'aborted',{get(){getters++;return mode==='active own true';}});if(mode==='aborted own false')controller.abort();const original=f.s.repository.transaction.bind(f.s.repository);t.mock.method(f.s.repository,'transaction',(...args)=>{transactions++;return original(...args);});const budget=createContextScopeWorkBudget({database:f.s.repository.db,signal:controller.signal,isCurrent:()=>{checks++;if(mode==='late original abort')controller.abort();return true;}}),result=await readContextTopicScope(f.s,{topicId:f.topic.id},budget);assert.equal(result.available,mode==='ordinary active'||mode==='active own true',result.reason);assert.equal(getters,0);if(mode==='aborted own false'){assert.equal(transactions,0);assert.equal(checks,0);}if(mode==='late original abort')assert.equal(checks,1);
});
