// Source-only worker lifecycle. No message can request automatic restoration or
// manufacture a clean checkpoint. Chrome may abandon async onSuspend work;
// the original owner therefore treats incomplete checkpoints as dirty/unknown.
export function installContextConnectionLifecycle(owner,api,ready=Promise.resolve()){
 let closed=false,starting=null;
 const start=()=>{if(closed)return Promise.resolve({resumed:0});if(starting)return starting;const task=Promise.resolve(ready).then(()=>closed?{resumed:0}:owner.resumeAuthorized()).catch(()=>({resumed:0}));starting=task;void task.finally(()=>{if(starting===task)starting=null;});return task;};
 const suspend=()=>{if(!closed)void owner.checkpointForSuspend().catch(()=>{});};
 const cancelled=()=>{if(!closed)void owner.resumeAfterSuspend().catch(()=>{});};
 api.runtime?.onStartup?.addListener(start);api.runtime?.onSuspend?.addListener(suspend);api.runtime?.onSuspendCanceled?.addListener(cancelled);void start();
 return Object.freeze({dispose(){if(closed)return;closed=true;api.runtime?.onStartup?.removeListener(start);api.runtime?.onSuspend?.removeListener(suspend);api.runtime?.onSuspendCanceled?.removeListener(cancelled);owner.dispose();}});
}
