import assert from 'node:assert/strict';
import {setup} from '../tests/harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
const {s}=await setup(LibraryDocumentsStore),op=()=>crypto.randomUUID(),t=await s.createTopic({name:'Synthetic ties',operationId:op()}),entries=[];
for(let i=0;i<3;i++)entries.push(await s.createEntry({actor:'user',operationId:op(),body:'Synthetic rank',type:'idea',formation:'explicit',evidence:[]}));entries.sort((a,b)=>a.id.localeCompare(b.id));
for(const [i,e]of entries.entries())await s.placeEntry({topicId:t.id,entryId:e.id,rank:i===0?'600000000000':'500000000000',expectedEntryRevision:0,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,operationId:op()});
const before=await s.topicDocumentPage({topicId:t.id});await s.reorderPlacement({topicId:t.id,entryId:entries[0].id,otherEntryId:entries[2].id,expectedTopicRevision:before.topic.organizationRevision,operationId:op()});await s.drainLibraryMaintenance();const after=await s.topicDocumentPage({topicId:t.id});assert.deepEqual(after.items.map(x=>x.entry.id),[entries[1].id,entries[0].id,entries[2].id]);
