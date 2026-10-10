import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPromptFamilies,promptCandidate} from '../core/prompt-family.js';
import {emptyPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {PROMPT_CORRECTION_NORMALIZER_VERSION as version,PROMPT_CORRECTION_BINDING_LIMITS,capturePromptCorrectionBinding,validatePromptCorrectionBinding,planPromptCorrectionBinding} from '../core/browser-native-sync/prompt-correction-binding.js';
const input=(id,text,conversation=id)=>({id,text,conversation,at:null,role:'user',eligible:true});
const manual='manual:11111111-1111-1111-1111-111111111111',group='22222222-2222-2222-2222-222222222222';
const capture=(inputs,preferences,normalizerVersion=version)=>capturePromptCorrectionBinding({inputs,preferences,normalizerVersion});
const plan=(binding,inputs,normalizerVersion=version)=>planPromptCorrectionBinding({binding,inputs,normalizerVersion});
const reject=async run=>assert.rejects(run,{code:'BNS_PROMPT_BINDING_INVALID'});
async function corrected(inputs){const f=await projectPromptFamilies(inputs),p=emptyPromptPreferences();p.pins=f.map(x=>x.id).reverse();p.overrides=f.map(x=>({id:x.id,text:'SYNTHETIC exact template '+x.id,representative:x.members[0],hidden:true,reuseCount:8}));return p;}
test('complete original projector anchors preserve exact portable work/order and exclude local counters',async()=>{
 const inputs=[input('a','请解释这个算法'),input('b','解释这个算法'),input('c','保留全部否定')],p=await corrected(inputs),before=structuredClone({inputs,p});
 assert.equal(promptCandidate(inputs[0].text).normalized,promptCandidate(inputs[1].text).normalized);
 const binding=await capture(inputs,p),result=await plan(binding,inputs);assert.equal(validatePromptCorrectionBinding(binding),true);assert.equal(result.complete,true);assert.deepEqual(result.portablePreferences.pins,p.pins);assert.deepEqual(result.portablePreferences.overrides,p.overrides.map(({reuseCount,...x})=>x));assert.ok(binding.bindings.every(x=>x.inputIds.length));assert.ok(result.mappings.every(x=>x.familyId===x.targetId));assert.deepEqual({inputs,p},before);assert.equal(Object.hasOwn(result.portablePreferences,'revision'),false);assert.equal(Object.isFrozen(binding.portablePreferences.overrides[0]),true);assert.equal(Object.isFrozen(result.mappings[0]),true);assert.throws(()=>{result.portablePreferences.pins.push(manual);},TypeError);
});
test('stable complete Input identities bind a rebuilt family; same text/newest/hash-only substitute does not',async()=>{
 const inputs=[input('a','解释旧版本'),input('b','解释旧版本')],p=await corrected(inputs),binding=await capture(inputs,p),updated=[input('a','解释新版本'),input('b','解释新版本')],result=await plan(binding,updated);
 assert.equal(result.complete,true);assert.notEqual(result.mappings[0].targetId,result.mappings[0].familyId);assert.deepEqual(result.portablePreferences,binding.portablePreferences);
 const substitute=[input('other','解释旧版本'),{...input('newest','解释旧版本'),at:Date.now()}],missing=await plan(binding,substitute);assert.equal(missing.complete,false);assert.equal(missing.mappings[0].targetId,null);assert.equal(missing.unresolved[0].reason,'missing_anchor');
});
test('one missing anchor is not replaced by extra automatic members and divergent anchors remain unresolved',async()=>{
 const inputs=[input('a','相同'),input('b','相同')],binding=await capture(inputs,await corrected(inputs));
 for(const [current,reason]of [[[input('a','相同'),input('extra','相同')],'missing_anchor'],[[input('a','不要删除'),input('b','删除')],'diverged_anchors']]){const r=await plan(binding,current);assert.equal(r.complete,false);assert.equal(r.unresolved[0].reason,reason);assert.deepEqual(r.portablePreferences,binding.portablePreferences);}
});
test('representative must remain a member even when every captured family anchor exists',async()=>{
 const inputs=[input('a','相同'),input('b','相同')],p=await corrected(inputs);p.overrides[0].representative='outside';const b=await capture(inputs,p),r=await plan(b,inputs);assert.equal(r.complete,false);assert.equal(r.unresolved[0].reason,'missing_representative');assert.equal(r.portablePreferences.overrides[0].representative,'outside');
});
test('manual representative and split without a real candidate remain unresolved, retaining original facts',async()=>{
 const p=emptyPromptPreferences();p.overrides=[{id:manual,text:'SYNTHETIC manual',representative:'a',hidden:false,reuseCount:0}];p.splits=[{inputId:'a',group}];const b=await capture([input('a','')],p),r=await plan(b,[input('a','')]);assert.equal(r.complete,false);assert.deepEqual(r.unresolved.map(x=>x.reason),['missing_representative','missing_split_input']);assert.equal(r.portablePreferences.overrides[0].representative,'a');assert.deepEqual(r.portablePreferences.splits,p.splits);
});
test('split/do-not-merge facts and stable group IDs survive and missing split Input is retained unresolved',async()=>{
 const inputs=[input('a','相同'),input('b','相同'),input('c','相同')],p=emptyPromptPreferences();p.splits=[{inputId:'a',group},{inputId:'b',group}];const f=await projectPromptFamilies(inputs,p);p.pins=f.map(x=>x.id);p.overrides=f.map(x=>({id:x.id,hidden:false,reuseCount:0,representative:x.members[0]}));const b=await capture(inputs,p),r=await plan(b,inputs);assert.equal(r.complete,true);assert.deepEqual(r.portablePreferences.splits,p.splits);assert.equal(r.mappings.length,2);
 const missing=await plan(b,inputs.filter(x=>x.id!=='b'));assert.equal(missing.complete,false);assert.ok(missing.unresolved.some(x=>x.kind==='split'&&x.inputId==='b'&&x.group===group));assert.deepEqual(missing.portablePreferences.splits,p.splits);
});
test('independent UUID and orphan work retain exact bodies and pin order without invented memberships',async()=>{
 const absent='pf:'+'a'.repeat(64),p=emptyPromptPreferences();p.pins=[absent,manual];p.overrides=[{id:manual,text:'SYNTHETIC independent\nDo not rewrite.',hidden:true,reuseCount:9},{id:absent,text:'SYNTHETIC orphan',hidden:false,reuseCount:4}];const b=await capture([],p),r=await plan(b,[input('unrelated','SYNTHETIC orphan')]);assert.equal(r.complete,false);assert.deepEqual(r.portablePreferences.pins,p.pins);assert.ok(b.bindings.every(x=>x.inputIds.length===0));assert.deepEqual(r.mappings.find(x=>x.familyId===manual),{familyId:manual,targetId:manual,status:'exact'});assert.equal(r.unresolved[0].reason,'orphan_work');assert.equal(r.portablePreferences.overrides[1].text,'SYNTHETIC orphan');
});
test('unknown normalizer preserves work and refuses derived binding, even if hashes/text currently match',async()=>{
 const inputs=[input('a','请解释算法')],p=await corrected(inputs);p.overrides.push({id:manual,text:'SYNTHETIC manual',hidden:false,reuseCount:1});p.splits=[{inputId:'a',group}];
 for(const b of [await capture(inputs,p),await capture(inputs,p,'future-normalizer-v2')]){const r=await plan(b,inputs,'future-normalizer-v2');assert.equal(r.complete,false);assert.ok(r.unresolved.every(x=>x.reason==='unknown_normalizer'));assert.equal(r.mappings.find(x=>x.familyId===manual).status,'exact');assert.deepEqual(r.portablePreferences,b.portablePreferences);}
});
test('many-to-one convergence never silently overwrites either original correction',async()=>{
 const inputs=[input('a','first'),input('b','second')],p=await corrected(inputs),b=await capture(inputs,p),r=await plan(b,[input('a','merged'),input('b','merged')]);assert.equal(r.complete,false);assert.ok(r.mappings.every(x=>x.targetId===null));assert.equal(r.unresolved.length,2);assert.ok(r.unresolved.every(x=>x.reason==='correction_collision'));assert.deepEqual(r.portablePreferences.pins,p.pins);
});
test('input permutation/time/ranking does not change capture binding or authorize a different correction',async()=>{
 const inputs=[input('a','请解释算法'),input('b','解释算法')],p=await corrected(inputs),b=await capture(inputs,p);const reversed=await capture([...inputs].reverse().map(x=>({...x,at:999})),{...p,revision:999,overrides:p.overrides.map(x=>({...x,reuseCount:999}))});assert.deepEqual(reversed,b);assert.deepEqual(await plan(b,inputs),await plan(b,[...inputs].reverse()));
});
test('ranking-only overrides are not a second portable work owner',async()=>{
 const inputs=[input('a','SYNTHETIC automatic')],f=await projectPromptFamilies(inputs),p=emptyPromptPreferences();p.overrides=[{id:f[0].id,hidden:false,reuseCount:7}];const b=await capture(inputs,p);assert.deepEqual(b.portablePreferences.overrides,[]);assert.deepEqual(b.bindings,[]);assert.equal((await plan(b,inputs)).complete,true);
});
 test('strict binding DTO rejects extra/missing/local fields, duplicate or invalid anchor memberships',async()=>{
 const inputs=[input('a','one'),input('b','two')],b=await capture(inputs,await corrected(inputs));
 const mutants=[x=>x.extra=true,x=>delete x.normalizerVersion,x=>x.portablePreferences.revision=0,x=>x.portablePreferences.overrides[0].reuseCount=1,x=>x.bindings.pop(),x=>x.bindings[0].inputIds.push(x.bindings[1].inputIds[0]),x=>x.bindings[0].inputIds.push(x.bindings[0].inputIds[0]),x=>x.bindings[0].familyId=manual,x=>x.bindings[0].kind='manual',x=>x.bindings[0].inputIds=[],x=>x.portablePreferences.splits.push({inputId:'bad',group:'not-uuid'})];
 for(const mutate of mutants){const x=structuredClone(b);mutate(x);assert.throws(()=>validatePromptCorrectionBinding(x),{code:'BNS_PROMPT_BINDING_INVALID'});await reject(()=>plan(x,inputs));}
});
test('finite parser rejects getters, sparse arrays, symbols, cycles and excess data without invoking code',async()=>{
 const p=emptyPromptPreferences(),getter={};let called=0;Object.defineProperty(getter,'id',{enumerable:true,get(){called++;return 'a';}});await reject(()=>capture([getter],p));assert.equal(called,0);
 const sparse=[];sparse.length=1;await reject(()=>capture(sparse,p));const symbol=input('a','text');symbol[Symbol('hidden')]=true;await reject(()=>capture([symbol],p));const cycle=input('a','text');cycle.loop=cycle;await reject(()=>capture([cycle],p));const longKey=input('a','text');longKey['x'.repeat(201)]=true;await reject(()=>capture([longKey],p));await reject(()=>capture(Array.from({length:PROMPT_CORRECTION_BINDING_LIMITS.inputs+1},(_,i)=>input(String(i),'text')),p));await reject(()=>capture(Array.from({length:23},(_,i)=>input(String(i),'x'.repeat(200000))),p));await reject(()=>capture([input('same','one'),input('same','two')],p));
});
test('escaped UTF8 over-limit DTO is refused before constructing any JSON temporary',async()=>{
 const stringify=JSON.stringify;let calls=0;JSON.stringify=(...args)=>{calls++;return stringify(...args);};
 try{await reject(()=>capture(Array.from({length:4},(_,i)=>input(String(i),'\u0001'.repeat(200000))),emptyPromptPreferences()));assert.equal(calls,0);}
 finally{JSON.stringify=stringify;}
});
test('oversize input array is refused before allocating its own-name vector and invalid UTF16 stays invalid',async()=>{
 const names=Object.getOwnPropertyNames,inputs=Array.from({length:8193},(_,i)=>input(String(i),'text'));let inspected=0;
 Object.getOwnPropertyNames=x=>{if(x===inputs)inspected++;return names(x);};
 try{await reject(()=>capture(inputs,emptyPromptPreferences()));assert.equal(inspected,0);}
 finally{Object.getOwnPropertyNames=names;}
 for(const text of ['\ud800','\udfff'])await reject(()=>capture([input('a',text)],emptyPromptPreferences()));
 const valid=await capture([input('a','\ud83d\ude00'.repeat(20))],emptyPromptPreferences());assert.equal(validatePromptCorrectionBinding(valid),true);
});
