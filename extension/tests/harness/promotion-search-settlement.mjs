// Read only the original search queue/index marker. Never drain, replay or
// suppress owner work, and never read a body to qualify a fixture baseline.
// Self-contained so the same function runs in the extension's native IDB realm.
export async function readPromotionSearchWork(factory = indexedDB, name = 'paia-archive') {
 if (!(await factory.databases()).some(db => db.name === name && db.version > 0)) throw Error('Original promotion fixture database is absent');
 const db = await new Promise((resolve, reject) => {
  const request = factory.open(name);
  request.onupgradeneeded = () => request.transaction.abort();
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
 });
 try {
  const tx = db.transaction(['libraryMigrationItems', 'meta'], 'readonly');
  const read = request => new Promise((resolve, reject) => {
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(request.error);
  });
  const [pendingSearch, rebuild] = await Promise.all([
   read(tx.objectStore('libraryMigrationItems').index('byStatus').count(IDBKeyRange.bound([0, 'search'], [0, 'search', []], false, true))),
   read(tx.objectStore('meta').get('library-search-rebuild'))
  ]);
  return {pendingSearch, rebuildComplete: rebuild?.complete === true};
 } finally { db.close(); }
}
