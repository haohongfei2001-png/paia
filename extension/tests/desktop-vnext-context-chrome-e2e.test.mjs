import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {runCurrentContextMatrix} from './current-context-scope-helper.mjs';

// D4 compiler/review and D5 functional output journeys remain intact in
// historical-desktop-vnext-context-chrome-e2e.test.mjs, outside current UI acceptance.
for(const variant of ['source','release'])test(`Desktop current Context preview pages never select, authorize, compile, copy or export (${variant})`,{timeout:240000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{maxBuffer:16*1024*1024});
 await runCurrentContextMatrix({variant,label:'desktop-context',extensionPath:variant==='release'?'work/current-release':undefined});
});
