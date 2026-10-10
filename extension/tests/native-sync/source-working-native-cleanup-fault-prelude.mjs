// Test-only captured-method fault, installed BEFORE original native owners
// initialize. Genuine IDBFactory/Database/Transaction/Request/events stay native.
// Normal removal is forwarded byte-for-byte in call order; only this isolated
// terminal case refuses IDBRequest success/error listener removal explicitly.
const original=Object.getOwnPropertyDescriptor(EventTarget.prototype,'removeEventListener');
const state=Object.seal({enabled:false,calls:0});
Object.defineProperty(globalThis,'__sourceWorkingNativeCleanupFault',{value:state});
Object.defineProperty(EventTarget.prototype,'removeEventListener',{...original,value:function(type,...args){
 if(state.enabled&&this instanceof IDBRequest&&(type==='success'||type==='error')){state.calls++;throw Error('SYNTHETIC_SOURCE_REQUEST_LISTENER_CLEANUP_FAILURE');}
 return original.value.call(this,type,...args);
}});
