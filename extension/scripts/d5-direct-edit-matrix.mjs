// Whole-file partition of the existing candidate Reader gate. Every source and
// release case stays in its owning file with its original assertion/time bound.
export const directEditCandidateFiles={
 'direct-edit':['tests/cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'],
 'reader-regression':['tests/cpv1-02-4-reader-chrome-e2e.test.mjs','tests/uir-02-archive-search-reader-chrome-e2e.test.mjs','tests/ux-r2-reader-revisit-chrome-e2e.test.mjs']
};
if(process.argv[1]?.endsWith('/d5-direct-edit-matrix.mjs')){
 const files=directEditCandidateFiles[process.argv[2]];if(!files)throw Error('Unknown direct-edit candidate partition');console.log(files.join('\n'));
}
