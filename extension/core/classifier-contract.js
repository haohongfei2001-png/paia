// Evaluation-only interface. No provider is registered or invoked by product runtime.
export const SEMANTIC_PROVIDERS=Object.freeze([]);
export async function evaluateSemanticProvider(provider,sample){
 const uncertain={decision:'uncertain',score:null};
 if(typeof provider?.classify!=='function'||typeof sample?.text!=='string')return uncertain;
 try{const r=await provider.classify(structuredClone(sample));if(!r||Object.keys(r).some(k=>!['decision','score'].includes(k))||!['filter','keep','uncertain'].includes(r.decision)||typeof r.score!=='number'||!Number.isFinite(r.score)||r.score<0||r.score>1)return uncertain;return {decision:r.decision,score:r.score};}catch{return uncertain;}
}

// Experimental contract only. A model cannot widen the verified preservation boundary.
// Native semantic spike measurements are separate; there is still no runtime provider.
export async function evaluatePureControlProvider(provider,sample){
 const fallback={pure_control:false,substantive:false,ambiguous:true,confidence:0};
 const {decideLight}=await import('./smart-filter.js');
 const deterministic=decideLight(sample);
 if(deterministic.decision!=='filter')return {...fallback,substantive:deterministic.decision==='keep',ambiguous:deterministic.decision!=='keep'};
 if(typeof provider?.classify!=='function')return fallback;
 try{const r=await provider.classify(structuredClone(sample));if(!r||Object.keys(r).some(k=>!['label','confidence'].includes(k))||!['pure_control','substantive','ambiguous'].includes(r.label)||!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>1)return fallback;return {pure_control:r.label==='pure_control',substantive:r.label==='substantive',ambiguous:r.label==='ambiguous',confidence:r.confidence};}catch{return fallback;}
}
