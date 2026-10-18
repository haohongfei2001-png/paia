// Current visual authority is frozen design data, never a runtime screenshot.
// Geometry follows NARROW_INPUT_BOARD_V4_SPEC §2 (the later fixed-entry clarification).
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export const CONTRACT='PAIA-FLOAT-UI-1.1';
export const APPROVED_ROOT='docs/consumer-product-v1/design/narrow-input-board-v4/approved-2026-10-18';
export const STATES=Object.freeze(['01-orb-light','02-card-light','03-card-hover','04-card-edit','05-card-drag','06-card-dark','07-card-compact','08-inserted-light']);
export const RUNTIME_FILES=Object.freeze(['content/prompt-surface.js','core/prompt-surface-layout.js','ui/prompt-surface.css','ui/prompt-surface.js','ui/prompt-surface.html']);
const PINNED=Object.freeze({
 'assets/PAIA_视觉参数.json':'981abfe43ea7e2e649d53cdaa1865e7dfc8bbe397004172608768ce79893158b',
 'assets/PAIA_句瓣_浅色.svg':'13caefae3340b336edf1890de2d283a7948f0786849ed390756639b57dcbe079',
 'assets/PAIA_句瓣_深色.svg':'d9d4b304f02dc29e08c0f0d97982005f4cd700cb57816b49461dc9a5390b2e75',
});
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyReference(bytes,reference){
 assert.equal(bytes.length,reference.published_bytes,'approved reference length');
 assert.equal(digest(bytes),reference.published_sha256,'approved reference digest');
 if(PINNED[reference.path])assert.equal(reference.published_sha256,PINNED[reference.path],'frozen B identity');
}
export async function readApprovedAuthority(root){
 const base=join(root,APPROVED_ROOT),manifest=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
 assert.equal(manifest.contract,CONTRACT);
 const references=[];
 for(const path of Object.keys(PINNED)){
  const rows=manifest.files.filter(r=>r.path===path);assert.equal(rows.length,1,'unique B reference');
  const bytes=await readFile(join(base,path));verifyReference(bytes,rows[0]);
  references.push({...rows[0],bytes});
 }
 // Approved screenshots are contextual design references, not pixel-aligned browser goldens.
 for(const row of manifest.files.filter(r=>r.role==='approved B visual reference'&&r.path.endsWith('.jpg'))){
  const bytes=await readFile(join(base,row.path));verifyReference(bytes,row);references.push({...row,bytes});
 }
 const tokens=JSON.parse(references[0].bytes.toString('utf8'));
 const glyph=references[1].bytes.toString('utf8');
 return {tokens,references,glyph:{paths:[...glyph.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]),transform:glyph.match(/transform="([^"]+)"/)[1]},identity:{contract:CONTRACT,source:APPROVED_ROOT,files:references.map(({path,published_sha256})=>({path,sha256:published_sha256})),geometry:'NARROW_INPUT_BOARD_V4_SPEC.md §2: board above unchanged entry'}};
}
export function selectedStates(value){
 if(!value?.trim())return [...STATES];
 const ids=value.split(',');assert.equal(new Set(ids).size,ids.length,'duplicate visual state');
 assert.ok(ids.length&&ids.every(id=>STATES.some(name=>name.startsWith(id+'-'))),'unknown visual state');
 return STATES.filter(name=>ids.includes(name.slice(0,2)));
}
export function rgb(hex){assert.match(hex,/^#[a-f0-9]{6}$/i);return `rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;}
export function assertGlyphAndMotion(runtime,authority){
 const {tokens,glyph}=authority,host=runtime['content/prompt-surface.js'],html=runtime['ui/prompt-surface.html'],css=runtime['ui/prompt-surface.css'],ui=runtime['ui/prompt-surface.js'];
 assert.equal(glyph.paths.length,2);
 const hostPaths=host.match(/for\(const d of \[\s*'([^']*)'\s*,\s*'([^']*)'\s*\]\)/);
 assert.ok(hostPaths,'original two-path constructor');assert.deepEqual(hostPaths.slice(1),glyph.paths,'exact approved B host paths');
 assert.deepEqual([...html.matchAll(/<path\s+d="([^"]*)"/g)].map(m=>m[1]),glyph.paths,'exact approved B capsule paths');
 assert.deepEqual([...host.matchAll(/group\.setAttribute\('transform','([^']*)'\)/g)].map(m=>m[1]),[glyph.transform],'exact approved B host optical matrix');
 assert.deepEqual([...html.matchAll(/<g\s+transform="([^"]*)"/g)].map(m=>m[1]),[glyph.transform],'exact approved B capsule optical matrix');
 assert.ok(host.includes(`width:${tokens.geometry.entry_svg[0]}px;height:${tokens.geometry.entry_svg[1]}px`),'approved SVG envelope');
 assert.ok(css.includes(`width:${tokens.geometry.capsule_mark}px;height:${tokens.geometry.capsule_mark}px`),'approved capsule mark');
 assert.ok(runtime['core/prompt-surface-layout.js'].includes(`Math.min(${tokens.geometry.capsule[0]},visibleWidth-32)`),'approved capsule width');
 for(const theme of ['light','dark'])assert.ok(host.includes(tokens[theme].panel_shadow),'approved '+theme+' panel shadow');
 const compact=text=>text.replace(/[\s"']/g,'');assert.ok(compact(css).includes(compact(tokens.typography.font_stack)),'approved font stack');
 for(const [value,source] of [[`duration:${tokens.motion.close_ms}`,host],[`animation:appear .${tokens.motion.open_ms/10}s`,host],[`translateY(${tokens.motion.open_translate_y_px}px)`,host],[`translateY(${tokens.motion.close_translate_y_px}px)`,host],[`transition-delay:${tokens.motion.entry_tooltip_delay_ms}ms`,host],[`setTimeout(()=>tell(''),${tokens.motion.inserted_feedback_ms})`,ui],[`},${tokens.motion.inserted_feedback_ms});paintCapsule()`,ui]])assert.ok(source.includes(value),'approved motion/feedback token '+value);
 assert.match(host,/@media\(prefers-reduced-motion:reduce\)\{iframe\{animation:none\}/);
}
const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<0.02,`${label}: ${a} != ${b}`);
const inside=(b,v)=>b&&['x','y','width','height'].every(k=>Number.isFinite(b[k]))&&b.width>0&&b.height>0&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width+0.02&&b.y+b.height<=v.height+0.02;
const disjoint=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
export function assertGeometry(screen,tokens){
 const {orb,card,composer,viewport,entryBeforeOpen}=screen,g=tokens.geometry;
 assert.ok(inside(orb,viewport),'entry inside viewport');assert.ok(inside(composer,viewport),'complete composer inside viewport');
 near(orb.width,g.entry_hit_area[0],'entry width');near(orb.height,g.entry_hit_area[1],'entry height');
 assert.ok(disjoint(orb,composer),'entry must not cover composer');
 const edge=Math.max(Math.min(g.board[0],viewport.width-32),Math.min(viewport.width,composer.x+composer.width-(viewport.width<=530?g.anchor_right_inset_below_530:g.anchor_right_inset_desktop)));
 near(orb.x+orb.width,edge,'composer right anchor');near(orb.y+orb.height,composer.y-g.anchor_gap,'composer top gap');
 assert.ok(entryBeforeOpen,'pre-open anchor evidence is required');
 for(const key of ['x','y','width','height'])near(orb[key],entryBeforeOpen[key],'unchanged entry '+key);
 if(card){
  assert.ok(inside(card,viewport),'board inside viewport');assert.ok(disjoint(card,composer)&&disjoint(card,orb),'board cannot cover composer or entry');
  near(card.width,g.board[0],'ordinary board width');near(card.height,g.board[1],'ordinary board height');
  near(card.x+card.width,orb.x+orb.width,'common right edge');near(card.y+card.height,orb.y,'board above unchanged entry, zero gap');
 }
}
export function assertComputed(computed,theme,tokens){
 assert.ok(theme==='light'||theme==='dark');const palette=tokens[theme],type=tokens.typography;
 assert.equal(computed.color,rgb(palette.text),'approved B text role');
 assert.equal(computed.candidateColor,rgb(palette.text),'actual candidate text role');
 for(const [variable,key] of Object.entries({'--line':'border','--hover':'hover','--active':'active','--focus':'brand','--panel':'surface','--muted':'muted','--inserted':'inserted_surface','--inserted-text':'inserted_text'}))assert.equal(computed.variables[variable].trim().toLowerCase(),palette[key],variable);
 near(computed.fontSize,type.candidate_and_capsule_font_size,'candidate font');near(computed.lineHeight,type.candidate_line_height,'candidate line height');near(computed.headerFontSize,type.header_font_size,'header font');
 near(computed.headerHeight,tokens.geometry.header_height,'header height');
 for(const h of computed.rowHeights)near(h,tokens.geometry.candidate_row_height,'candidate row height');
 assert.ok(computed.rowHeights.length>0,'nonempty candidate geometry');
 near(computed.radius,tokens.geometry.board_radius,'board radius');assert.equal(computed.surface,rgb(palette.surface));assert.equal(computed.border,rgb(palette.border));
}
export function assertEntryComputed(computed,theme,tokens){
 const palette=tokens[theme];assert.ok(palette);
 for(const [variable,key] of Object.entries({'--brand':'brand','--surface':'surface','--line':'border','--hover':'hover','--active':'active','--muted':'muted'}))assert.equal(computed[variable].trim().toLowerCase(),palette[key],'actual entry '+variable);
}
export function measuredCrop(screen,padding=24){
 const boxes=[screen.orb,screen.card].filter(Boolean),v=screen.viewport;
 assert.ok(boxes.length&&boxes.every(b=>inside(b,v)),'crop requires complete measured surfaces');
 assert.ok(Number.isFinite(padding)&&padding>=0);
 const x=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.x))-padding)),y=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.y))-padding));
 const right=Math.min(v.width,Math.ceil(Math.max(...boxes.map(b=>b.x+b.width))+padding)),bottom=Math.min(v.height,Math.ceil(Math.max(...boxes.map(b=>b.y+b.height))+padding));
 return {x,y,width:right-x,height:bottom-y};
}
export function assertCompleteReceipts(source,release,expected=STATES){
 assert.ok(expected.length&&expected.every(n=>STATES.includes(n))&&new Set(expected).size===expected.length,'explicit nonempty state inventory');
 for(const receipt of [source,release]){
  assert.equal(receipt.capture,'PASS');assert.equal(receipt.authority?.contract,CONTRACT);
  assert.equal(receipt.ownerAcceptance,'PENDING');assert.equal(receipt.realChatGPT,'DEFERRED_EXTERNAL_EVIDENCE');
  assert.deepEqual(receipt.screens.map(s=>s.name),expected,'every selected state exactly once');
  assert.deepEqual(Object.keys(receipt.hashes).sort(),[...RUNTIME_FILES].sort(),'all five runtime files bound');
  assert.ok(Object.values(receipt.hashes).every(s=>/^[a-f0-9]{64}$/.test(s)));
 }
 assert.equal(source.variant,'source');assert.equal(release.variant,'release');assert.equal(source.sha,release.sha);
 assert.deepEqual(source.hashes,release.hashes);assert.deepEqual(source.authority,release.authority);assert.deepEqual(source.screens,release.screens);
 return {complete:expected.length===STATES.length,states:expected.length};
}
export function assertExactPixels(actual,built,label){
 assert.equal(actual.width,built.width,label+' width');assert.equal(actual.height,built.height,label+' height');
 assert.ok(actual.width>0&&actual.height>0);assert.equal(actual.data.length,actual.width*actual.height*4);assert.equal(built.data.length,actual.data.length);
 assert.ok(Buffer.from(actual.data).equals(Buffer.from(built.data)),label+' exact source/release pixel parity');
}
