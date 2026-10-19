import {readFile} from 'node:fs/promises';import {validateEvidence} from './validate-evidence.mjs';
if(process.argv.length!==3)throw Error('Usage: node check-result.mjs /path/to/panel-latency-evidence.json');
const value=JSON.parse(await readFile(process.argv[2],'utf8'));validateEvidence(value);console.log('COMPLETE: 22 expected samples; 2 freshly classified suggestion traces; privacy/draft/Send invariants passed.');
