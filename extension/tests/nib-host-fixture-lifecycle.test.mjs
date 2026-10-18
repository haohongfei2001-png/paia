import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const layout=await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8');
test('a reloaded unarranged synthetic host has no safe entry space; the same bottom composer fixture restores it',()=>{
 const world={};vm.runInNewContext(layout,world);
 const unarranged={left:8,right:1016,top:8,bottom:96};
 assert.equal(world.PAIAPromptLayout(1024,900,unarranged,null,false),null,'never force entry onto a top-of-page composer');
 const arranged={left:16,right:1008,top:796,bottom:884},measurement={topControlsBottom:60};
 const closed=world.PAIAPromptLayout(1024,900,arranged,null,false,measurement),opened=world.PAIAPromptLayout(1024,900,arranged,null,true,measurement);
 assert.equal(closed.orb.y+closed.orb.h,arranged.top-12);assert.equal(opened.card.h,312);assert.equal(opened.card.y+opened.card.h,closed.orb.y);assert.deepEqual(opened.orb,closed.orb);
});
test('the original native new-document journey reinstalls only its synthetic host fixture before waiting for anchored entry',async()=>{
 const native=await readFile(new URL('./nib-v4-surface-chrome-e2e.test.mjs',import.meta.url),'utf8');
 assert.match(native,/await p\.reload\(\);[^\n]*await arrangeHost\(\);await orb\.waitFor\(\{state:'visible'\}\)/);
 assert.match(native,/assert\.equal\(current\(\),undefined\)/);
 assert.match(native,/items\.length,23/);
 assert.match(native,/assert\.equal\(await orb\.isHidden\(\),true,'unavailable composer space must keep entry hidden'\)/);
 assert.match(native,/shadowRoot\),null/);
});
