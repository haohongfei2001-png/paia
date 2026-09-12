// A bounded visual transition, never a model request or a progress simulation.
let running=null;
export const MEMORY_RECOMPOSITION_MS=720;
export async function recomposeMemory(host,update){
 if(running){running.skipTransition();await running.finished.catch(()=>{});}
 if(!host||typeof document.startViewTransition!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches)return update();
 const previousName=host.style.viewTransitionName;host.style.viewTransitionName='paia-memory';document.documentElement.classList.add('paia-recomposing');
 const transition=document.startViewTransition(update);running=transition;const controller=new AbortController();
 // ready rejects when an intentional interruption skips the visual snapshot.
 // Handle that presentation-only cancellation; updateCallbackDone still
 // propagates an actual content-update failure to the caller.
 transition.ready.catch(()=>{});
 for(const event of ['pointerdown','wheel','touchstart','beforeinput'])host.addEventListener(event,()=>transition.skipTransition(),{signal:controller.signal,passive:true});
 transition.finished.catch(()=>{}).finally(()=>{controller.abort();if(running===transition){running=null;host.style.viewTransitionName=previousName;document.documentElement.classList.remove('paia-recomposing');}});
 return transition.updateCallbackDone;
}
export function stopMemoryRecomposition(){running?.skipTransition();}
