// Complete fixed dimensions shared by the browser runner and its CI contract.
const widths=[1440,1280,1024,768,320];
export const D7_ARCHIVE_MATRIX=Object.freeze(widths.flatMap(width=>['light','dark'].map(theme=>Object.freeze({id:`A01-${width}-${theme}`,screen:'A01',width,height:1000,theme}))));
export const D7_FULL_MATRIX=Object.freeze([...D7_ARCHIVE_MATRIX,...widths.flatMap(width=>['light','dark'].map(theme=>Object.freeze({id:`A02-${width}-${theme}`,screen:'A02',width,height:1000,theme}))),
 Object.freeze({id:'A02-768-light-text200',screen:'A02',width:768,height:1000,theme:'light',stress:'text200'}),
 Object.freeze({id:'A02-320-light-text200',screen:'A02',width:320,height:1000,theme:'light',stress:'text200'}),
 Object.freeze({id:'A02-320-dark-coarse',screen:'A02',width:320,height:1000,theme:'dark',stress:'coarse'})]);

// Whole files only. The prior four cases remain exactly once; ANS-05 adds its
// complete Navigator owner journey for the contextual heading/disclosure move.
export const D7_BROWSER_SUITES=Object.freeze({
 appearance:Object.freeze(['scripts/verify-d7-archive-reader.mjs']),
 compatibility:Object.freeze(['tests/uir-01-shell-chrome-e2e.test.mjs','tests/cpv1-02-1-shell-chrome-e2e.test.mjs','tests/ans-05-navigator-workspace-chrome-e2e.test.mjs'])
});
