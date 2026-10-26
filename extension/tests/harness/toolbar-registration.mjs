import assert from 'node:assert/strict';
// Original worker message tests do not trigger native toolbar actions. Expose
// only Chrome's listener-registration surface; never fake a successful action,
// tab read/write, or installation. Existing test-specific tabs APIs stay intact.
export function toolbarRegistrationFixture(api){
 assert.equal(api.action,undefined);assert.equal(api.tabs?.onRemoved,undefined);
 api.tabs??={};
 // Receipt-owner construction captures these original browser methods. This
 // fixture never supplies successful tab/transport proof to unrelated tests.
 api.tabs.get??=async()=>{throw Error('Unexpected synthetic tab read');};
 api.tabs.sendMessage??=async()=>{throw Error('Unexpected synthetic tab transport');};
 const register=listener=>assert.equal(typeof listener,'function');
 api.tabs.onRemoved={addListener:register};
 api.action={onClicked:{addListener:register}};
}
