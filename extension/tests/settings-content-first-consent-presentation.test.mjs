import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Source-only presentation contracts. These do not claim rendered, native,
// permission-state, or full Settings workflow acceptance.
const css=await readFile(new URL('../ui/settings-preferences.css',import.meta.url),'utf8');
const archive=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8');
const sheets=':is(#settings-assist-consent,#settings-maintenance-consent)';
function rule(selector){
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=css.match(new RegExp('(?:^|[}\\s])'+escaped+'\\s*\\{([^{}]*)\\}'));
 assert.ok(match,`missing scoped presentation rule: ${selector}`);
 return Object.fromEntries(match[1].split(';').filter(Boolean).map(declaration=>{
  const colon=declaration.indexOf(':');return [declaration.slice(0,colon).trim(),declaration.slice(colon+1).trim()];
 }));
}

test('Context destination uses the content-first row floor without routine subtitle',()=>{
 const rows=rule('#settings-panel .ux-setting-row,#settings-panel .ux-preference-setting');
 assert.equal(rows['min-height'],'64px');
 assert.equal(/#settings-context-open[^{}]*\{[^{}]*min-height\s*:\s*85px/.test(css),false);
 assert.equal(rule('#settings-panel #settings-context-open .ux-setting-description').display,'none');
 // The actual capability note is a sibling, not the retired row subtitle.
 assert.match(archive,/<section id="settings-ai-context">[\s\S]*?<\/button><p class="ux-settings-note"/);
 assert.equal(/#settings-ai-context[^{}]*\{[^{}]*display\s*:\s*none/.test(css),false);
});

test('independent Assist and Maintenance permission sheets retain bounded native sheet styling',()=>{
 const sheet=rule(sheets);
 assert.equal(sheet['overscroll-behavior'],'contain');
 assert.equal(sheet['scroll-padding'],'16px');
 assert.equal(rule(sheets+'::backdrop').background,'rgba(23,35,60,.32)');
 const heading=rule(sheets+'>h2');
 assert.equal(heading.font,'500 22px/1.455 var(--title-font)');
 assert.equal(heading.margin,'0 0 20px');
 assert.equal(rule(sheets+'>p')['line-height'],'1.8');
});

test('permission actions wrap with full targets and existing neutral confirmation hierarchy',()=>{
 const actions=rule(sheets+' .ux-settings-consent-actions');
 assert.deepEqual([actions.display,actions['flex-wrap'],actions['justify-content'],actions.gap],['flex','wrap','flex-end','8px']);
 const buttons=rule(sheets+' .ux-settings-consent-actions button');
 assert.equal(buttons['min-height'],'44px');
 assert.equal(buttons['max-width'],'100%');
 assert.equal(buttons['white-space'],'normal');
 assert.equal(buttons['overflow-wrap'],'anywhere');
 assert.equal(buttons.border,'1px solid var(--control)');
 // Both sheet and confirm IDs outrank the generic sheet action rule; a lone
 // confirm ID would lose the cascade to its class-qualified action selector.
 const primary=rule(sheets+' :is(#settings-assist-confirm,#settings-maintenance-confirm)');
 assert.equal(primary.background,'var(--text)');
 assert.equal(primary.color,'var(--bg)');
});

test('existing independent consent owners supply the styled IDs and action regions',async()=>{
 for(const owner of ['assist','maintenance']){
  const source=await readFile(new URL(`../ui/settings-${owner}.js`,import.meta.url),'utf8');
  assert.ok(source.includes(`dialog.id='settings-${owner}-consent'`));
  assert.ok(source.includes("actions.className='ux-settings-consent-actions'"));
  assert.ok(source.includes(`confirm.id='settings-${owner}-confirm'`));
  assert.ok(source.includes(`cancel.id='settings-${owner}-cancel'`));
  assert.ok(source.includes("dialog.className='ux-settings-detail-dialog'"));
 }
});
