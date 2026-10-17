import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Finite cascade probe for the real search input inside .context-page and
// .context-search. Include the shared non-checkbox/radio input rule: checking
// Context CSS alone previously missed its higher specificity. Native CI still
// measures actual input/button boxes, placement, and the full 20-state oracle.
const matches=new Map([
 ['input:not([type=checkbox]):not([type=radio])',[0,2,1]],
 ['.context-search input',[0,1,1]],
 ['.context-search :is(input,button)',[0,1,1]],
 ['.context-page .context-search input[type=search]',[0,3,1]],
]);
function minimum(css,width,coarse){
 let winner={specificity:[0,0,0],order:-1,value:'auto'},order=0;
 const walk=(source,active=true)=>{let pos=0;while(pos<source.length){const open=source.indexOf('{',pos);if(open<0)break;const selector=source.slice(pos,open).trim();let end=open+1,depth=1;while(end<source.length&&depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}const body=source.slice(open+1,end-1);pos=end;
  if(selector.startsWith('@media')){const applicable=selector.slice(6).split(',').some(query=>{const max=/max-width:\s*(\d+)px/.exec(query),min=/min-width:\s*(\d+)px/.exec(query);return (!max||width<=+max[1])&&(!min||width>=+min[1])&&(!query.includes('pointer:coarse')||coarse);});walk(body,active&&applicable);continue;}
  if(!active||selector.startsWith('@'))continue;
  // Do not split the comma inside :is().
  for(const part of selector.split(/,(?![^()]*\))/)){const specificity=matches.get(part.trim());if(!specificity)continue;const value=/(?:^|;)\s*min-height\s*:\s*([^;]+)/.exec(body)?.[1];if(!value)continue;const comparison=specificity.map((n,i)=>n-winner.specificity[i]).find(n=>n!==0)||0;if(comparison>0||comparison===0&&order>winner.order)winner={specificity,order,value:value.trim()};order++;}
 }};walk(css.replace(/\/\*[\s\S]*?\*\//g,''));return winner.value;
}
test('actual Context search input beats shared input minimum on narrow or coarse screens',async()=>{
 const context=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8'),shared=await readFile(new URL('../ui/archive.css',import.meta.url),'utf8');
 assert.match(shared,/input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),select\{min-height:36px/);
 // Either sheet order must preserve the owner-specific touch minimum.
 for(const css of [shared+'\n'+context,context+'\n'+shared]){
  for(const width of [320,390,530,760,767])assert.equal(minimum(css,width,false),'44px','narrow '+width);
  for(const width of [768,1024,1440]){assert.equal(minimum(css,width,true),'44px','coarse '+width);assert.equal(minimum(css,width,false),'36px','fine desktop '+width);}
 }
 const home=await readFile(new URL('../ui/context-home-search.js',import.meta.url),'utf8'),detail=await readFile(new URL('../ui/context-cards.js',import.meta.url),'utf8');
 assert.match(home,/this\.field\.type='search'/);assert.doesNotMatch(detail,/this\.searchField\.type='search'/);
});
