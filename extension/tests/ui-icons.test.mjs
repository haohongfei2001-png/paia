import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createIcon,setIconLabel,setIconOnly,iconNames} from '../ui/icons.js';
import {PresentationNode} from './harness/presentation-dom.mjs';
const withDOM=run=>{const old=globalThis.document;globalThis.document={createElement:tag=>new PresentationNode(tag),createElementNS:(ns,tag)=>new PresentationNode(tag,ns)};try{return run();}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}};

test('decorative SVGs add no accessible name, focus stop or pointer target',()=>withDOM(()=>{
 for(const name of iconNames){const icon=createIcon(name);assert.equal(icon.namespaceURI,'http://www.w3.org/2000/svg');assert.equal(icon.getAttribute('aria-hidden'),'true');assert.equal(icon.getAttribute('focusable'),'false');assert.equal(icon.getAttribute('pointer-events'),'none');assert.equal(icon.textContent,'');assert.equal(icon.getAttribute('viewBox'),'0 0 18 18');assert.equal(icon.getAttribute('stroke-width'),'1.4');assert.ok(icon.children.length>0);}
 assert.throws(()=>createIcon('not-an-icon'),/UNKNOWN_PAIA_ICON/);
}));
test('repeated locale labels retain the original control, state, handler and literal text',()=>withDOM(()=>{
 const control=new PresentationNode('button'),click=()=>{};control.id='same-control';control.disabled=true;control.hidden=true;control.setAttribute('aria-expanded','false');control.addEventListener('click',click);
 for(const [icon,text]of [['back','返回 👩‍💻'],['back','Back'],['more','<script>literal & text</script>']]){const label=setIconLabel(control,icon,text);assert.equal(control.children.length,2);assert.equal(label.textContent,text);assert.equal(control.textContent,text);assert.equal(control.id,'same-control');assert.equal(control.disabled,true);assert.equal(control.hidden,true);assert.equal(control.getAttribute('aria-expanded'),'false');assert.equal(control.listeners.get('click'),click);assert.equal(label.firstChild.nodeType,3);}
}));
test('icon-only controls require their own accessible label and keep it on refresh',()=>withDOM(()=>{
 const control=new PresentationNode('button');assert.throws(()=>setIconOnly(control,'more'),/PAIA_ICON_ACCESSIBLE_LABEL_REQUIRED/);setIconOnly(control,'more','Input actions');setIconOnly(control,'more');assert.equal(control.getAttribute('aria-label'),'Input actions');assert.equal(control.children.length,1);assert.equal(control.firstChild.getAttribute('aria-hidden'),'true');assert.equal(control.textContent,'');
}));
test('app icons, compact toolbar/favicons and UI marks use their exact approved role and size',async()=>{
 const root='design/brand/soft-blue-p-20261021',brand='PAIA-OPEN-P-SOFT-BLUE-20261021';
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))),proof=JSON.parse(await readFile(new URL('../icons/brand-icons-provenance.json',import.meta.url))),authority=JSON.parse(await readFile(new URL('../../'+root+'/manifest.json',import.meta.url))),hash=b=>createHash('sha256').update(b).digest('hex');
 // Independent adoption digests keep a self-consistent rewritten proof from
 // silently substituting another brand or interchanging the three roles.
 const approved={
  'app-icon-16.png':'44746b2ce726df968671d35c8656c7dfdacc16cd76a6917aaea0a49abbab69bb',
  'app-icon-32.png':'4a24c2666f56e30354852bcb3d98e74508228d9bff6db1d71efa6d7f1ff17768',
  'app-icon-48.png':'af9cf1eba4065294abc3df1286335fd3fa4a6d100cd4130beb4a868c6772787a',
  'app-icon-128.png':'e1cc293d27173a8760982f3e163ad5d0ac95e0e2e07cfa858e3e10213fb80092',
  'ui-symbol-16.png':'2e975d55af7f88b20645daafd49600d4abf6dc9ecd648f3a48969bde97bcb235',
  'ui-symbol-32.png':'b6c86e6de3ce336e98f2d9dd963380c2d71831e9208762cb0170c25fee74d509',
  'ui-symbol-48.png':'f83df176291d072cab163528f02f7e144a957312a9e8d64ff22d9cb6a3ddc5ae',
  'ui-symbol-128.png':'c4a90b2733f0665c761255ed1884ae2953ddd436d70c5d9eb2e3399a460aea65',
  'symbol-32.png':'bcb0338bbe8d3c95fc6e08a6bf9db14be8d4aad307df50da0ad4f2518374b632',
  'symbol-64.png':'aed5ef16d483a7d0be6cd20541909ca059301f101abb66a6acdb0f538e536fa0'
 };
 assert.equal(proof.schema_version,3);assert.equal(authority.schema_version,3);
 assert.equal(proof.brand_id,brand);assert.equal(authority.brand_id,brand);assert.equal(proof.authority_manifest,root+'/manifest.json');
 assert.deepEqual(Object.keys(proof.sources).sort(),Object.keys(approved).map(name=>root+'/png/'+name).sort());
 for(const [name,digest]of Object.entries(approved)){
  const path=root+'/png/'+name,source=proof.sources[path],size=Number(name.match(/-(\d+)\.png$/)[1]),bytes=await readFile(new URL('../../'+path,import.meta.url));
  assert.deepEqual(source,authority.sources[path]);assert.equal(source.sha256,digest);assert.equal(hash(bytes),digest);
  assert.deepEqual(source.dimensions,[size,size]);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[size,size]);
 }
 const sizes=[16,32,48,128],groups={
  outputs:Object.fromEntries(sizes.map(size=>[`extension/icons/icon${size}.png`,['app-icon',size]])),
  action_outputs:Object.fromEntries(sizes.map(size=>[`extension/icons/action${size}.png`,['ui-symbol',size]])),
  ui_outputs:Object.fromEntries([32,64].map(size=>[`extension/ui/assets/paia-logo-${size}.png`,['symbol',size]]))
 };
 assert.deepEqual(Object.keys(manifest.icons).sort(),sizes.map(String).sort());assert.deepEqual(Object.keys(manifest.action.default_icon).sort(),sizes.map(String).sort());
 for(const size of sizes){assert.equal(manifest.icons[size],`icons/icon${size}.png`);assert.equal(manifest.action.default_icon[size],`icons/action${size}.png`);}
 for(const [group,expected]of Object.entries(groups)){
  assert.deepEqual(Object.keys(proof[group]).sort(),Object.keys(expected).sort());
  for(const [path,[role,size]]of Object.entries(expected)){
   const output=proof[group][path],source=root+`/png/${role}-${size}.png`,bytes=await readFile(new URL('../../'+path,import.meta.url));
   assert.equal(output.source,source);assert.deepEqual(output.dimensions,[size,size]);assert.equal(output.sha256,approved[`${role}-${size}.png`]);
   for(const key of ['source','dimensions','sha256'])assert.deepEqual(output[key],authority.targets[path][key]);
   assert.equal(hash(bytes),output.sha256);assert.deepEqual(bytes,await readFile(new URL('../../'+source,import.meta.url)),'each runtime icon uses the exact approved role and size');
   assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[size,size]);
  }
 }
 for(const page of ['archive.html','popup.html'])assert.match(await readFile(new URL('../ui/'+page,import.meta.url),'utf8'),/rel="icon" href="\.\.\/icons\/action32\.png"/);
 await assert.rejects(readFile(new URL('../ui/product-signals.html',import.meta.url)),{code:'ENOENT'});
});
