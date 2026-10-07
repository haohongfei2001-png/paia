import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRenderedTypography} from './harness/rendered-typography-sample.mjs';
const geometry={text:'合成字形',family:'Noto Sans CJK SC',size:'17px',weight:'400',lineHeight:'30.6px',box:{width:68},textRects:[{width:68}]};
function fixture({ids=[7,7],fontError=null,queryError=null,fonts=[{familyName:'Noto Sans CJK SC',glyphCount:4}]}={}){
 const calls=[],queue=[...ids],page={locator:selector=>({first:()=>({evaluate:async()=>{calls.push(['geometry',selector]);return geometry;}})})};
 const client={send:async(method,args)=>{calls.push([method,args]);if(method==='DOM.getDocument')return {root:{nodeId:1}};if(method==='DOM.querySelector'){if(queryError)throw queryError;return {nodeId:queue.length>1?queue.shift():queue[0]};}if(method==='CSS.getPlatformFontsForNode'){if(fontError)throw fontError;return {fonts};}throw Error('unexpected CDP command');}};
 return {page,client,calls};
}
test('typography sample retains actual glyph fonts and geometry only for the same current node',async()=>{
 const f=fixture();assert.deepEqual(await sampleRenderedTypography(f.page,f.client,'.target'),{selector:'.target',...geometry,fonts:[{familyName:'Noto Sans CJK SC',glyphCount:4}]});assert.equal(f.calls.filter(x=>x[0]==='DOM.querySelector').length,2);
});
test('missing or remounted typography nodes never produce an accepted sample',async()=>{
 for(const ids of [[0],[7,8],[7,0]]){const f=fixture({ids});assert.equal(await sampleRenderedTypography(f.page,f.client,'.target'),null);if(!ids[0])assert.equal(f.calls.some(x=>x[0]==='CSS.getPlatformFontsForNode'),false);}
});
test('glyph-read stale-node error is recoverable only by a fresh whole sample',async()=>{
 const stale=fixture({fontError:Error('cdpSession.send: Protocol error (CSS.getPlatformFontsForNode): Could not find node with given id')});assert.equal(await sampleRenderedTypography(stale.page,stale.client,'.target'),null);assert.equal(stale.calls.some(x=>x[0]==='geometry'),false);
 const fresh=fixture({ids:[9,9]});assert.equal((await sampleRenderedTypography(fresh.page,fresh.client,'.target')).text,geometry.text);assert.equal(fresh.calls.find(x=>x[0]==='CSS.getPlatformFontsForNode')[1].nodeId,9);
});
test('stale DOM roots refuse the attempt while unrelated protocol errors remain failures',async()=>{
 const stale=fixture({queryError:Error('cdpSession.send: Protocol error (DOM.querySelector): Could not find node with given id')});assert.equal(await sampleRenderedTypography(stale.page,stale.client,'.target'),null);
 for(const message of ['Protocol error (CSS.getPlatformFontsForNode): CSS agent disabled','Target closed','Could not find node with given id']){const error=Error(message),f=fixture({fontError:error});await assert.rejects(()=>sampleRenderedTypography(f.page,f.client,'.target'),e=>e===error);}
});
test('zero-glyph data is preserved for the existing strict glyph assertion, never manufactured',async()=>{
 const f=fixture({fonts:[]});assert.deepEqual((await sampleRenderedTypography(f.page,f.client,'.target')).fonts,[]);
});
