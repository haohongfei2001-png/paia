import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const names=(await readdir('tests'))
  .filter(name=>/^uir-\d+-.*-chrome-e2e\.test\.mjs$/.test(name))
  .sort();
if(!names.length)throw Error('No current UIR browser tests found');
const files=names.map(name=>'tests/'+name);
console.log(`PAIA UI Refresh development browser gate: ${files.length} files`);
const tests=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{stdio:'inherit'});
process.exit(tests.status??1);
