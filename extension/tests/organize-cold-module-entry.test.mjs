import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
// Fresh processes expose cycles hidden by the ordinary worker import order.
// Helpers must not initialize the Store inheritance chain merely on import.
for(const entry of ['core/indexed-store.js','core/ia-store.js','core/smart-filter-store.js','core/thought-store.js','core/organizer/store.js','core/browser-native-sync/context-journal.js','core/browser-native-sync/context-desired-journal.js','background/organize-processing-policy.js'])test('Organize static owner preserves cold entry '+entry,()=>{
 const root=new URL('../',import.meta.url).href;
 const code=`import assert from 'node:assert/strict';await import(${JSON.stringify(root+entry)});const load=p=>import(${JSON.stringify(root)}+p);const {OrganizerStore}=await load('core/organizer/store.js');const {originalOrganizerConstructor,requireOriginalOrganizeMaterialMethods}=await load('core/organizer/store-owner.js');assert.equal(OrganizerStore,originalOrganizerConstructor());assert.throws(()=>requireOriginalOrganizeMaterialMethods({}),{code:'UNAVAILABLE'});for(const [facade,owner,name,factory]of [['ia-store','ia-store-owner','IAStore','originalIAConstructor'],['smart-filter-store','smart-filter-store-owner','SmartFilterStore','originalFilterConstructor'],['thought-store','thought-store-owner','LibraryFoundationStore','originalFoundationConstructor'],['browser-native-sync/context-desired-journal','browser-native-sync/context-desired-journal-owner','ContextDesiredSyncJournal','originalContextDesiredConstructor']])assert.equal((await load('core/'+facade+'.js'))[name],(await load('core/'+owner+'.js'))[factory]());`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8'});assert.equal(result.signal,null);assert.equal(result.status,0,result.stderr||result.stdout);assert.equal(result.stderr,'');
});
