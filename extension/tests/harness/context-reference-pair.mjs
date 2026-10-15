// The reference and actual targets are independent browser pages. Await both
// even when one fails, so finally cannot close a still-running capture target.
// First-page failure wins deterministically when both pages fail.
export async function runContextReferencePair(reference,actual){
 const results=await Promise.allSettled([Promise.resolve().then(reference),Promise.resolve().then(actual)]);
 for(const result of results)if(result.status==='rejected')throw result.reason;
 return results.map(result=>result.value);
}
