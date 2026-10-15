// A horizontal text-selection journey needs an interior pointer path. Merely
// visible text can sit in Chrome's edge-autoscroll zone and select other rows.
// Keep browser autoscroll enabled; position the fixture before native input.
export function centerRootSelectionTarget(node){
 node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
}
export function rootSelectionTargetIsInterior(node){
 const r=node.getBoundingClientRect();
 return r.width>0&&r.height>0&&r.top>=64&&r.bottom<=innerHeight-64;
}
