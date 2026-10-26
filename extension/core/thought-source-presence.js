// Original Source existence semantics. The caller owns the transaction and
// its read permissions; this function neither acquires nor returns authority.
export async function sourcePresent(t,ids){for(const id of ids||[]){const r=await t.get('recordIndex',id);if(!r||!await t.get('records',id)||await t.get('tombstones','source:'+r.sourceKey)||await t.get('tombstones','snapshot:'+r.dedupeKey))return false;}return true;}
