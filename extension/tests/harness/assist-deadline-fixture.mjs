// Test-owned scheduling isolates the provider-entered cases from the separate
// real pre-provider deadline case. Only the original named abort timer with
// the exact 25ms parameter is held; arm() uses that same callback and native
// timer. No runtime permission, outcome, cancellation or duration is replaced.
export function installAssistDeadlineFixture(host=globalThis){
 host.__controlAssistProviderDeadline=timeoutMs=>{
  const set=host.setTimeout,clear=host.clearTimeout;let held=null,restored=false;
  const schedule=function(callback,delay,...args){
   if(delay!==timeoutMs||typeof callback!=='function'||callback.name!=='abort'||args.length)return Reflect.apply(set,host,[callback,delay,...args]);
   if(held)throw Error('duplicate original Assist deadline');
   held={callback,token:Symbol('original-assist-deadline'),native:null,armed:false,cancelled:false};return held.token;
  };
  const cancel=function(id){if(held&&id===held.token){held.cancelled=true;if(held.native!==null)Reflect.apply(clear,host,[held.native]);return;}return Reflect.apply(clear,host,[id]);};
  host.setTimeout=schedule;host.clearTimeout=cancel;
  return Object.freeze({
   arm(){if(restored||!held||held.armed||held.cancelled)throw Error('original Assist deadline unavailable');held.armed=true;held.native=Reflect.apply(set,host,[held.callback,timeoutMs]);},
   state(){return Object.freeze({captured:!!held,armed:held?.armed===true,cancelled:held?.cancelled===true});},
   restore(){if(restored)return;restored=true;if(held?.native!==null&&held?.native!==undefined)Reflect.apply(clear,host,[held.native]);const intact=host.setTimeout===schedule&&host.clearTimeout===cancel;host.setTimeout=set;host.clearTimeout=clear;if(!intact)throw Error('Assist fixture timer ownership changed');}
  });
 };
}

