// Historical workflow, opt-in only. Current release gate is real Chrome verification.
import test from 'node:test';
import {goldenBundle} from '../../scripts/compatibility-gate.mjs';
import {replay} from '../harness/compat-replay.mjs';
test('optional real Golden replay',{timeout:60000},async t=>{const b=await goldenBundle();if(!b){t.skip('REAL_GOLDEN_UNAVAILABLE');return;}await replay(b);});
