import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [source,host,css,html,ui]=await Promise.all(['core/prompt-surface-layout.js','content/prompt-surface.js','ui/prompt-surface.css','ui/prompt-surface.html','ui/prompt-surface.js'].map(read));
const context={};vm.runInNewContext(source,context);const layout=context.PAIAPromptLayout;
test('R3 original layout owns the fixed anchor, exact shared envelopes and foreground in all states',()=>{
 const form={left:40,right:1240,top:800,bottom:884};let anchor;
 for(const open of [false,true])for(const collapsed of ['orb','capsule']){
  const g=layout(1280,900,form,null,open,{form:collapsed});anchor??=g.orb;assert.deepEqual(g.orb,anchor);
  for(const [box,w,h] of [[g.card,336,328],[g.capsule,272,48]]){assert.equal(box.w,w);assert.equal(box.h,h);assert.equal(box.x+w,anchor.x+48);assert.equal(box.y+h,anchor.y+48);}
  assert.deepEqual(JSON.parse(JSON.stringify(g.mark.front)),{x:14.75,y:17,w:21,h:14,r:3.25});assert.equal(g.mark.rear.dx,open?-5.25:collapsed==='capsule'?-5:-2.5);assert.equal(g.mark.rear.dy,open?-1.5:0);
 }
});
test('R3 body yields before fixed anchor and a recovered viewport restores its exact geometry',()=>{
 const form={left:40,right:1240,top:800,bottom:884},full=layout(1280,900,form,null,true);
 const short=layout(1280,900,{...form,top:140},null,true,{topControlsBottom:40,minimumHeight:110});assert.equal(short.card,null);assert.equal(short.orb.y+48,128);
 assert.deepEqual(layout(1280,900,form,null,true),full);
 const narrow=layout(320,360,{left:16,right:304,top:230,bottom:350},null,true,{minimumHeight:110});assert.equal(narrow.card.w,288);assert.equal(narrow.card.h,206);assert.equal(narrow.card.y+narrow.card.h,narrow.orb.y+48);
});
test('R3 relocates the one existing toolbar after content in DOM and reserves the shared corner',()=>{
 assert.equal((html.match(/<header/g)||[]).length,1);assert.ok(html.indexOf('<header')>html.indexOf('id="check-text"'));assert.ok(html.indexOf('<header')>html.indexOf('id="surface-tools"'));
 assert.match(css,/height:48px;min-height:48px/);assert.match(css,/padding:2px 55px 0 15px/);assert.match(css,/#list\{margin:7px 0;padding:0 12px/);assert.match(css,/#capsule-use\{[^}]*right:48px/);
 assert.doesNotMatch(host,/\.hint|transition-delay:650ms|junction|anchor-edge|orb\.title/);assert.doesNotMatch(html,/<[^>]+\stitle=/);assert.doesNotMatch(ui,/setAttribute\(['"]title|\.title\s*=(?!localize)/);
 assert.match(host,/className='surface-skin'/);assert.match(host,/clip-path:inset\(/);assert.match(host,/pointer-events:none/);assert.match(host,/aria-controls/);
});
test('all six shipped R1 glyph sources are byte-identical to approved R3 assets',async()=>{
 for(const state of ['collapsed','capsule','board'])for(const theme of ['light','dark']){
  const path=`cards-${state}-${theme}.svg`,approved=await read(`docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18/assets/${path}`),shipped=await read(`ui/assets/prompt-r3/${path}`);assert.equal(shipped,approved,path);
  assert.equal((shipped.match(/<rect /g)||[]).length,2);assert.match(shipped,/x="14.75" y="17" width="21" height="14" rx="3.25"/);
 }
});
test('R3 private More and persistent error share flow above the relocated toolbar',()=>{
 assert.match(css,/#surface-tools\{position:relative;inset:auto;flex:1 1 auto;min-height:0/);
 assert.match(css,/#card:has\(> #surface-tools:not\(\[hidden\]\)\) > :is\(#list,#editor,#check-text,#prompt-assist\)\{display:none\}/);
 assert.ok(html.indexOf('id="status"')>html.indexOf('id="surface-tools"'));assert.ok(html.indexOf('<header')>html.indexOf('id="status"'));
 assert.match(host,/border:1px solid transparent;border-radius:0;background:transparent/,'the full48px button rectangle remains the hit target; only its decoration is circular');
});

test('initial one-row fallback includes both borders and all14px breathing space before first measurement',()=>{
 for(const minimumHeight of [undefined,92,108]){const measurement=minimumHeight===undefined?{}:{minimumHeight};const form={left:40,right:1240,top:131,bottom:884};assert.equal(layout(1280,900,form,null,true,measurement).card,null,'107px cannot fit a complete R3 row plus tools');const fitted=layout(1280,900,{...form,top:132},null,true,measurement);assert.equal(fitted.card.h,108);assert.equal(fitted.card.y,12);}
});

test('many-row native geometry collector excludes the seventh row and rejects scrolling breathing space',async()=>{
 const {promptRowViewportGeometry,assertSixCompletePromptRows}=await import('./harness/prompt-r3-row-viewport.mjs');
 const make=(old=false)=>{
  const node=rect=>({getBoundingClientRect:()=>rect}),card=node({x:0,y:0,width:336,height:328}),header=node({x:1,y:279,width:334,height:48});
  const rows=Array.from({length:9},(_,i)=>node({x:13,y:8+44*i,width:310,height:44}));
  const list=Object.assign(node({x:1,y:old?1:8,width:334,height:old?278:264}),{scrollTop:0,querySelectorAll:()=>rows});
  const context={document:{getElementById:id=>id==='list'?list:card,querySelector:()=>header},getComputedStyle:()=>({paddingTop:old?'7px':'0px',paddingBottom:old?'7px':'0px',marginTop:old?'0px':'7px',marginBottom:old?'0px':'7px'})};
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${promptRowViewportGeometry.toString()})()`,context)));
 };
 const current=make();assertSixCompletePromptRows(current);
 const old=make(true);assert.equal(Math.min(old.rows[6].y+44,old.list.y+old.list.height)-old.rows[6].y,7,'the former padding really exposes seven pixels');assert.throws(()=>assertSixCompletePromptRows(old),/six-row scrollport/);
 for(const change of [v=>v.rows[6].y=v.list.y+263,v=>v.rows[5].height=43,v=>v.padding[1]=7,v=>v.margin[1]=0]){const bad=structuredClone(current);change(bad);assert.throws(()=>assertSixCompletePromptRows(bad));}
 assert.match(css,/#list\{margin:7px 0;padding:0 12px;min-height:0\}/);
});

test('original measureLayout includes persistent status outer margins and excludes quiet live feedback',async()=>{
 const measurementSource=ui.slice(ui.indexOf('function flowHeight('),ui.indexOf('function scheduleLayout('));
 const measure=async({height=30,margin=4,position='relative',display='block',old=false}={})=>{
  const box=(height,style={})=>({getBoundingClientRect:()=>({height}),style:{fontSize:'14px',marginTop:'0px',marginBottom:'0px',position:'static',display:'block',...style}});
  const card=Object.assign(box(328),{clientWidth:336}),header=box(48),status=box(height,{marginBottom:margin+'px',position,display}),row=box(44),list={querySelector:()=>row},calls=[];
  const state={document:{getElementById:()=>card,querySelector:()=>header,documentElement:{dataset:{paiaTheme:'light'},setAttribute(){},removeAttribute(){}}},getComputedStyle:node=>node.style,status,list,checking:false,editing:false,layoutScheduled:true,disposed:false,layoutPending:false,pointerGesture:false,lastMeasuredHeight:0,lastMinimumHeight:0,lastAppearance:null,lastLanguage:null,language:'zh-CN',layoutTicket:0,layoutDirty:false,pendingListReturn:null,rpc:async value=>{calls.push(value);},restoreListReturn(){},scheduleLayout(){}};
  const context=vm.createContext(state),source=old?measurementSource.replace('flowHeight(header)+flowHeight(status)','header.getBoundingClientRect().height+status.getBoundingClientRect().height'):measurementSource;vm.runInContext(source+'\nmeasureLayout();',context);await new Promise(setImmediate);assert.equal(calls.length,1);return calls[0];
 };
 assert.equal((await measure({old:true})).minimumHeight,138,'the previous raw-height calculation really underbudgets by4px');
 const persistent=await measure();assert.equal(persistent.minimumHeight,142,'48 tools +30 status +4 outer margin +44 row +14 breathing +2 borders');assert.equal(persistent.height,328);
 assert.equal((await measure({height:66})).minimumHeight,178);assert.equal((await measure({margin:8})).minimumHeight,146);
 assert.equal((await measure({height:1,position:'absolute'})).minimumHeight,108,'quiet accessibility feedback never consumes row space');assert.equal((await measure({display:'none'})).minimumHeight,108);
 const form={left:40,right:1240,top:165,bottom:884};assert.equal(layout(1280,900,form,null,true,{minimumHeight:persistent.minimumHeight}).card,null,'141px refuses the status+row view');assert.equal(layout(1280,900,{...form,top:166},null,true,{minimumHeight:persistent.minimumHeight}).card.h,142);
});
