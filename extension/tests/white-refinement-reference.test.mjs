import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {whitePalette,whiteReference} from './harness/white-refinement-reference.mjs';
import {thoughtRootLayout,thoughtPalette} from './harness/d7-thought-reference.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('white oracle preserves exact approved source and independent excerpt identities',()=>{
 assert.equal(whiteReference.original.bytes,95286);assert.match(read('../docs/consumer-product-v1/WHITE_REFINEMENT_REFERENCES_2026-10-13.md'),new RegExp(whiteReference.original.sha256));
 for(const fixture of [whiteReference,JSON.parse(read('./fixtures/white-refinement/root-reference.json'))])assert.equal(createHash('sha256').update(fixture.excerpt).digest('hex'),fixture.excerptSha256);
 const {excerpt}=JSON.parse(read('./fixtures/white-refinement/root-reference.json'));
 for(const rule of ['padding:57px 62px 80px','@media(max-width:1250px)','padding:45px 34px 75px','@media(max-width:1000px)','padding:36px 28px 74px','@media(max-width:760px)','padding:31px 22px 88px','@media(max-width:530px)','padding:28px 16px 90px','@media(min-width:1001px){.app{padding-top:46px}'])assert.ok(excerpt.includes(rule),rule);
 assert.doesNotMatch(whiteReference.excerpt,/<script|fetch\(|localStorage/);
});
test('final white and dark roles include the last footer override and distinct neutral surfaces',()=>{
 assert.equal(whitePalette('light').heading,'rgb(36, 45, 59)');assert.equal(whitePalette('light').title,'rgb(43, 53, 67)');assert.equal(whitePalette('light').chapter,'rgb(82, 94, 109)');
 assert.equal(whitePalette('dark').paper,'rgb(26, 32, 40)');assert.equal(whitePalette('dark').surface,'rgb(32, 39, 49)');assert.equal(whitePalette('dark').body,'rgb(215, 221, 229)');
 assert.equal(thoughtPalette('light').continuation,'rgb(104, 115, 129)');assert.ok(whiteReference.excerpt.includes('.card-footer .open-topic){color:#687381}'));
 assert.equal(thoughtPalette('dark').quiet,'rgb(169, 182, 199)');
});
test('Root content follows independent original viewport rules while rail retains AppShell geometry',()=>{
 for(const [width,rail,gutter,top,headingSize,titleSize,columns]of [[1440,184,62,46,34,17,3],[1280,184,62,46,34,17,3],[1024,160,34,46,34,15,3],[768,64,28,36,30,15,2],[390,0,16,28,26,16,1],[320,0,16,28,26,16,1]])for(const [key,value]of Object.entries({rail,gutter,top,headingSize,titleSize,columns}))assert.equal(thoughtRootLayout(width)[key],value,`${width} ${key}`);
});
test('native columns follow CSS media and retain the entire twelve-cell and text-collision proof',()=>{
 const source=read('../ui/personal-topic-root.js');assert.match(source,/getComputedStyle\(this.host\).getPropertyValue\('--topic-root-columns'\)/);assert.doesNotMatch(source,/setProperty\('--topic-root-columns'/);
 const css=read('../ui/personal-topic-root.css');assert.match(css,/@media\(max-width:1000px\).*--topic-root-columns:2/);assert.match(css,/@media\(max-width:530px\).*--topic-root-columns:1/);
 const native=read('./harness/d5-thought-root.mjs');for(const proof of ['each source/release run captures twelve distinct native cells','actual Range text geometry','clipped-Section','neighbour-label-collision','same overflow owner'])assert.ok(native.includes(proof),proof);
});
