import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('UIS-04 removes obsolete presentation wiring rather than hiding it',async()=>{
  const names=await readdir(new URL('../ui/',import.meta.url));
  for(const name of names.filter(name=>/\.(js|css|html)$/.test(name))){
    const text=await read('ui/'+name);
    for(const token of ['universal-search-open','thought-recent','thought-organize-tools','syncSearchLauncher','tuneExistingTools','core-loop-browse-title','.core-loop-browse-header','.ux-search-label','.ux-search-shortcut','.ux-search-icon']){
      assert.equal(text.includes(token),false,`${name} retains obsolete ${token}`);
    }
  }
});
test('UIS-04 keeps real bootstrap owners and reusable search/read capabilities',async()=>{
  const search=await read('ui/universal-search.js');
  assert.match(search,/if\(document.getElementById\('universal-search-dialog'\)\)return/);
  assert.match(search,/paia:search-open/,'explicit material selection still owns an internal search entry');
  assert.match(search,/universal:true,paged:true/,'internal picker still reuses the bounded coordinator');
  assert.match(await read('ui/revisit.js'),/\$\('workspace-heading'\)\?\.after\(open\)/,'Revisit no longer depends on a removed control');
  assert.match(await read('core/universal-search.js'),/UniversalSearchService/);
  assert.match(await read('ui/thoughts-base.js'),/RECORD_TOPIC_READ/,'read metadata remains recorded');
});

test('UIS-04 keeps bounded organizer maintenance in the existing Settings AI group',async()=>{
  const shell=await read('ui/core-loop.js');
  assert.ok(shell.includes("['organizer-reading-actions','deepseek-settings','library-updates-drawer']"));
  assert.ok(shell.includes("move(id,'ai')"));
});
