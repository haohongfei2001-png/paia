import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
for(const name of ['paia-certification.yml','paia-prompt-reuse.yml'])test(name+' installs the real locked offline service import closure before unchanged unit shards',async()=>{
 const source=await readFile(new URL('../../.github/workflows/'+name,import.meta.url),'utf8');
 const block='      - name: Install locked offline service test imports\n        working-directory: services/ai-gateway\n        run: npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org\n';
 assert.equal(source.split(block).length,2);const unit=source.split('\n  unit:\n')[1].split(/\n  [a-z_]+:\n/)[0];
 assert.ok(unit.includes(block));assert.ok(unit.indexOf(block)<unit.indexOf('npm run test:unit'));assert.match(unit,/shard: \['1\/4','2\/4','3\/4','4\/4'\]/);assert.match(source,/permissions:\n  contents: read/);
 const pkg=JSON.parse(await readFile(new URL('../../services/ai-gateway/package.json',import.meta.url),'utf8')),lock=JSON.parse(await readFile(new URL('../../services/ai-gateway/package-lock.json',import.meta.url),'utf8'));
 assert.equal(lock.packages[''].dependencies.pg,pkg.dependencies.pg);assert.ok(lock.packages['node_modules/pg'].integrity);assert.match(lock.packages['node_modules/pg'].resolved,/^https:\/\/registry\.npmjs\.org\//);
});
