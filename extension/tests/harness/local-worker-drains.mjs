// Observe the actual local runners. No replacement work, clocks or store writes.
import assert from 'node:assert/strict';
import {SafetyRunner} from '../../core/thought-runner.js';
import {LibraryRunner} from '../../core/library-runner.js';
import {FilterRunner} from '../../core/filter-runner.js';

export function observeLocalWorkerDrains(){
 const instances=new Set(),pending=new Set(),restore=[];let revision=0,disposed=false;
 for(const prototype of [SafetyRunner.prototype,FilterRunner.prototype]){
  const original=prototype.wake;
  const observed=function(...args){
   instances.add(this);revision++;
   const result=original.apply(this,args);
   if(result&&typeof result.then==='function'){
    pending.add(result);result.then(()=>pending.delete(result),()=>pending.delete(result));
   }
   return result;
  };
  prototype.wake=observed;restore.push(()=>{assert.equal(prototype.wake,observed);prototype.wake=original;});
 }
 return {
  async idle(){
   assert.equal(disposed,false);
   for(;;){
    // A successful original RPC resolves before its ready.then(scheduleFilter).
    await Promise.resolve();
    const at=revision,active=new Set([...pending,...[...instances].map(x=>x.running).filter(Boolean)]);
    if(active.size){await Promise.all(active);continue;}
    await Promise.resolve();
    for(const instance of instances)assert.equal(instance.failed,false,'original local runner completed without suppressing a failure');
    if(at!==revision||pending.size||[...instances].some(x=>x.running||x.requested))continue;
    return;
   }
  },
  assertOwners(){
   for(const Type of [SafetyRunner,LibraryRunner,FilterRunner])assert.ok([...instances].some(x=>x.constructor===Type),'observed original '+Type.name);
  },
  dispose(){if(disposed)return;assert.equal(pending.size,0,'all observed work is drained before restoring methods');disposed=true;for(const fn of restore.reverse())fn();},
 };
}
