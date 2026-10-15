import {detailReferenceCSS} from './harness/context-detail-reference.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {whiteReferenceCSS,whiteReferenceIdentity} from './harness/context-white-reference.mjs';
test('Context white oracle is independently bound to approved original and retains state coverage',async()=>{
 assert.equal(whiteReferenceIdentity.sourceSHA256,'ae103313b9d48ee77631b043360a4a3a7c5ce3011d45ff698f652d84030b46ae');
 const adapter=await readFile(new URL('./harness/context-white-reference.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(adapter,/from ['"].*ui\/|getComputedStyle|readFile/);
 for(const value of ['gap:23px','border-radius:18px','font:550 21px/1.5','font:12px/1.8','width:41px;height:44px','#e0e6ee','#e8ecf1','#525e6d','#35414f'])assert.ok(whiteReferenceCSS.includes(value),value);
 const harness=await readFile(new URL('./harness/ctx4-final-reference-equivalence.mjs',import.meta.url),'utf8');
 assert.match(harness,/assert.equal\(scenes.length,20\)/);assert.match(harness,/assert.equal\(failures.length,0/);assert.match(harness,/original reference bytes/);assert.match(harness,/for\(const key of styleKeys\)/);assert.match(harness,/\['on','paused','disabled'\]/);
 assert.doesNotMatch(harness,/addStyleTag\(\{content:'.context-card\{min-height:0\}'/);
});

test('Context dark gates preserve selected and paused semantics separately from hover surface',async()=>{
 const css=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 assert.match(css,/html\[data-paia-theme="dark"\] \.context-page :is\(\.context-access,\.topic-access\)\{background:#263449;color:var\(--muted\)\}/);
 assert.match(css,/\[data-on="true"\]:not\(\[data-paused="true"\]\)\{background:var\(--selected\);color:var\(--selected-ink\)\}/);
 assert.match(whiteReferenceCSS,/\[data-on=true\]:not\(\[data-paused=true\]\)\{background:var\(--selected\);color:var\(--selected-ink\)\}/);
});

// Independent finite cascade evaluator for these declared responsive roles.
// Native CI still measures computed fonts, layout and touch targets in Chrome.
function responsiveValue(css,kind,property,width,{detail=false}={}){
 css=css.replace(/\/\*[\s\S]*?\*\//g,'');let winner=null,sequence=0;
 const visit=(text,active=true)=>{let offset=0;while(offset<text.length){const open=text.indexOf('{',offset);if(open<0)break;const selector=text.slice(offset,open).trim();let depth=1,end=open+1;for(;depth&&end<text.length;end++){if(text[end]==='{')depth++;else if(text[end]==='}')depth--;}const body=text.slice(open+1,end-1);offset=end;
  if(selector.startsWith('@media')){const max=/max-width:\s*(\d+)px/.exec(selector),min=/min-width:\s*(\d+)px/.exec(selector);visit(body,active&&(!max||width<=Number(max[1]))&&(!min||width>=Number(min[1]))&&!selector.includes('pointer:coarse'));continue;}
  if(selector.startsWith('@')||!active)continue;
  for(const part of selector.split(',')){if(!part.trim().endsWith(kind)||!detail&&part.includes('.context-detail')||part.includes('data-paia-theme'))continue;const specificity=(part.match(/\.[\w-]+|\[[^\]]+\]/g)||[]).length;for(const declaration of body.split(';')){const colon=declaration.indexOf(':');if(colon<0)continue;const key=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim();let candidate=key===property?value:null;if(property==='font-size'&&key==='font')candidate=/\b(\d+(?:\.\d+)?)px\//.exec(value)?.[1]+'px';if(candidate&&(!winner||specificity>winner.specificity||specificity===winner.specificity&&sequence>=winner.sequence))winner={value:candidate,specificity,sequence};sequence++;}}
 }};visit(css);return winner?.value;
}
test('approved Context responsive roles hold at every breakpoint and adjacent width',async()=>{
 const production=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 const expected=[
  [1440,34,21,41,44,12],[1251,34,21,41,44,12],[1250,32,19,35,38,11],
  [1001,32,19,35,38,11],[1000,30,18,35,38,11],[761,30,18,35,38,11],
  [760,29,20,35,38,12],[531,29,20,35,38,12],[530,28,18,33,36,12],[320,28,18,33,36,12]
 ];
 for(const [name,css]of [['production',production],['independent reference',whiteReferenceCSS]])for(const [width,title,card,symbolWidth,symbolHeight,description]of expected){
  for(const [selector,property,value]of [['.context-head h1','font-size',title],['.card-title','font-size',card],['.card-symbol','width',symbolWidth],['.card-symbol','height',symbolHeight],['.card-description','font-size',description]])assert.equal(responsiveValue(css,selector,property,width),value+'px',`${name} ${width}px ${selector} ${property}`);
 }
});

test('approved detail heading specificity retains 33px across the 1250 breakpoint',async()=>{
 const production=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 for(const css of [production,whiteReferenceCSS])for(const [width,size]of [[1440,33],[1251,33],[1250,33],[1001,33],[1000,30],[761,30],[760,28],[531,28],[530,27],[320,27]])assert.equal(responsiveValue(css,'.context-head h1','font-size',width,{detail:true}),size+'px','detail '+width);
});

// Latest-white structure resets the INNER .context-card .card-open to 0.
// The outer grid item never receives that reset; its minimum remains auto.
// Keep this distinction at both retired implementation breakpoints as well.
test('outer Context cards retain the approved automatic grid minimum at every width',async()=>{
 const production=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 for(const [name,css]of [['production',production],['independent reference',whiteReferenceCSS]]){
  for(const width of [1440,1250,1024,1023,1000,768,767,760,530,320]){
   assert.equal(responsiveValue(css,'.context-card','min-height',width)??'auto','auto',`${name} outer card ${width}px`);
  }
 }
 const harness=await readFile(new URL('./harness/ctx4-final-reference-equivalence.mjs',import.meta.url),'utf8');
 assert.match(harness,/const styleKeys=\[[^\n]*'minHeight'/);
 assert.match(harness,/\['x','y','width','height'\]/);
});


test('approved detail grid uses the original left-label columns and mobile stack',async()=>{
 const production=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 for(const css of [production,detailReferenceCSS])for(const [width,column,gap]of [[1440,125,30],[1251,125,30],[1250,104,22],[1001,104,22],[1000,85,20],[761,85,20]]){
  assert.equal(responsiveValue(css,'.context-section','grid-template-columns',width,{detail:true}),column+'px minmax(0,1fr)');assert.equal(responsiveValue(css,'.context-section','gap',width,{detail:true}),gap+'px');
 }
 for(const css of [production,detailReferenceCSS])for(const width of [760,531,530,320])assert.equal(responsiveValue(css,'.context-section','display',width,{detail:true}),'block');
 const adapter=await readFile(new URL('./harness/context-detail-reference.mjs',import.meta.url),'utf8');assert.doesNotMatch(adapter,/from ['"].*ui\/|getComputedStyle|readFile/);
 const harness=await readFile(new URL('./harness/ctx4-final-reference-equivalence.mjs',import.meta.url),'utf8');for(const key of ['detailFooter','detailToolbar','groupItems','itemFooter','topicRow','topicRead','inputsToolbar','detailCaption'])assert.ok(harness.includes(key));
});

test('native reading gate checks independent expected counts including genuine empty scenes',async()=>{
 const {assertContextReadingPreferences}=await import('./harness/context-reading-preferences.mjs');
 const items=[{section:'one'},{section:'one'}];
 const page=({width='680px',font='17px',bodies=2,groups=1,emptyVisible=false}={})=>({locator(selector){
  if(selector==='.detail-content>.empty-detail')return {count:async()=>1,isVisible:async()=>emptyVisible};
  assert.ok(['.context-group-items','.context-item .item-text'].includes(selector),'gate measures reading owners');
  return {evaluateAll(fn){return fn(Array.from({length:selector==='.context-group-items'?groups:bodies},()=>({style:{maxWidth:width,fontSize:font}})));}};
 }});
 const prior=globalThis.getComputedStyle;globalThis.getComputedStyle=node=>node.style;
 try{
  await assertContextReadingPreferences(page(),items);
  await assertContextReadingPreferences(page({bodies:0,groups:0,emptyVisible:true}),[]);
  await assert.rejects(()=>assertContextReadingPreferences(page({width:'none'}),items),/680px/);
  await assert.rejects(()=>assertContextReadingPreferences(page({font:'16px'}),items),/17px/);
  await assert.rejects(()=>assertContextReadingPreferences(page({bodies:1}),items),/reading text count/);
  await assert.rejects(()=>assertContextReadingPreferences(page({groups:0}),items),/reading column count/);
  await assert.rejects(()=>assertContextReadingPreferences(page({bodies:0,groups:0}),[]),/empty owner/);
  await assert.rejects(()=>assertContextReadingPreferences(page(),[]),/reading column count/);
 }finally{if(prior===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=prior;}
});


test('detail group labels use final original palette and paused switches require selection',async()=>{
 const css=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 for(const text of [css,detailReferenceCSS]){
  assert.match(text,/\.context-page\.context-detail \.detail-content \.context-section>h2\{color:#525e6d\}/);
  assert.match(text,/html\[data-paia-theme=.?dark.?\] \.context-page\.context-detail \.detail-content \.context-section>h2\{color:#a9b6c7\}/);
 }
 assert.match(detailReferenceCSS,/\.topic-access\[data-on=true\]\[data-paused=true\] \.context-switch\{background:#aebed7\}/);
});


test('reference cleanup explicitly closes failed synthetic pages before transport and reports errors',async()=>{
 const {closeContextReferencePages}=await import('./harness/context-reference-cleanup.mjs');const calls=[];
 const page=owner=>({close:async options=>{assert.deepEqual(options,{runBeforeUnload:false});calls.push(owner);}});
 await closeContextReferencePages({prototype:page('prototype'),harness:{archive:page('archive'),close:async()=>calls.push('harness')}});
 assert.deepEqual(calls,['prototype','archive','harness']);
 const error=new Error('synthetic close failed');await assert.rejects(()=>closeContextReferencePages({harness:{archive:{close:async()=>{throw error;}}}}),value=>value===error);
 const source=await readFile(new URL('./harness/ctx4-final-reference-equivalence.mjs',import.meta.url),'utf8');assert.match(source,/catch\(error\)\{primaryError=error;throw error;/);assert.match(source,/finalizeContextReference/);
});


test('reference cleanup attempts every owner after recording and page failures',async()=>{
 const {closeContextReferencePages}=await import('./harness/context-reference-cleanup.mjs');const calls=[];const first=new Error('record failed');
 await assert.rejects(()=>closeContextReferencePages({record:async owner=>{calls.push('record:'+owner);throw first;},prototype:{close:async()=>{calls.push('prototype');throw new Error('page failed');}},harness:{archive:{close:async()=>{calls.push('archive');throw new Error('archive failed');}},close:async()=>{calls.push('harness');throw new Error('transport failed');}}}),error=>error===first);
 assert.deepEqual(calls,['record:prototype','prototype','record:archive','archive','record:harness','harness','record:complete']);
});

test('reference finalization retains primary failure despite all evidence and disposal failures',async()=>{
 const {finalizeContextReference}=await import('./harness/context-reference-cleanup.mjs');
 for(const primaryError of [new Error('original acceptance failure'),undefined]){
  const calls=[];const first=new Error('execution write failed');
  const fail=(name,error)=>async()=>{calls.push(name);throw error;};
  await assert.rejects(()=>finalizeContextReference({primaryError,writeExecution:fail('execution',first),closePages:fail('close',new Error('close failed')),removeRelease:fail('release',new Error('rm failed')),reportError:fail('report',new Error('error write failed'))}),error=>error===(primaryError||first));
  assert.deepEqual(calls,['execution','close','release','report']);
 }
});
