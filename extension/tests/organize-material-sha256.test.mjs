import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Exercise the exact private implementation from its original owner without a
// production export, alternate issuer, or public raw-material test interface.
const source=await readFile(new URL('../background/organize-processing-policy.js',import.meta.url),'utf8'),start=source.indexOf('const materialSHA256K='),end=source.indexOf('export function sealOriginalOrganizeMaterialProof(',start);
assert.ok(start>=0&&end>start);
const {materialSHA256,materialFingerprintParts}=vm.runInNewContext(source.slice(start,end)+';({materialSHA256,materialFingerprintParts})',{TextEncoder,need:value=>assert.ok(value)});
const web=async text=>Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');
const sha=parts=>{let charged=0;const digest=materialSHA256(parts,bytes=>{assert.ok(Number.isSafeInteger(bytes)&&bytes>=0);charged+=bytes;});return {digest,charged};};
const chunk=(text,size)=>Array.from({length:Math.ceil(text.length/size)},(_,i)=>text.slice(i*size,(i+1)*size));
const grouped=tuples=>{const tables=new Map();for(const [table,key,field,value]of tuples){if(!tables.has(table))tables.set(table,new Map());const rows=tables.get(table);if(!rows.has(key))rows.set(key,new Map());assert.equal(rows.get(key).has(field),false);rows.get(key).set(field,value);}return tables;};
const canonicalGrouped=tuples=>[...grouped(tuples)].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([table,rows])=>[table,[...rows].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,fields])=>[key,[...fields].sort(([a],[b])=>a<b?-1:a>b?1:0)])]);

for(const [name,text,expected]of [
 ['empty','','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
 ['abc','abc','ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
 ['multi-block','abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq','248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
 ['million-a','a'.repeat(1000000),'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0']
])test('original private synchronous SHA-256 standard vector: '+name,async()=>{
 for(const parts of [[text],chunk(text,63),chunk(text,128)]){const actual=sha(parts);assert.equal(actual.digest,expected);assert.equal(actual.digest,await web(text));assert.equal(actual.charged,new TextEncoder().encode(text).length);}
});

test('SHA-256 padding, block, and partition boundaries match native WebCrypto',async()=>{
 for(let length=0;length<=260;length++){const value='x'.repeat(length);for(const size of [1,7,55,56,63,64,65]){const actual=sha(chunk(value,size));assert.equal(actual.digest,await web(value),'length '+length+', chunk '+size);assert.equal(actual.charged,length);}}
});

test('actual canonical field tuple bytes preserve Unicode, surrogates, null and escaping',async()=>{
 for(const value of ['',null,'null','汉字 👩🏽‍💻 e\u0301','é','e\u0301','\ud800','\udfff','\ud83d\ude00','\u0000\n\r\t"\\\u2028\u2029','𐐀'.repeat(10000)]){
  const fields=[['records','record-id','originalText',value]],canonical=JSON.stringify(canonicalGrouped(fields)),actual=sha(materialFingerprintParts(grouped(fields)));assert.equal(actual.digest,await web(canonical));assert.equal(actual.charged,new TextEncoder().encode(canonical).length);
 }
});

test('canonical table, row, field, type, missing/null and value boundaries cannot alias',async()=>{
 const samples=[[],[['blocks','id','note',null]],[['blocks','id','note','']],[['blocks','id','note','null']],[['blocks','id','note','a'],['blocks','id','libraryText','b']],[['blocks','id','note','a,b']],[['records','id','note','a']],[['blocks','other-id','note','a']],[['blocks','id','libraryText','a']],[['blocks','id','note','a']],[['blocks','id','note',false]],[['blocks','id','note','false']]],digests=[];
 for(const fields of samples){const actual=sha(materialFingerprintParts(grouped(fields)));assert.equal(actual.digest,await web(JSON.stringify(canonicalGrouped(fields))));digests.push(actual.digest);}assert.equal(new Set(digests).size,samples.length);
 const a=[['thoughts','id','note','A'],['thoughts','id','title','B']],b=[...a].reverse();assert.equal(sha(materialFingerprintParts(grouped(a))).digest,sha(materialFingerprintParts(grouped(b))).digest,'canonical encoding ignores field insertion order');assert.notEqual(sha(materialFingerprintParts(grouped(a))).digest,sha(materialFingerprintParts(grouped(a.map(([table,key,field,value])=>[table,key,field,value==='A'?'B':'A'])))).digest,'swapping actual field values changes identity');
});

test('fingerprint input charge failure terminates hashing without returning a digest',()=>{
 let calls=0;assert.throws(()=>materialSHA256(materialFingerprintParts(grouped([['records','id','originalText','SYNTHETIC']])),()=>{if(++calls===2)throw Error('ORIGINAL_BUDGET_DENIED');}),/ORIGINAL_BUDGET_DENIED/);assert.equal(calls,2);
});

test('actual collector insertion charges equal the complete grouped canonical representation in every insertion order',async()=>{
 const start=source.indexOf('function recordMaterialField('),end=source.indexOf('export function beginOriginalOrganizeMaterialRead(',start),tuples=[['records','"漢字','originalText','😀 and \\'],['thoughts','row-two','note',null],['thoughts','row-one','title','A'],['thoughts','row-one','thoughtText','B'],['thoughts','row-one','userEdited',false],['blocks','row-three','note','']];assert.ok(start>=0&&end>start);
 for(let rotation=0;rotation<tuples.length;rotation++)for(const reverse of [false,true]){
  let charge=2;const record=vm.runInNewContext(source.slice(start,end)+';recordMaterialField',{TextEncoder,need:value=>assert.ok(value),chargeOriginalOrganizeWork:(...args)=>{charge+=args.at(-1).bytes;}}),state={active:true,materialFields:new Map(),record:{}},ordered=[...tuples.slice(rotation),...tuples.slice(0,rotation)];if(reverse)ordered.reverse();
  for(const tuple of ordered)record(state,...tuple);const expected=JSON.stringify(canonicalGrouped(tuples));assert.equal(charge,new TextEncoder().encode(expected).length);assert.equal(sha(materialFingerprintParts(state.materialFields)).digest,await web(expected));const before=charge;for(const tuple of ordered)record(state,...tuple);assert.equal(charge,before,'repeated exact values retain nothing new');assert.throws(()=>record(state,'thoughts','row-one','title','DIFFERENT'));assert.equal(charge,before);
 }
});

test('a collector charge failure cannot retain a partially admitted field or invoke nonprimitive value coercion',()=>{
 const start=source.indexOf('function recordMaterialField('),end=source.indexOf('export function beginOriginalOrganizeMaterialRead(',start);let denied=false,traps=0;const record=vm.runInNewContext(source.slice(start,end)+';recordMaterialField',{TextEncoder,need:value=>assert.ok(value),chargeOriginalOrganizeWork:()=>{if(denied)throw Error('ORIGINAL_BUDGET_DENIED');}}),state={active:true,materialFields:new Map(),record:{}};
 record(state,'thoughts','row','note','SYNTHETIC accepted');const before=sha(materialFingerprintParts(state.materialFields)).digest;denied=true;assert.throws(()=>record(state,'records','other-row','originalText','SYNTHETIC refused'),/ORIGINAL_BUDGET_DENIED/);assert.equal(sha(materialFingerprintParts(state.materialFields)).digest,before);assert.throws(()=>record(state,'thoughts','row','title',{toJSON(){traps++;return 'forbidden';},toString(){traps++;return 'forbidden';}}));assert.equal(traps,0);
});
