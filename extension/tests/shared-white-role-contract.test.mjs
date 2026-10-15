import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {whitePalette} from './harness/white-refinement-reference.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('../ui/app-shell.css');
const rgb=hex=>`rgb(${hex.slice(1).match(/../g).map(x=>parseInt(x,16)).join(', ')})`;
test('shared semantic core roles match the independent approved original in both themes',()=>{
 const start=css.indexOf('/* PAIA-WHITE-UI-1.0'),darkStart=css.indexOf('html[data-paia-theme="dark"] body:is(',start);
 for(const [theme,block] of [['light',css.slice(start,darkStart)],['dark',css.slice(darkStart,css.indexOf('/* Saved preferences',darkStart))]]){
  const values=Object.fromEntries([...block.matchAll(/--([\w-]+):(#[\da-f]{6})(?=;)/g)].map(([,key,value])=>[key,rgb(value)]));
  const expected=whitePalette(theme);
  for(const [token,role] of Object.entries({bg:'paper',surface:'surface',rail:'rail',text:'ink','prose-ink':'body','title-ink':'heading','heading-ink':'title','directory-ink':'chapter',line:'line'}))assert.equal(values[token],expected[role],theme+' '+token);
 }
});
test('real Archive and floating owners receive their semantic roles without changing user settings',()=>{
 assert.match(css,/#workspace-heading,#document-title,#archive-root-heading/);
 assert.match(css,/:is\(#archive-navigator,#archive-reader-navigator-slot\)\{background:var\(--rail\);border-color:var\(--rail-line\)\}/);
 assert.match(css,/:is\(\.reader-selection,\.reader-confirm\[data-confirm-surface\],#info-dialog,#revision-dialog\)\{background:var\(--surface\);border-color:var\(--float-line\);box-shadow:var\(--float-shadow\)\}/);
 assert.match(css,/--on-brand:#1a2028/);assert.match(css,/reader-confirm-actions>button\.primary/);assert.doesNotMatch(css,/reader-confirm-actions>button\.danger\)\{background:var\(--brand\)/);
 assert.match(css,/html:not\(\[style\*="--paia-prose-size"\]\)/);assert.match(css,/html:not\(\[style\*="--paia-prose-width"\]\)/);
 assert.match(read('../ui/scope-search.css'),/background:var\(--search-surface,var\(--soft\)\);color:var\(--search-ink,var\(--text\)\)/);
});
