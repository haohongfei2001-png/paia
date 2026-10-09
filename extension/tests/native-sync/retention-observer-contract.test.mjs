import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('native extra-case observer survives synthetic events until a real trusted event',async()=>{
 const source=await readFile(new URL('./retention-native-fixture.mjs',import.meta.url),'utf8');
 const match=source.match(/const observedComplete=event=>\{[^\n]+\};/g);
 assert.equal(match?.length,1);
 const nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener;
 // Execute the actual extra-case observer with only its platform event type
 // adapted. Node AbortController generates a real trusted Event; Node's
 // MessageChannel messages do not have isTrusted:true on this Node version.
 const observerSource=match[0].replace("'complete'","'abort'");
 const controller=new AbortController(),transaction=controller.signal;
 const createObserver=new Function('transaction','nativeRemove',`let trustedCompletes=0;${observerSource};return {observer:observedComplete,count:()=>trustedCompletes};`);
 let removals=0;
 const removeObserved=function(type,listener){assert.equal(this,transaction);assert.equal(type,'abort');removals++;nativeRemove.call(this,type,listener);};
 const oldController=new AbortController();let oldInvocations=0,oldTrusted=0,oldActualTrusted=0;
 nativeAdd.call(oldController.signal,'abort',event=>{oldInvocations++;if(event.isTrusted)oldTrusted++;},{once:true});
 nativeAdd.call(oldController.signal,'abort',event=>{if(event.isTrusted)oldActualTrusted++;});
 oldController.signal.dispatchEvent(new Event('abort'));oldController.abort();
 assert.equal(oldInvocations,1);assert.equal(oldTrusted,0);assert.equal(oldActualTrusted,1);
 // Keep the actual observer first on its own signal: Node resets currentTarget
 // between listeners, unlike DOM dispatch. No event fields are overridden.
 const fixed=createObserver(transaction,removeObserved);let actualTrusted=0;
 nativeAdd.call(transaction,'abort',fixed.observer);
 nativeAdd.call(transaction,'abort',event=>{if(event.isTrusted)actualTrusted++;});
 const synthetic=new Event('abort');assert.equal(synthetic.isTrusted,false);transaction.dispatchEvent(synthetic);
 assert.equal(oldInvocations,1);assert.equal(oldTrusted,0);assert.equal(fixed.count(),0);assert.equal(removals,0);
 controller.abort();
 assert.equal(actualTrusted,1);assert.equal(fixed.count(),1);assert.equal(removals,1);
 transaction.dispatchEvent(new Event('abort'));assert.equal(fixed.count(),1);assert.equal(removals,1);
});
