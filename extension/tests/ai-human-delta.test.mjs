import test from 'node:test';
import assert from 'node:assert/strict';
import {AIHumanDelta,humanDeltaText} from '../ui/ai-human-delta.js';
const input=(t,text,data)=>t.update(text,{inputType:'insertText',data});
test('mixed human inserts retain only inserted strings and exact baseline deletion offsets',()=>{
 const t=new AIHumanDelta('old AI middle AI');input(t,'old human AI middle AI',' human');input(t,'old human AI middle AI tail',' tail');
 assert.deepEqual(t.snapshot(),{clear:false,changes:[{at:3,deleteCount:0,insertions:[' human'],unverified:false},{at:16,deleteCount:0,insertions:[' tail'],unverified:false}]});
 t.update('old human AI tail',{inputType:'deleteContentBackward'});
 assert.deepEqual(t.snapshot(),{clear:false,changes:[{at:3,deleteCount:0,insertions:[' human'],unverified:false},{at:7,deleteCount:9,insertions:['tail'],unverified:false}]});
 assert.doesNotMatch(humanDeltaText([{label:'field',index:null,...t.snapshot()}]),/old|middle/);
});
test('ambiguous replacement cannot label untouched middle or legacy full snapshot as human prose',()=>{
 const t=new AIHumanDelta('AI unchanged center AI');t.update('NEW unchanged center NEW');const delta=t.snapshot();assert.equal(delta.changes[0].unverified,true);assert.deepEqual(delta.changes[0].insertions,[]);assert.doesNotMatch(JSON.stringify(delta),/unchanged|center|NEW/);
});
test('explicit empty clear retains deletion intent without any old value',()=>{
 const t=new AIHumanDelta('forbidden old prose');t.update('');assert.deepEqual(t.snapshot(),{clear:true,changes:[{at:0,deleteCount:19,insertions:[],unverified:false}]});assert.match(humanDeltaText([{label:'field',index:1,...t.snapshot()}]),/清空此项/);assert.doesNotMatch(humanDeltaText([{label:'field',index:1,...t.snapshot()}]),/forbidden/);
});
test('replacing an earlier human insertion removes its old text from the latest recovery delta',()=>{
 const t=new AIHumanDelta('AI');input(t,'AI first',' first');input(t,'AI latest','latest');assert.deepEqual(t.snapshot().changes[0].insertions,[' ','latest']);assert.doesNotMatch(JSON.stringify(t.snapshot()),/first|AI/);
});
test('older canonical ACK rebases conservatively without trusting an unchanged AI substring',()=>{
 const t=new AIHumanDelta('AI start');input(t,'AI start first',' first');input(t,'AI start first latest',' latest');t.commit('AI start first');assert.deepEqual(t.snapshot(),{clear:false,changes:[{at:14,deleteCount:0,insertions:[' latest'],unverified:false}]});
});
