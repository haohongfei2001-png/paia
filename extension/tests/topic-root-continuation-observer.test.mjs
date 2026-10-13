import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
const method=source.slice(source.indexOf(' updateHomeContinuous(state){'),source.indexOf('\n async renderHomeReader('));
function fixture(){const nodes=new Map(),calls=[];const get=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{}});return nodes.get(id);};const owner=vm.runInNewContext('({'+method+'})',{$:get,tc:x=>x,clearTimeout(){},setTimeout(){throw Error('Unexpected polling for a real continuation cursor');}});owner.continuousObserver={unobserve:node=>calls.push(['unobserve',node]),observe:node=>calls.push(['observe',node])};return {owner,calls,sentinel:get('thought-continuous-sentinel')};}
test('completed partial Root render re-arms the real sentinel for a still-visible continuation',()=>{const f=fixture();f.owner.updateHomeContinuous({items:[],cursor:'next-page',terminal:false,coverage:{complete:false}});assert.deepEqual(f.calls,[['unobserve',f.sentinel],['observe',f.sentinel]]);assert.equal(f.sentinel.dataset.terminal,'false');});
for(const reason of ['terminal','loading','error','stale','protectionBlocked'])test('Root continuation does not re-arm while '+reason,()=>{const f=fixture();f.owner.updateHomeContinuous({items:[],cursor:'next-page',coverage:{complete:false},[reason]:true});assert.deepEqual(f.calls,[]);});
test('complete Root and no-observer environments do not start another read',()=>{const f=fixture();f.owner.updateHomeContinuous({items:[],terminal:true,complete:true});assert.deepEqual(f.calls,[]);delete f.owner.continuousObserver;f.owner.updateHomeContinuous({items:[],cursor:'next-page'});assert.deepEqual(f.calls,[]);});

const loadMethod=source.slice(source.indexOf(' async loadHomeNext('),source.indexOf('\n async shiftHomeWindow('));
for(const retry of [false,true])test('Root continuation restores the known extent before painting, including explicit retry '+retry,async()=>{
 const calls=[],collection={items:Array(40).fill({}),error:retry?Error('synthetic read failure'):null,async loadNext(){calls.push('next');this.error=null;return {items:this.items};},async loadUntil(options){assert.equal(this.error,null,'explicit retry must clear the original read error via loadNext');calls.push(options);this.items=Array(144).fill({});return {items:this.items};}};
 const owner=vm.runInNewContext('({'+loadMethod+'})');Object.assign(owner,{homeCollection:collection,homeDesiredCount:144,thoughtRootVisible:()=>true,captureHomeAnchor:()=>null,renderHomeReader:async()=>calls.push('paint')});
 await owner.loadHomeNext();assert.equal(calls[0],'next');assert.equal(calls[1].minItems,144);assert.equal(calls[1].maxLoads,30);assert.equal(calls[2],'paint');
});
