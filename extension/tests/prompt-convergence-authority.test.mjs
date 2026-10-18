import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readApprovedAuthority,verifyReference,selectedStates,STATES,RUNTIME_FILES,rgb,assertGeometry,assertComputed,assertThemePalette,assertEntryComputed,measuredCrop,assertCompleteReceipts,assertExactPixels,assertGlyphAndMotion} from '../scripts/prompt-convergence-authority.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),authority=await readApprovedAuthority(root),tokens=authority.tokens;
const clone=x=>structuredClone(x);
const desktop=()=>({viewport:{width:1440,height:900},orb:{x:1052,y:694,width:44,height:44},entryBeforeOpen:{x:1052,y:694,width:44,height:44},card:{x:760,y:382,width:336,height:312},composer:{x:340,y:750,width:760,height:94}});
const compact=()=>({viewport:{width:390,height:844},orb:{x:326,y:638,width:44,height:44},entryBeforeOpen:{x:326,y:638,width:44,height:44},card:{x:34,y:326,width:336,height:312},composer:{x:20,y:694,width:350,height:94}});
const computed=theme=>({color:rgb(tokens[theme].text),candidateColor:rgb(tokens[theme].text),variables:Object.fromEntries(Object.entries({'--line':'border','--hover':'hover','--active':'active','--focus':'brand','--panel':'surface','--muted':'muted','--inserted':'inserted_surface','--inserted-text':'inserted_text'}).map(([key,value])=>[key,tokens[theme][value]])),fontSize:14,lineHeight:22,headerFontSize:12,headerHeight:44,rowHeights:Array(6).fill(44),radius:18,surface:rgb(tokens[theme].surface),border:rgb(tokens[theme].border)});
const receipt=variant=>({capture:'PASS',sha:'a'.repeat(40),variant,authority:clone(authority.identity),ownerAcceptance:'PENDING',realChatGPT:'DEFERRED_EXTERNAL_EVIDENCE',hashes:Object.fromEntries(RUNTIME_FILES.map(f=>[f,'1'.repeat(64)])),screens:STATES.map(name=>({name}))});

test('the active capture and report use the adopted B authority rather than historical v2 expectations', async()=>{
  const capture=await readFile(new URL('../scripts/capture-prompt-convergence.mjs',import.meta.url),'utf8');
  const compare=await readFile(new URL('../scripts/compare-prompt-convergence.mjs',import.meta.url),'utf8');
  assert.match(capture,/readApprovedAuthority/);
  assert.match(compare,/assertCompleteReceipts/);
  assert.doesNotMatch(capture,/rgb\(233, 238, 246\)|rgb\(29, 39, 56\)|transientFeedbackMs:1800/);
  assert.doesNotMatch(compare,/x:1160,y:610|x:900,y:210/);
});

test('frozen approved references retain exact manifest identity and reject altered bytes or identity',()=>{
 assert.equal(authority.references.length,10);
 for(const reference of authority.references)verifyReference(reference.bytes,reference);
 const ref=authority.references[0],changed=Buffer.from(ref.bytes);changed[0]^=1;
 assert.throws(()=>verifyReference(changed,ref),/digest/);
 assert.throws(()=>verifyReference(ref.bytes,{...ref,published_sha256:'0'.repeat(64)}),/digest/);
 assert.throws(()=>verifyReference(ref.bytes.subarray(1),ref),/length/);
});
test('all eight original states are explicit; selected diagnostics cannot invent or duplicate states',()=>{
 assert.deepEqual(selectedStates(),STATES);assert.deepEqual(selectedStates('08,03'),[STATES[2],STATES[7]]);
 for(const value of ['','09','01,01','03,','UNKNOWN'])if(value)assert.throws(()=>selectedStates(value));
});
for(const theme of ['light','dark']){
 test('B '+theme+' computed palette and typography are accepted',()=>assertComputed(computed(theme),theme,tokens));
 test('historical '+theme+' palette is rejected',()=>{const value=computed(theme);value.color=theme==='light'?'rgb(29, 39, 56)':'rgb(233, 238, 246)';assert.throws(()=>assertComputed(value,theme,tokens),/text role/);});
}
for(const [field,value] of [['radius',20],['fontSize',13],['lineHeight',20],['headerFontSize',14],['headerHeight',40]])test('reject mismatched '+field,()=>{const c=computed('light');c[field]=value;assert.throws(()=>assertComputed(c,'light',tokens));});
test('old border, shortened row and empty candidate measurements are rejected',()=>{
 for(const mutate of [c=>c.variables['--line']='#c0c0c0',c=>c.rowHeights[5]=36,c=>c.rowHeights=[]]){const c=computed('light');mutate(c);assert.throws(()=>assertComputed(c,'light',tokens));}
});
for(const [name,make] of [['desktop',desktop],['compact',compact]])test(name+' current anchor and complete measured crop include both board and entry',()=>{
 const screen=make();assertGeometry(screen,tokens);const crop=measuredCrop(screen);
 for(const box of [screen.orb,screen.card]){assert.ok(crop.x<=box.x&&crop.y<=box.y);assert.ok(crop.x+crop.width>=box.x+box.width&&crop.y+crop.height>=box.y+box.height);}
 assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=screen.viewport.width&&crop.y+crop.height<=screen.viewport.height);
});
for(const [name,mutate] of [['old 350px board',s=>s.card.height=350],['shifted anchor',s=>s.entryBeforeOpen.x-=10],['board over target',s=>s.card.y+=44],['composer overlap',s=>s.orb.y=s.composer.y],['missing before-open evidence',s=>delete s.entryBeforeOpen],['offscreen board',s=>s.card.x=-1]])test('reject '+name,()=>{const s=desktop();mutate(s);assert.throws(()=>assertGeometry(s,tokens));});
test('orb-only crop remains complete and invalid or empty geometry is rejected',()=>{
 const s=desktop();s.card=null;assertGeometry(s,tokens);assert.deepEqual(measuredCrop(s),{x:1028,y:670,width:92,height:92});
 assert.throws(()=>measuredCrop({...s,orb:null}));assert.throws(()=>measuredCrop({...s,orb:{...s.orb,width:NaN}}));
});
test('complete receipts require all original states and the fifth HTML runtime hash',()=>{
 assert.deepEqual(assertCompleteReceipts(receipt('source'),receipt('release')),{complete:true,states:8});
 for(const mutate of [r=>r.screens=[],r=>r.screens.pop(),r=>r.screens[7]=r.screens[0],r=>delete r.hashes['ui/prompt-surface.html'],r=>r.capture='UNKNOWN',r=>r.authority.contract='Visual Master v2']){const a=receipt('source'),b=receipt('release');mutate(a);mutate(b);assert.throws(()=>assertCompleteReceipts(a,b));}
 const a=receipt('source'),b=receipt('release');b.hashes['ui/prompt-surface.html']='2'.repeat(64);assert.throws(()=>assertCompleteReceipts(a,b));
});
test('explicit partial diagnostics cannot acquire complete-coverage status',()=>{
 const a=receipt('source'),b=receipt('release');a.screens=[a.screens[2]];b.screens=[b.screens[2]];
 assert.deepEqual(assertCompleteReceipts(a,b,[STATES[2]]),{complete:false,states:1});assert.throws(()=>assertCompleteReceipts(a,b,[]));
});
test('one changed pixel or alpha fails exact source/release parity; empty images cannot pass',()=>{
 const a={width:1,height:1,data:Buffer.from([20,30,40,255])};assertExactPixels(a,clone(a),'identical');
 for(let i=0;i<4;i++){const b=clone(a);b.data[i]^=1;assert.throws(()=>assertExactPixels(a,b,'changed'));}
 assert.throws(()=>assertExactPixels({width:0,height:0,data:Buffer.alloc(0)},{width:0,height:0,data:Buffer.alloc(0)},'empty'));
});
test('actual runtime binds exact approved glyph, capsule and all motion identities; mutations are rejected',async()=>{
 const runtime=Object.fromEntries(await Promise.all(RUNTIME_FILES.map(async file=>[file,await readFile(join(root,file),'utf8')])));
 assertGlyphAndMotion(runtime,authority);
 for(const [file,before,after] of [['content/prompt-surface.js',authority.glyph.paths[0],authority.glyph.paths[0]+'M0 0L40 40'],['ui/prompt-surface.html',authority.glyph.transform,authority.glyph.transform+' translate(9 0)'],['ui/prompt-surface.html',authority.glyph.paths[1],authority.glyph.paths[1]+'M0 0L40 40'],['content/prompt-surface.js',authority.glyph.transform,authority.glyph.transform+' translate(9 0)'],['ui/prompt-surface.html',authority.glyph.transform,'matrix(1 0 0 1 0 0)'],['ui/prompt-surface.css','width:19px;height:19px','width:18px;height:18px'],['ui/prompt-surface.js',"setTimeout(()=>tell(''),480)","setTimeout(()=>tell(''),1800)"]]){
  const changed={...runtime,[file]:runtime[file].replace(before,after)};assert.notEqual(changed[file],runtime[file]);
  assert.throws(()=>assertGlyphAndMotion(changed,authority));
 }
});

for(const theme of ['light','dark'])test('actual '+theme+' entry and candidate colors cannot hide behind correct board root tokens',()=>{
 const palette=tokens[theme],entry=Object.fromEntries(Object.entries({'--brand':'brand','--surface':'surface','--line':'border','--hover':'hover','--active':'active','--muted':'muted'}).map(([variable,key])=>[variable,palette[key]]));
 assertEntryComputed(entry,theme,tokens);assert.throws(()=>assertEntryComputed({...entry,'--brand':'#ff0000'},theme,tokens));
 const c=computed(theme);c.candidateColor='rgb(255, 0, 0)';assert.throws(()=>assertComputed(c,theme,tokens),/candidate text/);
});
test('transient V08 images are measured inside the unchanged duration, displayed, and exact-parity checked',async()=>{
 const capture=await readFile(new URL('../scripts/capture-prompt-convergence.mjs',import.meta.url),'utf8'),compare=await readFile(new URL('../scripts/compare-prompt-convergence.mjs',import.meta.url),'utf8');
 assert.match(capture,/transient feedback screenshot is captured inside the original 480ms window/);
 assert.match(compare,/suffix='08-inserted-feedback.png';assertExactPixels/);
 assert.match(compare,/actual transient feedback/);assert.match(compare,/observedInsideWindow:true/);
});


test('native dynamic theme journey uses the same pinned B authority and preserves original transition/dirty/order checks',async()=>{
 const source=await readFile(new URL('./cpv1-09-prompt-surface-chrome-e2e.test.mjs',import.meta.url),'utf8');
 assert.match(source,/readApprovedAuthority\(root\)/);assert.match(source,/assertThemePalette\(actual,theme,approvedThemeAuthority\.tokens\)/);
 assert.doesNotMatch(source,/rgb\(233, 238, 246\)|rgb\(29, 39, 56\)/);
 assert.match(source,/\['dark','light','dark','light'\]/);assert.match(source,/assert\.deepEqual\(await f\.locator\('\.row'\)/);
 assert.equal((source.match(/inputValue\(\),'unsaved theme transition'/g)||[]).length,2);
 assert.match(source,/variant\+'-theme-transitions.json'/);
});
for(const theme of ['light','dark'])test('dynamic '+theme+' theme rejects historical color, low contrast, stale opposite mode and missing candidate',()=>{
 const valid=computed(theme);assertThemePalette(valid,theme,tokens);
 for(const mutate of [
  c=>c.color=theme==='light'?'rgb(29, 39, 56)':'rgb(233, 238, 246)',
  c=>c.candidateColor=theme==='light'?'rgb(29, 39, 56)':'rgb(233, 238, 246)',
  c=>c.color=c.surface,
  c=>c.candidateColor=c.surface,
  c=>c.surface=c.color,
  c=>Object.assign(c,computed(theme==='light'?'dark':'light')),
  c=>c.candidateColor=null,
  c=>c.surface=null,
 ]){const changed=clone(valid);mutate(changed);assert.throws(()=>assertThemePalette(changed,theme,tokens));}
});
