import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {createConfiguredHistoricalCandidateSession} from '../core/ai-usage/configured-historical-session.js';

test('original worker configuration source defaults unavailable, preserving the original free local query',async()=>{
 const f=await setup(OrganizerStore),session=createConfiguredHistoricalCandidateSession(f.s),service=new PromptReuseService(f.s,{historyCandidates:session});
 assert.deepEqual(await service.historicalCandidateStatus(),{available:false});
 await assert.rejects(service.refreshHistoricalCandidates('Synthetic'),{code:'UNAVAILABLE'});
 assert.deepEqual(await service.adoptHistoricalCandidates(null),await service.query());
 const {readFile}=await import('node:fs/promises'),worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');
 assert.match(worker,/historyCandidates:createConfiguredHistoricalCandidateSession\(store\)/);
 assert.doesNotMatch(worker,/new HistoricalCandidateSession\(store\)/);
});
