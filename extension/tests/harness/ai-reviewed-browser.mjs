import assert from 'node:assert/strict';

export async function confirmOrganizeScope(page){
 const dialog=page.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('[data-organize-scope]').waitFor();
 await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();
}
export async function adoptFirstCandidate(page){
 const panel=page.locator('[data-ai-candidate]');await panel.waitFor();
 assert.equal(await page.locator('#ai-reading-body [data-ai-field]').count(),0,'first candidate has no editable Current before adoption');
 const fields=await panel.locator('[data-ai-candidate-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.aiCandidateField));
 for(const field of fields)await panel.locator(`[data-ai-candidate-field="${field}"] input[data-candidate-decision="adopt"]`).check();
 await panel.getByRole('button',{name:'保存这些选择',exact:true}).click();await panel.waitFor({state:'detached'});
}
