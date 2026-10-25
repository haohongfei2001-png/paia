import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../ui/settings-preferences.css',import.meta.url),'utf8');
const rule=selector=>css.split('\n').find(line=>line.startsWith(selector+'{'));
const roles=[
 ['#settings-panel .ux-settings-group>h2','22px/1.455'],
 ['.ux-settings-detail-dialog h2','24px/1.5'],
 ['#settings-next-consent h2','22px/1.455'],
 ['#settings-capture-consent h2','22px/1.455'],
 [':is(#settings-assist-consent,#settings-maintenance-consent)>h2','22px/1.455']
];
test('actual Settings group and consent heading rules use current shared sans role',()=>{
 for(const [selector,metrics]of roles){const value=rule(selector);assert.ok(value,selector);assert.ok(value.includes('font:500 '+metrics+' var(--font)'),selector);assert.ok(!value.includes('var(--title-font)'),selector);}
});
test('correction leaves independent reader and import title owners and global tokens unchanged',()=>{
 assert.ok(rule('.reader-confirm:has(.reader-conflict-comparison)>h2').includes('var(--title-font)'));
 assert.ok(rule('#history-dialog #history-title').includes('var(--title-font)'));
 assert.doesNotMatch(css,/--title-font\s*:/);
});
test('heading reflow and scoped consent sizing remain original',()=>{
 assert.ok(rule('.ux-settings-detail-dialog h2').includes('min-width:0'));
 assert.ok(rule('.ux-settings-detail-dialog h2').includes('overflow-wrap:anywhere'));
 assert.ok(rule(':is(#settings-assist-consent,#settings-maintenance-consent)>h2').includes('margin:0 0 20px'));
 assert.match(css,/:is\(#settings-assist-consent,#settings-maintenance-consent\).*min-height:44px/);
});
