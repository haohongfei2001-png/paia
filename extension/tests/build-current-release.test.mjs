import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('release cache recovery preserves unowned files and refuses failed or changing candidates',()=>{
 execFileSync('python3',[fileURLToPath(new URL('./harness/build-current-release-tests.py',import.meta.url))],{stdio:'pipe'});
});
