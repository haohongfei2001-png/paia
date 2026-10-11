import assert from 'node:assert/strict';
// Original worker message tests do not trigger native toolbar actions. Expose
// only Chrome's listener-registration surface; never fake a successful action,
// tab read/write, or installation. Existing test-specific tabs APIs stay intact.
export function toolbarRegistrationFixture(api){
 assert.equal(api.action,undefined);assert.equal(api.tabs?.onRemoved,undefined);
 api.tabs??={};
 const register=listener=>assert.equal(typeof listener,'function');
 api.tabs.onRemoved={addListener:register};
 api.action={onClicked:{addListener:register}};
}
