import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../ui/personal-topic-root.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../ui/personal-topic-root.js',import.meta.url),'utf8');
const rule=selector=>css.slice(css.indexOf(selector+'{')+selector.length+1,css.indexOf('}',css.indexOf(selector+'{')));
// Static source contracts only. Native wrapping/height/pixels are separately
// inspected by the newly authorized bounded synthetic visual batch.
test('adopted content-sized Topic titles no longer clip after two lines',()=>{
 const title=rule('.personal-topic-link');assert.match(title,/display:block/);assert.match(title,/overflow:visible/);assert.doesNotMatch(title,/line-clamp|box-orient|max-height|(?:^|;)height:/);
 assert.match(rule('.personal-topic-link,.personal-section-link,.personal-topic-more'),/overflow-wrap:anywhere/);
});
test('Topic title and Section directory share the original left axis',()=>{
 const icon=rule('.personal-topic-symbol'),title=rule('.personal-topic-title'),sections=rule('.personal-topic-sections');
 const slot=Number(/flex:0 0 (\d+)px/.exec(icon)[1]),gap=Number(/gap:(\d+)px/.exec(title)[1]),inset=Number(/margin-left:(\d+)px/.exec(sections)[1]);
 assert.equal(slot,21);assert.match(icon,/width:21px;height:21px/);assert.equal(slot+gap,inset);
});
test('natural title sizing retains existing bounded stable-slot and resize owners',()=>{
 assert.match(source,/observeTitle\(node,active\)/);assert.match(source,/getBoundingClientRect\(\)\.height/);assert.match(source,/saveTopicRootSlots\(this\.slots\)/);assert.match(source,/more\.hidden=node\.dataset\.overviewComplete==='true'/);
 assert.match(css,/@media\(max-width:530px\)/);assert.match(css,/@media\(pointer:coarse\)/);assert.match(css,/min-height:44px/);
});
