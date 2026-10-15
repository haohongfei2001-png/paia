// IAH-1.4 replaces palette, not the historical baseline's layout/type contract.
// Archive original: PAIA_输入档案_白色精修.html, 147177 bytes,
// SHA256 d3aff7a30aba8724f005b37f129128d398c35c3cd13e4f0aaf72bd8a2e7e1e18.
// Its final paia-refinement-palette style is identical to the shared excerpt.
import {whitePalette,whiteReference} from './white-refinement-reference.mjs';
export const archiveWhiteReference=Object.freeze({authority:'PAIA-WHITE-UI-1.0 / IAH-1.4',original:{name:'PAIA_输入档案_白色精修.html',bytes:147177,sha256:'d3aff7a30aba8724f005b37f129128d398c35c3cd13e4f0aaf72bd8a2e7e1e18'},sharedPaletteExcerptSha256:whiteReference.excerptSha256});
export function applyArchiveWhiteRoles(baseline,theme='light'){
 const result=structuredClone(baseline),p=whitePalette(theme);
 for(const selector of ['.sidebar','#archive-root-header','#archive-navigator','#document-page','#document-body']){
  if(result[selector])result[selector].color=p.ink;
 }
 for(const selector of ['.sidebar','#archive-navigator'])if(result[selector])result[selector].background=p.rail;
 if(result['.library-prose'])result['.library-prose'].color=p.body;
 return result;
}
