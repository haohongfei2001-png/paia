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
test('manifest action and favicons use all four approved compact-brand derivatives',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))),proof=JSON.parse(await readFile(new URL('../icons/brand-icons-provenance.json',import.meta.url))),hash=b=>createHash('sha256').update(b).digest('hex');
 for(const [path,source]of Object.entries(proof.sources))assert.equal(hash(await readFile(new URL('../../'+path,import.meta.url))),source.sha256);
 assert.equal(proof.sources['extension/ui/assets/paia-logo-32.png'].sha256,'6e487abdab45de5f5dbec02f2a05098797616e949c409c93082a4e0488194065');
 assert.equal(proof.sources['extension/ui/assets/paia-logo-64.png'].sha256,'8ceeec4a7044006eda727ab25fe420a594ce2abb1c4c428204ed9f653f007863');
 for(const size of [16,32,48,128]){const path=`icons/icon${size}.png`,bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(manifest.icons[size],path);assert.equal(manifest.action.default_icon[size],path);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[size,size]);assert.equal(hash(bytes),proof.outputs['extension/'+path].sha256);}
 for(const page of ['archive.html','popup.html'])assert.match(await readFile(new URL('../ui/'+page,import.meta.url),'utf8'),/rel="icon" href="\.\.\/icons\/icon32\.png"/);
 await assert.rejects(readFile(new URL('../ui/product-signals.html',import.meta.url)),{code:'ENOENT'});
 assert.equal(hash(await readFile(new URL('../ui/assets/paia-logo-32.png',import.meta.url))),'6e487abdab45de5f5dbec02f2a05098797616e949c409c93082a4e0488194065');
 assert.equal(hash(await readFile(new URL('../icons/icon32.png',import.meta.url))),proof.sources['extension/ui/assets/paia-logo-32.png'].sha256,'native32px action icon is the exact existing main-UI mark');
});
