import test from 'node:test';
import assert from 'node:assert/strict';
import {installCaptureToggleEvidence,captureToggleRoundTrip,finishSettingsAttempts} from './harness/settings-capture-toggle-evidence.mjs';
function fixture(){
 const old={document:globalThis.document,chrome:globalThis.chrome},listeners=new Map(),control={disabled:false,isConnected:true,getAttribute:()=> 'true',getClientRects:()=>[{}],contains:()=>false};
 const calls=[],send=function(...args){const result=Promise.resolve({ok:true,data:{enabled:false,consented:true,settings:{enabled:false,consentVersion:1},privateBody:'NEVER_RETAIN'}});calls.push({receiver:this,args,result});return result;};
 globalThis.document={getElementById:()=>control,activeElement:control,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{assert.equal(listeners.get(type),fn);listeners.delete(type);}};globalThis.chrome={runtime:{sendMessage:send}};
 return {send,calls,control,listeners,restore(){for(const [key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;delete globalThis.__settingsCaptureEvidence;}};
}
test('trace preserves original RPC promise, receiver and bounded metadata only',async()=>{
 const f=fixture();try{installCaptureToggleEvidence();const receiver=chrome.runtime;const message={type:'SET_ENABLED',enabled:false,privateBody:'NEVER_RETAIN'},callback=()=>{};const promise=receiver.sendMessage(message,callback);assert.equal(promise,f.calls[0].result);assert.equal(f.calls[0].args[0],message);assert.equal(f.calls[0].args[1],callback);assert.equal(f.calls[0].args.length,2);await promise;
 for(let i=0;i<30;i++){await receiver.sendMessage({type:'GET_PAGE'});f.listeners.get('click')({type:'click',target:f.control,isTrusted:true});}
 const trace=__settingsCaptureEvidence.finish();assert.equal(chrome.runtime.sendMessage,f.send);assert.equal(f.listeners.size,0);assert.equal(trace.reads.length,12);assert.equal(trace.events.length,12);assert.equal(trace.writes.length,1);assert.equal(trace.writes[0].requested,false);assert.equal(trace.writes[0].enabled,false);assert.equal(trace.writes[0].consented,true);assert.equal(f.calls[0].receiver,receiver);assert.equal(JSON.stringify(trace).includes('NEVER_RETAIN'),false);
 }finally{f.restore();}
});
test('failed second native toggle preserves original error, original two clicks and default deadline',async()=>{
 const f=fixture(),failure=Error('original state failure');let clicks=0,polls=0;try{
 const page={evaluate:async(fn,arg)=>fn(arg),locator:()=>({click:async()=>{clicks++;}})};
 await assert.rejects(captureToggleRoundTrip(page,{rpc:async()=>({enabled:true}),eventually:async(...args)=>{assert.equal(args.length,2);assert.equal(typeof args[0],'function');if(++polls===2)throw failure;}}),error=>{assert.equal(error,failure);assert.equal(error.captureToggleEvidence.stage,'capture-restore');return true;});
 assert.equal(clicks,2);assert.equal(polls,2);assert.equal(chrome.runtime.sendMessage,f.send);assert.equal(f.listeners.size,0);
 }finally{f.restore();}
});

test('snapshot and one listener removal failure still attempt every restoration',()=>{
 const f=fixture(),snapshotError=Error('snapshot'),removeError=Error('remove');try{
  installCaptureToggleEvidence();const removals=[],remove=document.removeEventListener;document.removeEventListener=(type,fn,capture)=>{removals.push(type);remove(type,fn,capture);if(type==='pointerdown')throw removeError;};f.control.getClientRects=()=>{throw snapshotError;};
  assert.throws(()=>__settingsCaptureEvidence.finish(),error=>error===snapshotError);assert.deepEqual(removals,['pointerdown','pointerup','click']);assert.equal(chrome.runtime.sendMessage,f.send);assert.equal(f.listeners.size,0);assert.equal('__settingsCaptureEvidence' in globalThis,false);
 }finally{f.restore();}
});
test('synchronous send error preserves identity and finally restores the exact sender',()=>{
 const f=fixture(),failure=Error('sync');try{const sender=function(){throw failure;};chrome.runtime.sendMessage=sender;installCaptureToggleEvidence();assert.throws(()=>chrome.runtime.sendMessage({type:'SET_ENABLED',enabled:true}),error=>error===failure);const trace=__settingsCaptureEvidence.finish();assert.equal(trace.writes[0].state,'threw');assert.equal(chrome.runtime.sendMessage,sender);}finally{f.restore();}
});
test('combined native failure, snapshot failure and both outer cleanup failures preserve the native error',async()=>{
 const f=fixture(),primary=Error('native'),snapshot=Error('snapshot'),restore=Error('restore'),visited=[];let caught;try{
 const page={evaluate:async(fn,arg)=>fn(arg),locator:()=>({click:async()=>{f.control.getClientRects=()=>{throw snapshot;};throw primary;}})};
 try{await captureToggleRoundTrip(page,{rpc:async()=>({enabled:true}),eventually:async()=>{}});}catch(error){caught=error;}
 await assert.rejects(finishSettingsAttempts(caught,[async()=>{visited.push('scale');throw restore;},async()=>{visited.push('preferences');throw Error('preferences');}]),error=>error===primary);
 assert.deepEqual(visited,['scale','preferences']);assert.equal(chrome.runtime.sendMessage,f.send);assert.equal(f.listeners.size,0);assert.equal('__settingsCaptureEvidence' in globalThis,false);
 }finally{f.restore();}
});
test('successful action fails with first cleanup error and still attempts subsequent cleanup',async()=>{
 const first=Error('first'),visited=[];await assert.rejects(finishSettingsAttempts(null,[()=>{visited.push(1);throw first;},()=>{visited.push(2);throw Error('second');}]),error=>error===first);assert.deepEqual(visited,[1,2]);
});
