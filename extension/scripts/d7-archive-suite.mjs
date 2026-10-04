import {D7_BROWSER_SUITES} from '../tests/harness/d7-archive-matrix.mjs';
const files=D7_BROWSER_SUITES[process.argv[2]];
if(!files)throw Error('Unknown D7 browser suite');
process.stdout.write(files.join(' '));
