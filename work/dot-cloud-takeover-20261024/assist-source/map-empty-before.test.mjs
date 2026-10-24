import test from 'node:test';
import assert from 'node:assert/strict';
import {assistServiceFixture} from '../../worktree-assist/services/ai-gateway/tests/assist-client-fixture.mjs';
test('original Assist invalidation does not establish source task settlement from empty maps',async t=>{
 const f=await assistServiceFixture(t),source=f.commands.session.foundation.serverRequest.bind(f.commands.session.foundation);let enter,release,settled=false;const entered=new Promise(r=>enter=r),pending=new Promise(r=>release=r);f.commands.session.foundation.serverRequest=async(...args)=>{enter();await pending;return source(...args);};const running=f.run().then(()=>{settled=true;},()=>{settled=true;});try{await entered;f.commands.removeTab(1);assert.equal(f.commands.activations.size,0);assert.equal(f.commands.views.size,0);assert.equal(settled,true,'empty original maps are not an acknowledged drain of the still-pending original registration continuation');}finally{release();await running;f.commands.dispose();}
});
