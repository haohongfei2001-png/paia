import assert from 'node:assert/strict';

// UX_CONTRACT reading preferences apply to each body column, not the full
// section grid (which additionally owns the approved category-label column).
export async function assertContextReadingPreferences(page,expectedItems){
 const widths=await page.locator('.context-group-items').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).maxWidth));
 const fonts=await page.locator('.context-item .item-text').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).fontSize));
 assert.ok(Array.isArray(expectedItems),'independent reference supplies expected items');
 assert.equal(widths.length,new Set(expectedItems.map(item=>item.section)).size,'reading column count matches independent reference');
 assert.equal(fonts.length,expectedItems.length,'reading text count matches independent reference');
 const empty=page.locator('.detail-content>.empty-detail');
 assert.equal(await empty.count(),1,'real empty owner is retained');
 assert.equal(await empty.isVisible(),expectedItems.length===0,'empty owner visibility matches independent reference');
 for(const width of widths)assert.equal(width,'680px','every body column retains the selected reading width');
 for(const font of fonts)assert.equal(font,'17px','every editable body retains the selected reading font');
}
