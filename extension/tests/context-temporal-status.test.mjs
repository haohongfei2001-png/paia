import test from 'node:test';
import assert from 'node:assert/strict';
import {ContextTemporalStatus} from '../ui/context-temporal-status.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

const item=()=>({card:'now',origin:'automatic',protected:false,userEdited:false,lifecycle:'active',maintenance:{temporal:{temporalScope:'SYNTHETIC current project',uncertainty:null,validUntil:'2026-10-17T00:00:01.000Z'}}});
function fixture(run){
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={documentElement:{lang:'en'}};
 let at=Date.parse('2026-10-17T00:00:00.000Z'),current=item(),editing=false,live=true;const scheduled=[],cancelled=[],node=new PresentationNode('span');
 const status=new ContextTemporalStatus({node,item:()=>current,isEditing:()=>editing,isCurrent:()=>live,clock:()=>at,schedule:(callback,delay)=>{const task={callback,delay};scheduled.push(task);return task;},cancel:task=>cancelled.push(task)});
 try{return run({node,status,scheduled,cancelled,current,advance:value=>at=value,setItem:value=>current=value,setEditing:value=>editing=value,setLive:value=>live=value});}
 finally{status.dispose();if(original)Object.defineProperty(globalThis,'document',original);else delete globalThis.document;}
}
test('Now explicit expiry paints at its exact deadline without mutating canonical metadata',()=>fixture(({node,status,scheduled,current,advance})=>{
 const before=structuredClone(current);assert.equal(node.hidden,true);assert.equal(scheduled[0].delay,1000);
 advance(Date.parse(current.maintenance.temporal.validUntil));scheduled[0].callback();assert.equal(node.hidden,false);assert.match(node.textContent,/Validity period ended/);assert.deepEqual(current,before);assert.equal(status.timer,null);
}));
test('manual, protected, edited and other-card Items never receive a clock expiry note',()=>fixture(({node,status,setItem})=>{
 for(const patch of [{origin:'manual'},{protected:true,userEdited:true},{card:'info'},{card:'rules'},{lifecycle:'removed'}]){setItem({...item(),...patch});status.refresh();assert.equal(node.hidden,true);assert.equal(node.textContent,'');assert.equal(status.timer,null);}
}));
test('unknown or invalid temporal metadata cannot invent a deadline or schedule work',()=>fixture(({node,status,setItem})=>{
 for(const temporal of [undefined,{temporalScope:null,uncertainty:null,validUntil:null},{...item().maintenance.temporal,validUntil:'not a date'},{...item().maintenance.temporal,unexpected:true}]){setItem({...item(),maintenance:{temporal}});status.refresh();assert.equal(node.hidden,true);assert.equal(status.timer,null);}
}));
test('editing and retired timers cannot change a newer current editor status',()=>fixture(({node,status,scheduled,setEditing,setItem,advance})=>{
 const old=scheduled[0];setEditing(true);status.refresh();advance(Date.parse(item().maintenance.temporal.validUntil));old.callback();assert.equal(node.hidden,true);assert.equal(status.timer,null);
 setEditing(false);setItem({...item(),protected:true,userEdited:true});status.refresh();old.callback();assert.equal(node.hidden,true);assert.equal(node.textContent,'');
}));
test('timer platform maximum does not replace a later explicit expiry',()=>fixture(({status,scheduled,setItem})=>{
 setItem({...item(),maintenance:{temporal:{...item().maintenance.temporal,validUntil:'2036-10-17T00:00:00.000Z'}}});status.refresh();assert.equal(scheduled.at(-1).delay,2147483647);
}));
test('dispose and route departure clear the note and fence late callbacks',()=>fixture(({node,status,scheduled,advance,setLive})=>{
 const old=scheduled[0];advance(Date.parse(item().maintenance.temporal.validUntil));setLive(false);old.callback();assert.equal(node.hidden,true);assert.equal(status.timer,null);
 status.dispose();old.callback();assert.equal(node.hidden,true);assert.equal(node.textContent,'');
}));
