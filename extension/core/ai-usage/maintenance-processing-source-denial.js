// This one-way tag enables extra source-selection prerequisites only. It does
// not authenticate a source, mint raw receipts, or grant any field permission.
// Public registration can only opt a facade into stricter checks; there is no
// removal, replacement, inheritance, or copy-based fallback.
const required=new WeakSet();
export function requireMaintenanceProcessingSelection(processing){
 if(!processing||typeof processing!=='object')throw new TypeError('Processing facade required');
 required.add(processing);return processing;
}
export function needsMaintenanceProcessingSelection(processing){return required.has(processing);}

// The original static installer also retains the exact source context as a
// deny-only lineage. Facade copies/wrappers cannot silently fall back to body
// reads before the real producer rejects their missing original identity.
const contexts=new WeakSet();
export function requireMaintenanceProcessingContext(context){
 if(!context||typeof context!=='object')throw new TypeError('Source context required');
 contexts.add(context);return context;
}
export function needsMaintenanceProcessingContext(context){return contexts.has(context);}
