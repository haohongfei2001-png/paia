import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const path of ['core/local-control-publication.js','core/browser-native-sync/canonical-generation-publication.js','core/browser-native-sync/canonical-generation-repository-gate.js','background/context-connections.js','background/prompt-surface.js'])test(`new accounting dependency root: ${path}`,()=>{const r=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('../'+path,import.meta.url).href)});`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);});
