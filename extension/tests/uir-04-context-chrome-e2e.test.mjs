import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {runCurrentContextMatrix} from './current-context-scope-helper.mjs';

// The original functional journey is preserved byte-for-byte in
// historical-uir04-context-chrome-e2e.test.mjs. The owner withdrew that UI flow.
test('UIR-04 current ordinary Context route stays unavailable and preserves data across source/release wide, compact and dark pages',{timeout:300000},async()=>{
 await runCurrentContextMatrix({variant:'source',label:'uir04',steps:['task']});
 execFileSync('python3',['scripts/build_current_release.py'],{maxBuffer:16*1024*1024});
 await runCurrentContextMatrix({variant:'release',label:'uir04',extensionPath:'work/current-release',steps:['task']});
});
