import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../ui/archive.html',import.meta.url),'utf8');
const thoughts=readFileSync(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
test('Thought root has no AI start action while independent creation remains available',()=>{
 const root=html.slice(html.indexOf('<div id="thought-collection"'),html.indexOf('<section id="settings-panel"'));
 assert.doesNotMatch(root,/id="bounded-|id="start-thought-library"|deepseek-api-key/);
 assert.match(thoughts,/actions\.compose/);
});
test('Context execution and its former build/share controls are absent from the consumer page',()=>{
 assert.doesNotMatch(html,/id="memory-(?:home|manage|allowed|denied|prepare|share)"/);
 assert.match(html,/id="memory-clear-session"/,'revocation remains reachable');
});
test('Settings has no old organizer, batch or credential controls and exposes unavailable AI service',()=>{
 for(const id of ['start-thought-library','original-library-menu','organizer-batch-actions','bounded-original-start','bounded-ai-start','deepseek-settings'])assert.equal(html.includes('id="'+id+'"'),false,id);
 assert.match(html,/id="settings-ai-context"/);assert.match(html,/尚未开放/);
 assert.doesNotMatch(thoughts,/start-thought-library'\)\.addEventListener/,'no binding to removed DOM');
});
test('Cleanup retains one runtime entry script without hidden legacy start nodes',()=>{
 assert.deepEqual([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gu)].map(m=>m[1]),['archive.js']);
 assert.equal((html.match(/id="settings-ai-context"/g)||[]).length,1);
 assert.doesNotMatch(html,/id="start-thought-library"/);
});
