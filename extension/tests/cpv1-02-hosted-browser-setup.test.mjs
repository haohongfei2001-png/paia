import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('full browser gate verifies installed Chrome with the exact shard set and unchanged budgets',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 const job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.match(job,/timeout-minutes: 18/);assert.deepEqual([...job.matchAll(/shard: '(\d\/6)'/g)].map(match=>match[1]),['1/6','2/6','3/6','4/6','5/6','6/6']);
 assert.match(job,/CHROME_PATH=\$CHROME_BIN/);assert.match(job,/xvfb-run -a node scripts\/check-hosted-chrome.mjs/);
 assert.match(job,/apt-get install -y --no-install-recommends fonts-wqy-zenhei/);assert.match(job,/fc-list :lang=zh/);
 assert.match(job,/xvfb-run -a npm run test:browser/);assert.match(job,/PAIA_TEST_CONCURRENCY: '1'/);
 assert.doesNotMatch(job,/playwright install|continue-on-error/);
 const smoke=await readFile(new URL('../scripts/check-hosted-chrome.mjs',import.meta.url),'utf8');
 assert.match(smoke,/executablePath:process.env.CHROME_PATH,headless:false/);assert.match(smoke,/route=>route.abort\(\)/);
 assert.match(smoke,/page.locator\('#latin'\).textContent\(\)/);assert.match(smoke,/CSS.getPlatformFontsForNode/);assert.match(smoke,/font.glyphCount>=4/);
 assert.match(smoke,/finally\{await browser.close\(\)/);
});
