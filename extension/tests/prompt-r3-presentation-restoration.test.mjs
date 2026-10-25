import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Source-contract checks only. These do not claim browser cascade, hit testing,
// native pixels, source/release parity or human visual acceptance.
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const reference='../docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18/';
const [css,adopted,html,ui,host,layoutSource,tokens]=await Promise.all([
 read('../ui/prompt-surface.css'),read(reference+'component.css'),
 read('../ui/prompt-surface.html'),read('../ui/prompt-surface.js'),
 read('../content/prompt-surface.js'),read('../core/prompt-surface-layout.js'),
 read(reference+'tokens.json').then(JSON.parse)
]);

// Inspect authored rules, retaining media scope instead of flattening forced
// colors/coarse-pointer overrides into normal-state declarations.
function rules(source,scope=[]){
 source=source.replace(/\/\*[\s\S]*?\*\//g,'');const result=[];
 for(let start=0;start<source.length;){
  const open=source.indexOf('{',start);if(open<0)break;
  let end=open+1,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
  assert.equal(depth,0,'balanced authored CSS');
  const selector=source.slice(start,open).trim(),body=source.slice(open+1,end-1);start=end;
  if(selector.startsWith('@')){result.push(...rules(body,[...scope,selector]));continue;}
  const declarations=Object.fromEntries(body.split(';').filter(v=>v.trim()).map(v=>{const colon=v.indexOf(':');return [v.slice(0,colon).trim(),v.slice(colon+1).trim()];}));
  result.push({selector,scope,declarations});
 }
 return result;
}
function rule(source,selector,scope=[]){
 return rules(source).filter(r=>r.selector===selector&&JSON.stringify(r.scope)===JSON.stringify(scope)).reduce((value,r)=>({...value,...r.declarations}),{});
}
function assertInserted(source){
 const shared=rule(source,'.row[data-inserted=true]:after,#capsule-use[data-inserted=true]:after');
 const row={...rule(source,'.row:after'),...shared,...rule(source,'.row[data-inserted=true]:after')};
 assert.equal(row.left,'auto','success mark must not inherit separator left edge');
 assert.equal(row.bottom,'auto','success mark must not inherit separator bottom edge');
 assert.equal(row.width,'auto');assert.equal(row.height,'auto');assert.equal(row.background,'none');
 const selected=rule(adopted,'.paia .ps-row.ps-inserted::after');
 for(const key of ['content','position','right','top','transform','font-size','color'])assert.equal(row[key],selected[key],`adopted success mark ${key}`);
 assert.equal(rule(source,'.row:after')['pointer-events'],'none','feedback does not become another action');
}

test('inserted row feedback is a right-edge R3 mark, not the stretched separator',()=>assertInserted(css));
test('omitting either inherited inset reset is rejected',()=>{
 for(const property of ['left','bottom']){
  const mutated=css.replace(/(\.row\[data-inserted=true\]:after,#capsule-use\[data-inserted=true\]:after\{)([^}]+)(\})/,(_,open,body,close)=>open+body.replace(`${property}:auto;`,'')+close);
  assert.notEqual(mutated,css,'negative control changes only the feedback rule');
  assert.throws(()=>assertInserted(mutated),/success mark must not inherit/);
 }
});
test('pending disabled buttons retain the adopted restrained visual feedback',()=>{
 assert.equal(rule(css,'button:disabled').opacity,rule(adopted,'.paia button:disabled').opacity);
 assert.equal(rule(css,'button:disabled').cursor,'default');
});
test('bottom title and search use the adopted small-type and overflow roles',()=>{
 const title=rule(css,'header span'),selectedTitle=rule(adopted,'.paia .ps-title');
 for(const key of ['min-width','white-space','overflow','text-overflow'])assert.equal(title[key],selectedTitle[key],key);
 const query=rule(css,'header #search-query'),selectedQuery=rule(adopted,'.paia .ps-query');
 assert.equal(query.height,selectedQuery.height);assert.equal(query['min-height'],selectedQuery.height);
 assert.equal(query.padding,selectedQuery.padding);assert.equal(query['font-size'],'13px');
 assert.equal(rule(css,'#search-query::placeholder').color,rule(adopted,'.paia .ps-query::placeholder').color);
 const coarse=rule(css,'header #search-query',['@media(pointer:coarse)']);
 assert.equal(coarse['min-height'],'44px','retain the original coarse-pointer minimum');
 assert.equal(coarse.height,'44px');
 assert.ok(html.indexOf('<header>')>html.indexOf('id="status"'),'same toolbar remains last in DOM order');
 assert.equal((html.match(/<header>/g)||[]).length,1,'no second toolbar');
});
test('empty results keep their existing content with adopted quiet typography',()=>{
 const empty=rule(css,'.empty'),selected=rule(adopted,'.paia .ps-empty');
 for(const key of ['padding','color','line-height','text-align'])assert.equal(empty[key],selected[key],key);
 assert.equal(empty['font-size'],'13px');
});
test('forced colors keeps system-readable text rather than painting Highlight behind CanvasText',()=>{
 const forced=rule(css,':root,:root[data-paia-theme],:root:not([data-paia-theme])',['@media(forced-colors:active)']);
 const selected=rule(adopted,'.paia',['@media (forced-colors:active)']);
 assert.equal(forced['--hover'],selected['--hover']);assert.equal(forced['--active'],'Canvas');
 assert.equal(forced['--focus'],'Highlight');assert.equal(forced['--panel'],'Canvas');
 assert.equal(forced['--muted'],'CanvasText');
});
test('actual geometry keeps the selected three states and fixed control through space recovery',()=>{
 const context=vm.createContext({});vm.runInContext(layoutSource,context);
 const layout=(...args)=>JSON.parse(JSON.stringify(context.PAIAPromptLayout(...args)));
 const form={top:760,right:1000},states=[layout(1200,900,form,null,false),layout(1200,900,form,null,false,{form:'capsule'}),layout(1200,900,form,null,true)];
 for(const state of states){
  assert.equal(state.orb.w,tokens.anchor.width);assert.equal(state.orb.h,tokens.anchor.height);
  assert.equal(state.capsule.w,tokens.capsule.width);assert.equal(state.capsule.h,tokens.anchor.height);
  assert.equal(state.card.w,tokens.board.width);assert.equal(state.card.h,tokens.board.height);
  assert.equal(state.card.x+state.card.w,state.orb.x+state.orb.w);assert.equal(state.card.y+state.card.h,state.orb.y+state.orb.h);
  assert.equal(form.top-(state.orb.y+state.orb.h),tokens.anchor.composer_gap);
  assert.deepEqual(state.orb,states[0].orb);assert.deepEqual(state.mark.front,states[0].mark.front);
 }
 assert.deepEqual(states.map(s=>[s.mark.rear.dx,s.mark.rear.dy]),[[-2.5,0],[-5,0],[-5.25,-1.5]]);
 const short=layout(1200,900,{...form,top:250},null,true,{topControlsBottom:40});
 assert.ok(short.card.h<tokens.board.height);assert.equal(short.orb.w,48);assert.equal(short.card.y,short.safeTop);
 const entry=layout(1200,900,{...form,top:150},null,true,{topControlsBottom:40});
 assert.equal(entry.card,null);assert.equal(entry.orb.w,48);
 assert.deepEqual(layout(1200,900,form,null,true),states[2]);
});
test('all six adopted card assets remain byte-identical; runtime adds no hover-title controls',async()=>{
 for(const state of ['collapsed','capsule','board'])for(const theme of ['light','dark']){
  const name=`cards-${state}-${theme}.svg`;
  assert.equal(await read('../ui/assets/prompt-r3/'+name),await read(reference+'assets/'+name),name);
 }
 for(const source of [html,ui,host]){
  assert.doesNotMatch(source,/\btitle\s*=\s*["']/,'native hint attribute');
  assert.doesNotMatch(source,/setAttribute\(\s*["']title["']/,'dynamic native hint attribute');
  assert.doesNotMatch(source,/role\s*=\s*["']tooltip["']/,'custom tooltip');
 }
 assert.doesNotMatch(css,/(?:^|[\s.#])tooltip(?:[\s.#:[{]|$)/,'no tooltip selector');
 assert.match(html,/aria-live="polite"/,'genuine status semantics remain');
 assert.equal(rule(css,'#status:not(:empty)').position,'relative','persistent failures stay in flow');
});
