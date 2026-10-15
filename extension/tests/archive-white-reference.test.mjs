import test from 'node:test';
import assert from 'node:assert/strict';
import {applyArchiveWhiteRoles,archiveWhiteReference} from './harness/archive-white-reference.mjs';
import {whitePalette} from './harness/white-refinement-reference.mjs';
test('IAH white migration changes only declared palette fields, never the saved baseline',()=>{
 const baseline=Object.fromEntries(['.sidebar','#archive-root-header','#archive-navigator','#document-page','#document-body','.library-prose','#unrelated'].map(selector=>[selector,{x:184,y:24,width:272,height:800,font:'retained serif',size:'17px',line:'31.45px',color:'historical color',background:'historical background',padding:'24px',gap:'12px'}]));
 const before=structuredClone(baseline);
 for(const theme of ['light','dark']){
  const actual=applyArchiveWhiteRoles(baseline,theme),p=whitePalette(theme);
  for(const selector of Object.keys(baseline)){
   for(const field of ['x','y','width','height','font','size','line','padding','gap'])assert.equal(actual[selector][field],baseline[selector][field],selector+' '+field);
   assert.equal(actual[selector].color,selector==='#unrelated'?'historical color':selector==='.library-prose'?p.body:p.ink);
   assert.equal(actual[selector].background,['.sidebar','#archive-navigator'].includes(selector)?p.rail:'historical background');
  }
  assert.deepEqual(baseline,before);
 }
 assert.deepEqual(applyArchiveWhiteRoles({}),{});
});
test('Archive uses exact approved neutral rail, prose and title roles, including dark translation',()=>{
 assert.equal(whitePalette('light').rail,'rgb(252, 253, 255)');
 assert.equal(whitePalette('dark').rail,'rgb(28, 35, 45)');
 assert.equal(whitePalette('light').heading,'rgb(36, 45, 59)');
 assert.equal(whitePalette('dark').heading,'rgb(237, 240, 245)');
 assert.equal(whitePalette('light').body,'rgb(52, 59, 69)');
 assert.equal(whitePalette('dark').search,'rgb(36, 46, 59)');
});

test('Archive palette identity binds exact approved original and shared final style',()=>{
 assert.equal(archiveWhiteReference.original.bytes,147177);
 assert.equal(archiveWhiteReference.original.sha256,'d3aff7a30aba8724f005b37f129128d398c35c3cd13e4f0aaf72bd8a2e7e1e18');
 assert.equal(archiveWhiteReference.sharedPaletteExcerptSha256,'f0c6d29015eaff82f42e44f49bd5b618914d1414eb401e78c54e20ca27fec8f3');
});
