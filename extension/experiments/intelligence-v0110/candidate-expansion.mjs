// Rejected R&D unless frozen quality gates pass. No project-specific synonyms.
import * as base from '../../../paia-ai-context-v0101/core/memory/retrieval.js';
export const compareCandidates=base.compareCandidates,semanticState=base.semanticState;
const abbreviations=[[/\bCI\b/gi,'持续集成'],[/\bAPI\b/gi,'应用程序接口'],[/\bUI\b/gi,'用户界面'],[/\bUX\b/gi,'用户体验'],[/\bCPU\b/gi,'中央处理器'],[/\bGPU\b/gi,'图形处理器']];
const expand=q=>abbreviations.reduce((s,[re,v])=>s.replace(re,v),q).replace(/[，。！？,!?]/g,' ');
export function rankCandidate(e,q){const original=base.rankCandidate(e,q),extra=base.rankCandidate(e,expand(q));return {...original,score:Math.max(original.score,extra.score*.7)};}
export function assemble(es,o){return base.assemble(es.map(e=>({...e,relatedScore:rankCandidate(e,o.query||'').score})),o);}
