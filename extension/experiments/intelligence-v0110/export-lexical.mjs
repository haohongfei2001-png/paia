import {intelligenceDataset} from './dataset.mjs';import {rankCandidate,compareCandidates} from '../../../paia-ai-context-v0101/core/memory/retrieval.js';import {writeFileSync} from 'node:fs';
const data=intelligenceDataset(),es=data.entries.filter(e=>e.eligible),rankings={};
for(const q of data.queries)rankings[q.id]=es.map(e=>rankCandidate(e,q.query)).filter(e=>e.score>0).sort(compareCandidates).slice(0,100).map(e=>({id:e.id,exact:e.score>=100}));
writeFileSync('work/intelligence-v0110/lexical-rankings.json',JSON.stringify(rankings));
