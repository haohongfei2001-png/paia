import test from 'node:test';
import assert from 'node:assert/strict';
import {readPermittedOrganizePresentation} from '../core/organizer/organize-presentation-fields.js';
import {AI_FIELDS,AI_LIST_FIELDS,isStoredAIPresentation} from '../core/organizer/ai-contract.js';
import {mergeIncrementalChildren} from '../core/organizer/ai-incremental-v2.js';
import {legacyV2Generation,promoteIncrementalV2} from '../core/organizer/ai-incremental-v3.js';

const topicId='selected-topic',entryId='selected-entry',profile={contractVersion:'test',modelVersion:'test',promptVersion:'test'},style={available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'},control=JSON.stringify([1,'initial',style,JSON.stringify({filterMode:'off',externalAccess:true,localOnly:false})]);
function legacy(){return {id:'aiPresentation:'+topicId,topicId,revision:1,blockSummary:'Accepted summary',currentView:'Accepted view',...Object.fromEntries(AI_LIST_FIELDS.map(k=>[k,[]])),evidenceEntryIds:[entryId],protections:{},basedOnCheckpoint:{entryVersions:{[entryId]:'revision'}}};}
function incremental(){const raw={id:'block',field:'currentView',index:null,start:0,end:0,support:[{id:entryId,version:'revision',scope:'scope'}],spans:[{entryId,revision:'revision',start:0,end:4}],manual:false,text:'Text'};return {...mergeIncrementalChildren([raw],{topicId,style:{value:'balanced'},profile},{topic:{entries:[{id:entryId}],stored:null},incremental:{retained:[],control}}),id:'aiPresentation:'+topicId,revision:1,basedOnCheckpoint:{entryVersions:{[entryId]:'revision'}},cacheBinding:{version:1,topicId,presentationRevision:1,profile,style:{value:'balanced',policyVersion:'AIOS-1.0'},evidenceVersion:'synthetic-metadata'}};}
function read(row,{check=()=>{},maxBytes=2*1024*1024,entryIds=[entryId]}={}){let bytes=0;return readPermittedOrganizePresentation(row,{topicId,entryIds,check,charge:text=>{bytes+=new TextEncoder().encode(text).length;assert.ok(bytes<=maxBytes,'cumulative original qualification byte budget');return text;}});}
for(const kind of ['legacy','v2','v3'])test('original '+kind+' accepted presentation decoder preserves the complete qualified fields',async()=>{
 const row=kind==='legacy'?legacy():incremental();const expected=kind==='v3'?promoteIncrementalV2(row,await legacyV2Generation(row)):row;assert.equal(isStoredAIPresentation(expected,new Set([entryId])),true);const result=read(expected);assert.deepEqual(result,expected);assert.notEqual(result,expected);assert.equal(isStoredAIPresentation(result,new Set([entryId])),true);
});

test('a manual protected accepted field retains its original ownership metadata',()=>{const row=legacy();row.protections.currentView=true;row.userEditedAt=42;assert.deepEqual(read(row),row);});

test('unknown accepted-row property rejects without visiting its getter',()=>{const row=legacy();let calls=0;Object.defineProperty(row,'futurePrivateText',{enumerable:true,get(){calls++;throw Error('must not read');}});assert.throws(()=>read(row));assert.equal(calls,0);});

test('late nested presentation accessor rejects without executing it',()=>{const row=incremental();let calls=0;Object.defineProperty(row.projection,'currentView',{enumerable:true,get(){calls++;return 'PRIVATE';}});assert.throws(()=>read(row));assert.equal(calls,0);});

test('unknown nested generation and array properties reject without getter evaluation',async()=>{
 const v2=incremental(),row=promoteIncrementalV2(v2,await legacyV2Generation(v2));let calls=0;Object.defineProperty(Object.values(row.manifest.generations)[0],'futurePrivateText',{enumerable:true,get(){calls++;return 'PRIVATE';}});assert.throws(()=>read(row));assert.equal(calls,0);
 const old=legacy();Object.defineProperty(old.evidenceEntryIds,'futurePrivateText',{enumerable:true,get(){calls++;return 'PRIVATE';}});assert.throws(()=>read(old));assert.equal(calls,0);
});

test('original semantic validators still reject changed support and omitted fields',()=>{
 for(const change of [r=>{r.manifest.blocks[0].support[0].id='other';},r=>{delete r.projection.currentView;},r=>{r.manifest.blocks[0].end=999;}]){const row=incremental();change(row);assert.throws(()=>read(row));}
});

test('a checkpoint for another Entry is not silently added to the qualified closure',()=>{const row=legacy();row.basedOnCheckpoint.entryVersions.other='OTHER';assert.throws(()=>read(row));});

test('pending proposals and other Topic IDs cannot be upgraded to accepted fields',()=>{for(const change of [r=>{r.candidate={private:'PRIVATE'};},r=>{r.topicId='other';},r=>{r.id='aiPresentation:other';}]){const row=legacy();change(row);assert.throws(()=>read(row));}});

test('revocation during traversal rejects before a later body is read',()=>{const row=legacy();let calls=0;assert.throws(()=>read(row,{check(){if(++calls===12)throw Error('revoked');}}),/revoked/);assert.equal(calls,12);});

test('all nested accepted fields share the same cumulative UTF-8 budget',()=>{const row=legacy();row.blockSummary='界'.repeat(100);row.currentView='界'.repeat(100);assert.throws(()=>read(row,{maxBytes:500}),/cumulative original qualification byte budget/);assert.deepEqual(read(row,{maxBytes:4096}),row);});

test('closed arrays, prototypes and symbols are not semantic input',()=>{for(const change of [r=>{delete r.evidenceEntryIds[0];},r=>{r.protections[Symbol('private')]='value';},r=>{Object.setPrototypeOf(r.protections,{private:'value'});}]){const row=legacy();change(row);assert.throws(()=>read(row));}});
