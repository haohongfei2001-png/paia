import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Narrow source-contract/flow-accounting coverage, not rendered geometry,
// native Save/Cancel/Copy hit testing or visual acceptance.
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const reference='../docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18/';
const [css,component,fusion,ui,html]=await Promise.all([
 read('../ui/prompt-surface.css'),read(reference+'component.css'),
 read(reference+'fusion.css'),read('../ui/prompt-surface.js'),read('../ui/prompt-surface.html')
]);
function rule(source,selector){
 return [...source.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(match=>match[1].trim()===selector)
  .reduce((result,match)=>({...result,...Object.fromEntries(match[2].split(';').filter(value=>value.trim()).map(value=>{const colon=value.indexOf(':');return [value.slice(0,colon).trim(),value.slice(colon+1).trim()];}))}),{});
}
function notice(source){return {...rule(source,'#status'),...rule(source,'#status:not(:empty)')};}
function assertPlainNotice(source){
 const actual=notice(source),adopted={...rule(component,'.paia .ps-notice'),...rule(fusion,'.paia[data-geometry=r3] .ps-notice')};
 for(const key of ['padding','margin','line-height','color','max-height','overflow'])assert.equal(actual[key],adopted[key],`R3 notice ${key}`);
 assert.equal(actual.position,'relative','persistent notice remains in content flow');
 assert.equal(actual.flex,'none','persistent notice is not squeezed into an overlay');
 assert.equal(actual.background,'transparent');assert.equal(actual['border-radius'],'0');assert.equal(actual['box-shadow'],'none');
 for(const edge of ['left','right','top','bottom'])assert.ok(actual[edge]===undefined||actual[edge]==='auto','no overlay edge '+edge);
}
test('persistent failures use the exact adopted plain notice spacing, material and maximum',()=>assertPlainNotice(css));
test('notice typography maps the adopted 12px role to the existing scalable root font',()=>{
 const root=rule(css,':root').font,base=Number(root.match(/\b(\d+(?:\.\d+)?)px\//)?.[1]);
 const normal=Number(rule(component,'.paia .ps-notice')['font-size'].match(/calc\((\d+)px \*/)?.[1]);
 const rem=notice(css)['font-size'].match(/^calc\((\d+)rem \/ (\d+)\)$/);
 assert.ok(rem,'notice preserves root-relative text enlargement');
 for(const scale of [1,2])assert.equal(Number(rem[1])/Number(rem[2])*base*scale,normal*scale);
});
test('the original flow owner counts the bounded notice and excludes quiet/empty feedback',()=>{
 const start=ui.indexOf('function flowHeight('),end=ui.indexOf('\nfunction measureLayout()',start);
 assert.ok(start>=0&&end>start);const context=vm.createContext({getComputedStyle:node=>node.css});
 vm.runInContext(ui.slice(start,end)+'\nglobalThis.measureStatusFlow=flowHeight;',context);
 const actual=notice(css),maximum=parseFloat(actual['max-height']),margins=actual.margin.split(/\s+/).map(parseFloat),top=margins[0],bottom=margins[2]??top;
 const node={css:{display:'block',position:actual.position,marginTop:String(top),marginBottom:String(bottom)},getBoundingClientRect:()=>({height:maximum})};
 assert.equal(context.measureStatusFlow(node),maximum+top+bottom,'actual status flow includes all declared block margins');
 assert.ok(context.measureStatusFlow(node)<=72,'bounded R3 maximum allocation');
 node.css.position=rule(css,'#status[data-quiet=true]').position;assert.equal(context.measureStatusFlow(node),0);
 node.css.position=actual.position;node.css.display=rule(css,'#status:empty').display;assert.equal(context.measureStatusFlow(node),0);
 assert.match(ui,/flowHeight\(header\)\+flowHeight\(status\)/,'original host minimum uses the actual status flow');
});
test('real failures, quiet success and the original interactive Copy action stay distinct',()=>{
 assert.match(html,/<p id="status" role="status" aria-live="polite"><\/p>/);
 assert.ok(html.indexOf('id="status"')<html.indexOf('<header>'),'notice remains before the bottom tools');
 const quiet=rule(css,'#status[data-quiet=true]');
 assert.equal(quiet.position,'absolute');assert.equal(quiet['clip-path'],'inset(50%)');assert.equal(quiet.overflow,'hidden');
 assert.equal(rule(css,'#status:empty').display,'none');
 assert.equal(rule(css,'#status button').display,'inline');
 assert.doesNotMatch(css,/#status[^{}]*\{[^}]*pointer-events\s*:\s*none/);
 assert.match(ui,/status\.append\(copy\)/,'original failure Copy action remains owned by status');
 assert.match(ui,/status\.dataset\.quiet=String\(temporary\)/,'existing temporary/persistent distinction remains');
});
test('the old mini-card and absolute-overlay regressions are explicitly rejected',()=>{
 assertPlainNotice(css);
 for(const [before,after]of [['position:relative','position:absolute'],['background:transparent','background:var(--panel)'],['max-height:72px','max-height:66px']]){
  const changed=css.replace(/(#status:not\(:empty\)\{)([^}]+)(\})/,(_,open,body,close)=>open+body.replace(before,after)+close);
  assert.notEqual(changed,css);assert.throws(()=>assertPlainNotice(changed));
 }
});
