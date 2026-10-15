// Browser-evaluable functions: no lexical dependencies or synthetic preview data.
export function qualifyRootViewport(){
 const owner=globalThis.__rootReadOwner;
 if(owner?.personalRoot?.previews)void owner.personalRoot.previews.refresh();
 else globalThis.dispatchEvent(new Event('scroll'));
}
export function rootViewportSettled(){
 const owner=globalThis.__rootReadOwner,list=document.getElementById('thought-list');
 const state=list?.dataset.previewState;
 return (!owner||!!owner.homeCollection&&!!owner.homePage)&&!owner?.refreshRun&&!!state&&state!=='loading'&&!owner?.readFailed&&!owner?.homeCollection?.loading&&!owner?.homeCollection?.hydration&&!owner?.personalRoot?.previews?.awaitingMetadata&&document.getElementById('thought-collection')?.getAttribute('aria-busy')!=='true'&&document.getElementById('library-read-retry')?.hidden!==false;
}
