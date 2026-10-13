import test from 'node:test';
import assert from 'node:assert/strict';
import {ContextCardsPage} from '../ui/context-cards.js';
const owner=flush=>Object.assign(Object.create(ContextCardsPage.prototype),{active:true,openGeneration:3,flush});
test('scope preview refuses IME/save failure through original editor flush',async()=>{const page=owner(async()=>false);assert.equal(await page.openScopePreview(),false);assert.equal(page.scopePreview,undefined);assert.equal(page.previewOpening,false);});
test('navigation during flush cannot open old scope preview',async()=>{let release;const page=owner(()=>new Promise(r=>release=r));const pending=page.openScopePreview();page.openGeneration++;release(true);assert.equal(await pending,false);assert.equal(page.scopePreview,undefined);assert.equal(page.previewOpening,false);});
test('scope entry single flight never duplicates a pending editor flush',async()=>{let release,calls=0;const page=owner(()=>{calls++;return new Promise(r=>release=r);});const pending=page.openScopePreview();assert.equal(await page.openScopePreview(),false);page.active=false;release(true);assert.equal(await pending,false);assert.equal(calls,1);});
