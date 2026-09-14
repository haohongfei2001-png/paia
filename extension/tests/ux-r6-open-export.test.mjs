import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture} from './harness/original-complete.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported} from './harness/backup-v081.mjs';
import {buildOpenExport,buildOpenExportJSON,buildOpenExportMarkdown} from '../core/open-export.js';

const op=()=>crypto.randomUUID();

test('UX-R6 complete open export projects the trusted backup into explicit Source/Input/Thought/AI/history/settings roles',async()=>{
 const f=await completeFixture();await f.runner.wake({userActionId:op()});
 const stream=await exported(new BackupService(f.s,{appVersion:'0.12.0'})),header=stream[0],items=stream.slice(1);
 const data=buildOpenExport({header,items,exportedAt:'2026-09-15T00:00:00.000Z'});
 assert.equal(data.format,'PAIA Open Export');assert.equal(data.privacy.credentialsIncluded,false);assert.equal(data.privacy.encrypted,false);
 assert.ok(data.roles.source.sections.sources?.length>0,'Source Records are explicit');
 assert.ok(data.roles.input.sections.inputs?.length>0,'Input Archive is explicit');
 assert.ok(data.roles.thought.sections.entries?.length>0,'Thought Library is explicit');
 assert.ok(data.roles.history.sections.revisions?.length>0,'version history is explicit');
 assert.ok(data.roles.settings.sections.settings?.length===1,'portable settings are explicit');
 assert.equal(data.itemCount,items.filter(x=>x.type==='item').length);
 const json=buildOpenExportJSON({header,items,exportedAt:'2026-09-15T00:00:00.000Z'}),markdown=buildOpenExportMarkdown({header,items,exportedAt:'2026-09-15T00:00:00.000Z'});
 assert.doesNotMatch(json,/synthetic-test-key|apiKey|credentials/i);assert.doesNotMatch(markdown,/synthetic-test-key|apiKey|credentialsIncluded[^\n]*true/i);
 assert.match(markdown,/Source Records/);assert.match(markdown,/Input Archive/);assert.match(markdown,/Thought Library/);
});

test('UX-R6 open export fails closed if an unexpected secret-shaped field crosses the backup boundary',()=>{
 const header={format:'PAIA Backup',formatVersion:1,schemaVersion:5,appVersion:'0.12.0',createdAt:'2026-09-15T00:00:00.000Z'};
 assert.throws(()=>buildOpenExport({header,items:[{type:'item',section:'settings',value:{id:'preferences',apiKey:'must-not-export'}}],exportedAt:'2026-09-15T00:00:00.000Z'}),/OPEN_EXPORT_SECRET_FIELD/);
});
