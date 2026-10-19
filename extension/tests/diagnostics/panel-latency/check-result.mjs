import {readFile} from 'node:fs/promises';import {validateEvidence} from './validate-evidence.mjs';
if(process.argv.length!==4)throw Error('Usage: node check-result.mjs /path/to/panel-latency-evidence.json baseline|candidate');
const value=JSON.parse(await readFile(process.argv[2],'utf8'));validateEvidence(value,process.argv[3]);console.log('COMPLETE: 22 expected samples; 2 freshly classified suggestion traces; 2 original retirement controls; privacy/draft/Send invariants passed.');
