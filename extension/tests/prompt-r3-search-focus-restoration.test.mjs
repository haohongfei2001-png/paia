import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Source contract only: no rendered cascade, keyboard or native acceptance.
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [css,adopted]=await Promise.all([
 read('../ui/prompt-surface.css'),
 read('../docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18/component.css')
]);

test('R3 search retains its themed input focus ring without a second wrapper ring',()=>{
 assert.match(adopted,/\.paia input:focus-visible[^{}]*\{outline:2px solid var\(--focus\)/);
 assert.match(adopted,/\.paia \.ps-query \{[^}]*border:0;outline:none;/);
 assert.match(css,/button:focus-visible,textarea:focus-visible,input:focus-visible\{outline:2px solid var\(--focus\);outline-offset:-2px\}/);
 const singleRing=source=>assert.doesNotMatch(source,/#search-bar:focus-within\s*\{/,'the noninteractive wrapper must not add a focus ring');
 singleRing(css);
 assert.throws(()=>singleRing(css+'\n#search-bar:focus-within{outline:1px solid var(--focus)}'));
 assert.match(css,/header #search-query\{border:0;/,'search input remains borderless');
 assert.match(css,/:root\{[^}]*--focus:#657999;/);
 assert.match(css,/:root\[data-paia-theme=dark\]\{[^}]*--focus:#a4b8d8;/);
 assert.match(css,/@media\(prefers-color-scheme:dark\)\{:root:not\(\[data-paia-theme\]\)\{[^}]*--focus:#a4b8d8;/);
 assert.match(css,/@media\(forced-colors:active\)\{[^{}]*\{[^}]*--focus:Highlight;/);
 assert.match(css,/@media\(pointer:coarse\)\{[^\n]*header #search-query\{height:44px;min-height:44px\}/);
});
