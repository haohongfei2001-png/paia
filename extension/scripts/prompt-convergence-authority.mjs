// Current PAIA-FLOAT-UI-1.3 authority pins the adopted, unmodified R3 source.
// Historical B receipts remain historical; runtime captures never become references.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {assertProductionR3} from '../tests/harness/prompt-r3-authority.mjs';
export const CONTRACT='PAIA-FLOAT-UI-1.3';
export const APPROVED_ROOT='docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18';
const ADOPTION='docs/consumer-product-v1/design/narrow-input-board-v4/adopted-r3-2026-10-18/manifest.json';
export const STATES=Object.freeze(['01-orb-light','02-card-light','03-card-hover','04-card-edit','05-card-drag','06-card-dark','07-card-compact','08-inserted-light']);
export const RUNTIME_FILES=Object.freeze(['content/prompt-surface.js','core/prompt-surface-layout.js','ui/prompt-surface.css','ui/prompt-surface.js','ui/prompt-surface.html',...['collapsed','capsule','board'].flatMap(form=>['light','dark'].map(theme=>'ui/assets/prompt-r3/cards-'+form+'-'+theme+'.svg'))]);
const PINNED=Object.freeze({
 "INTEGRATION.md": {
  "published_bytes": 3122,
  "published_sha256": "4ee1dc8cef2724260f4148a4e66bfc90f54d33cf6c3cdf216b376e951b504eaa"
 },
 "README.md": {
  "published_bytes": 4002,
  "published_sha256": "354c4eeab173fd97f1870fd9001095819fe96b91c1cfda7bf3e042bdafcda533"
 },
 "REVIEW.md": {
  "published_bytes": 3455,
  "published_sha256": "201a20d236b3683317b87b76c4c696c54bcd826cc3d23b83805fe5e291e1e83e"
 },
 "assets/cards-board-dark.svg": {
  "published_bytes": 1233,
  "published_sha256": "18d974abd9480492f82cdeacaf118a35b4ed25e452623f9674156f508ca573ab"
 },
 "assets/cards-board-light.svg": {
  "published_bytes": 1233,
  "published_sha256": "8749679edd456b62626f101d5c19a72b99ac658d5e8fdcf9310bea20943f9eac"
 },
 "assets/cards-capsule-dark.svg": {
  "published_bytes": 1231,
  "published_sha256": "e162084f2abae761aac9a975eb3f3e19a7900a0485d3a13d507d28c61a83973a"
 },
 "assets/cards-capsule-light.svg": {
  "published_bytes": 1231,
  "published_sha256": "edd81dab1e6b035ba5a1fb73bc3e5cfad96a4eb5f6a1a8c88fd6e4b96fad095f"
 },
 "assets/cards-collapsed-dark.svg": {
  "published_bytes": 1237,
  "published_sha256": "6051bfd386c3299f9ee39e64c06b10d10b3352bc0e0a890e0cdc4c70544cc288"
 },
 "assets/cards-collapsed-light.svg": {
  "published_bytes": 1237,
  "published_sha256": "686f37cb2eef4d700fdd3cb0048a093b4fc61b61f37c650865f39fa1eaf68cef"
 },
 "assets/skin-board.svg": {
  "published_bytes": 353,
  "published_sha256": "d091d47772db1801dbd660c2a321c160310d1e7d63065dcaaf858efd6f336755"
 },
 "assets/skin-capsule.svg": {
  "published_bytes": 277,
  "published_sha256": "fd88f4c2a9283020b5ac942f86cdba44d52be53b96fcf7e5fb7770cc43e63758"
 },
 "assets/skin-collapsed.svg": {
  "published_bytes": 274,
  "published_sha256": "3c777df7d81c8f7506784c9fe15268125b23b383bea4c51131bfa2023b0f7a17"
 },
 "build.py": {
  "published_bytes": 1102,
  "published_sha256": "a6a5eff16a0db98cf7e2866981a9df2f045d7187cf2a3c2839fb294cf8fb77c3"
 },
 "component.css": {
  "published_bytes": 10896,
  "published_sha256": "08103aec6fdc9f72f4a349759eaa56ef399f63401ed62f55e17486f40476674f"
 },
 "component.js": {
  "published_bytes": 20537,
  "published_sha256": "0fe3bfc0936e0881ed85db5872e50bf9b8efc87ad01e937a62ef70b6f047b354"
 },
 "demo.css": {
  "published_bytes": 7369,
  "published_sha256": "fdfc08e6c21a30d0061e59b01ad752a896eed8ba293574d8f7fb30006a245ffa"
 },
 "demo.js": {
  "published_bytes": 12416,
  "published_sha256": "e84b30322a78216388e7a8fb6d80bbf56e59bb29ecf6bed5a5b005d1b5b98cdf"
 },
 "evidence/manifest.json": {
  "published_bytes": 4771,
  "published_sha256": "c60fc2efa32ee10c8f62069413d0ff3fa335a9798620a4271152feb70230d2fe"
 },
 "evidence/verification-summary.json": {
  "published_bytes": 793,
  "published_sha256": "db9bec38c87da5a36ae91642f5dcc9b50893d85c7d5237f5965ae0cdad224009"
 },
 "export_geometry.py": {
  "published_bytes": 807,
  "published_sha256": "975cec0bf9f16983286eb226961720c71cb1bf2391f2fd3ea224c9830d5b4138"
 },
 "fusion.css": {
  "published_bytes": 4319,
  "published_sha256": "a55bb5cfc570848c40324275b0ce3c158ebfeeea59baf3b610c3bed50399c5a5"
 },
 "fusion.js": {
  "published_bytes": 2039,
  "published_sha256": "81866305b5b5f988ea363dc56721264d912e5c8ca04e249e68f9703c67bf1118"
 },
 "index.html": {
  "published_bytes": 2273,
  "published_sha256": "0551e92563148c7a6d22489a63744c0d207c2155489478a81494d9a331c66509"
 },
 "inheritance.json": {
  "published_bytes": 1682,
  "published_sha256": "bce2cc5990eda2b65e50cd60b682e20d4f70895433833aaf6fbfd276083129a7"
 },
 "review_geometry.py": {
  "published_bytes": 2512,
  "published_sha256": "25c6347539285f01af815fa86061a0983c9a25046771f89371ac66cf90a78c62"
 },
 "tokens-r1.json": {
  "published_bytes": 2817,
  "published_sha256": "c524725e502522ff78805d2b7f9c6870d0a3837125c1a0ca5ac0e3d7b02b2688"
 },
 "tokens.json": {
  "published_bytes": 2199,
  "published_sha256": "a6431c689971b2e9b8aa5f0886248968ef2c18a9626aa50132c95827a2481b40"
 },
 "verify.py": {
  "published_bytes": 2057,
  "published_sha256": "47fbf2446b01ef3ab6347ae0bacbbcd3dd02639c68a170637912852fa3c8597a"
 },
 "verify_fusion.py": {
  "published_bytes": 14718,
  "published_sha256": "f85e0a796d6876d4e45478351132fd3762d48943abe1a692bdf66d1fa7efd3b0"
 },
 "verify_r1_inherited.py": {
  "published_bytes": 22989,
  "published_sha256": "e42d5178af2a366d1a130583de2e633da77339b8d004b67cf96fa9882ca1b4ad"
 }
});
const ADOPTION_SHA='ed2adb079efa477aef5aa3dc37aaeb5ca3e02b264305b8ac3a1904bd8b89479f';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyReference(bytes,reference){
 assert.equal(bytes.length,reference.published_bytes,'adopted reference length');
 assert.equal(digest(bytes),reference.published_sha256,'adopted reference digest');
 assert.ok(Object.hasOwn(PINNED,reference.path),'known adopted R3 source');
 assert.deepEqual({published_bytes:reference.published_bytes,published_sha256:reference.published_sha256},PINNED[reference.path],'pinned adopted source identity');
}
export async function readApprovedAuthority(root){
 const adoptionBytes=await readFile(join(root,ADOPTION));assert.equal(digest(adoptionBytes),ADOPTION_SHA,'original adoption manifest');
 const adoption=JSON.parse(adoptionBytes);assert.equal(adoption.canonical_design_id,CONTRACT);assert.equal(adoption.selected_source_commit,'b807ebfb814bbcdbf3997039fd5c949d0fe1eff9');
 const references=[];
 for(const [path,identity] of Object.entries(PINNED)){const bytes=await readFile(join(root,APPROVED_ROOT,path));const row={path,...identity,bytes};verifyReference(bytes,row);references.push(row);}
 assert.equal(references.length,adoption.source_file_count,'all 30 adopted source files');
 const parse=path=>JSON.parse(references.find(x=>x.path===path).bytes),r3=parse('tokens.json'),r1=parse('tokens-r1.json');
 const palette=theme=>({...r1[theme],brand:r1[theme].focus,active:r1[theme].pressed,inserted_surface:r1[theme].inserted,inserted_text:r1[theme].text});
 const tokens={light:palette('light'),dark:palette('dark'),geometry:{entry_hit_area:[r3.anchor.width,r3.anchor.height],board:[r3.board.width,r3.board.height],board_radii:r3.board.radii_tl_tr_br_bl,header_height:r3.board.control_row_height,candidate_row_height:r3.board.row_height,anchor_gap:r1.anchor_layout.composer_gap,anchor_right_inset_desktop:r1.anchor_layout.desktop_right_inset,anchor_right_inset_below_530:r1.anchor_layout.small_host_right_inset},typography:{candidate_and_capsule_font_size:r1.typography.expression,candidate_line_height:r1.typography.expression*r1.typography.line_height,header_font_size:r1.typography.header_label},motion:{...r3.motion,inserted_feedback_ms:r1.motion.inserted_feedback_ms}};
 return {r3,r1,tokens,references,identity:{contract:CONTRACT,source:APPROVED_ROOT,adoptionSha256:ADOPTION_SHA,sourceCommit:adoption.selected_source_commit,sourceSubtree:adoption.selected_source_subtree,files:references.map(({path,published_sha256})=>({path,sha256:published_sha256})),geometry:'R3 shared skin, fixed right/bottom anchor; original 48px target'}};
}
export function selectedStates(value){
 if(!value?.trim())return [...STATES];
 const ids=value.split(',');assert.equal(new Set(ids).size,ids.length,'duplicate visual state');
 assert.ok(ids.length&&ids.every(id=>STATES.some(name=>name.startsWith(id+'-'))),'unknown visual state');
 return STATES.filter(name=>ids.includes(name.slice(0,2)));
}
export function rgb(hex){assert.match(hex,/^#[a-f0-9]{6}$/i);return `rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;}
const opaqueHex=value=>{assert.equal(typeof value,'string');const hex=value.trim().toLowerCase();assert.match(hex,/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/,'exact opaque hex color');return hex.length===4?'#'+[...hex.slice(1)].map(char=>char+char).join(''):hex;};
export function assertGlyphAndMotion(runtime,authority){
 assertProductionR3(runtime);
 const r=authority.r3,g=authority.r1.cards;
 assert.equal(r.anchor.width,48);assert.deepEqual(r.board.radii_tl_tr_br_bl,[18,18,24,18]);
 for(const form of ['collapsed','capsule','board'])for(const theme of ['light','dark']){
  const path='assets/cards-'+form+'-'+theme+'.svg',reference=authority.references.find(x=>x.path===path);
  assert.ok(reference,'original adopted glyph');
  assert.equal(runtime['ui/'+path.replace('assets/','assets/prompt-r3/')],reference.bytes.toString('utf8'),'exact inherited production SVG '+form+'/'+theme);
  const svg=reference.bytes.toString('utf8');assert.equal((svg.match(/<rect /g)||[]).length,g.count);
  assert.ok(svg.includes(`x="${g.front_x}" y="${g.front_y}" width="${g.width}" height="${g.height}" rx="${g.radius}"`));
  assert.ok(svg.includes(`transform="translate(${g.rear_offsets[form].join(' ')})"`));
 }
 assert.doesNotMatch(runtime['ui/prompt-surface.html'],/<(?:path|g)\s/,'retired B glyph is not an alternate capsule');
}
const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<0.02,`${label}: ${a} != ${b}`);
const inside=(b,v)=>b&&['x','y','width','height'].every(k=>Number.isFinite(b[k]))&&b.width>0&&b.height>0&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width+0.02&&b.y+b.height<=v.height+0.02;
const disjoint=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
export function assertGeometry(screen,tokens){
 const {orb,card,composer,viewport,entryBeforeOpen}=screen,g=tokens.geometry;
 assert.ok(inside(orb,viewport),'entry inside viewport');assert.ok(inside(composer,viewport),'complete composer inside viewport');
 near(orb.width,g.entry_hit_area[0],'entry width');near(orb.height,g.entry_hit_area[1],'entry height');
 assert.ok(disjoint(orb,composer),'entry must not cover composer');
 const edge=Math.max(g.entry_hit_area[0],Math.min(viewport.width,composer.x+composer.width-(viewport.width<=530?g.anchor_right_inset_below_530:g.anchor_right_inset_desktop)));
 near(orb.x+orb.width,edge,'composer right anchor');near(orb.y+orb.height,composer.y-g.anchor_gap,'composer top gap');
 assert.ok(entryBeforeOpen,'pre-open anchor evidence is required');
 for(const key of ['x','y','width','height'])near(orb[key],entryBeforeOpen[key],'unchanged entry '+key);
 if(card){
  assert.ok(inside(card,viewport),'board inside viewport');assert.ok(disjoint(card,composer),'board cannot cover composer');
  near(card.width,g.board[0],'ordinary board width');near(card.height,g.board[1],'ordinary board height');
  near(card.x+card.width,orb.x+orb.width,'common right edge');near(card.y+card.height,orb.y+orb.height,'shared fixed bottom edge');
 }
}
export function assertThemePalette(computed,theme,tokens){
 assert.ok(theme==='light'||theme==='dark');const palette=tokens[theme];
 assert.equal(computed.color,rgb(palette.text),'adopted R3 text role');
 assert.equal(computed.candidateColor,rgb(palette.text),'actual candidate text role');
 assert.equal(computed.surface,rgb(palette.surface),'adopted R3 panel surface');
}
export function assertComputed(computed,theme,tokens){
 assertThemePalette(computed,theme,tokens);const palette=tokens[theme],type=tokens.typography;
 for(const [variable,key] of Object.entries({'--line':'border','--hover':'hover','--active':'active','--focus':'brand','--panel':'surface','--muted':'muted','--inserted':'inserted_surface','--inserted-text':'inserted_text'}))assert.equal(opaqueHex(computed.variables[variable]),opaqueHex(palette[key]),variable);
 near(computed.fontSize,type.candidate_and_capsule_font_size,'candidate font');near(computed.lineHeight,type.candidate_line_height,'candidate line height');near(computed.headerFontSize,type.header_font_size,'header font');
 near(computed.headerHeight,tokens.geometry.header_height,'header height');
 for(const h of computed.rowHeights)near(h,tokens.geometry.candidate_row_height,'candidate row height');
 assert.ok(computed.rowHeights.length>0,'nonempty candidate geometry');
 assert.deepEqual(computed.radii,tokens.geometry.board_radii,'all four shared-skin corners');assert.equal(computed.border,rgb(palette.border));
}
export function assertEntryComputed(computed,theme,tokens){
 const palette=tokens[theme];assert.ok(palette);
 for(const [variable,key] of Object.entries({'--brand':'brand','--surface':'surface','--line':'border','--hover':'hover','--active':'active','--muted':'muted'}))assert.equal(opaqueHex(computed[variable]),opaqueHex(palette[key]),'actual entry '+variable);
}
export function measuredCrop(screen,padding=24){
 const boxes=[screen.orb,screen.card].filter(Boolean),v=screen.viewport;
 assert.ok(boxes.length&&boxes.every(b=>inside(b,v)),'crop requires complete measured surfaces');
 assert.ok(Number.isFinite(padding)&&padding>=0);
 const x=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.x))-padding)),y=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.y))-padding));
 const right=Math.min(v.width,Math.ceil(Math.max(...boxes.map(b=>b.x+b.width))+padding)),bottom=Math.min(v.height,Math.ceil(Math.max(...boxes.map(b=>b.y+b.height))+padding));
 return {x,y,width:right-x,height:bottom-y};
}
export function assertCapsuleReceipt(value){
 assert.ok(value&&['light','dark'].includes(value.theme));
 const {capsule,use,anchor}=value;
 for(const box of [capsule,use,anchor])assert.ok(box&&['x','y','width','height'].every(key=>Number.isFinite(box[key])));
 near(capsule.width,272,'R3 capsule width');near(capsule.height,48,'R3 capsule height');
 near(use.width,224,'R3 text partition');near(use.height,48,'R3 text height');
 near(anchor.width,48,'R3 control width');near(anchor.height,48,'R3 control height');
 near(capsule.x+272,anchor.x+48,'capsule fixed right');near(capsule.y+48,anchor.y+48,'capsule fixed bottom');
 near(use.x,capsule.x,'text left edge');near(use.x+224,anchor.x,'separate original control');near(use.y,capsule.y,'text top edge');
 assert.deepEqual(value.hitCorners,[true,true,true,true]);assert.equal(value.insertion,'VERIFIED_FULL_TEXT');
 assert.equal(value.send,0);assert.equal(value.enter,0);assert.equal(value.privateFrameRetained,true);
}
export function assertCompleteReceipts(source,release,expected=STATES){
 assert.ok(expected.length&&expected.every(n=>STATES.includes(n))&&new Set(expected).size===expected.length,'explicit nonempty state inventory');
 for(const receipt of [source,release]){
  assert.equal(receipt.capture,'PASS');assert.equal(receipt.authority?.contract,CONTRACT);
  assert.equal(receipt.ownerAcceptance,'PENDING');assert.equal(receipt.realChatGPT,'DEFERRED_EXTERNAL_EVIDENCE');
  assert.deepEqual(receipt.screens.map(s=>s.name),expected,'every selected state exactly once');
  const themes=expected.filter(name=>name.startsWith('02-')||name.startsWith('06-')).map(name=>name.startsWith('06-')?'dark':'light');
  assert.deepEqual(receipt.capsules?.map(value=>value.theme),themes,'ordinary R3 light/dark capsules accompany their selected board states');
  for(const capsule of receipt.capsules)assertCapsuleReceipt(capsule);
  assert.deepEqual(Object.keys(receipt.hashes).sort(),[...RUNTIME_FILES].sort(),'all production presentation and SVG files bound');
  assert.ok(Object.values(receipt.hashes).every(s=>/^[a-f0-9]{64}$/.test(s)));
 }
 assert.equal(source.variant,'source');assert.equal(release.variant,'release');assert.equal(source.sha,release.sha);
 assert.deepEqual(source.hashes,release.hashes);assert.deepEqual(source.authority,release.authority);assert.deepEqual(source.screens,release.screens);assert.deepEqual(source.capsules,release.capsules);
 return {complete:expected.length===STATES.length,states:expected.length};
}
export function assertExactPixels(actual,built,label){
 assert.equal(actual.width,built.width,label+' width');assert.equal(actual.height,built.height,label+' height');
 assert.ok(actual.width>0&&actual.height>0);assert.equal(actual.data.length,actual.width*actual.height*4);assert.equal(built.data.length,actual.data.length);
 assert.ok(Buffer.from(actual.data).equals(Buffer.from(built.data)),label+' exact source/release pixel parity');
}
