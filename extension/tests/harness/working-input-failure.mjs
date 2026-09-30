import assert from 'node:assert/strict';

// Abort the real canonical transaction. A message that never reaches the worker
// has an unknown outcome and cannot stand in for a known non-commit failure.
export async function failWorkingInputCommits(h, {once = false} = {}) {
  const worker = h.context.serviceWorkers().find(w => w.url().endsWith('/background/service-worker.js'));
  assert.ok(worker, 'production worker is available');
  await worker.evaluate(({once}) => {
    const put = IDBObjectStore.prototype.put;
    let fail = true;
    globalThis.__restoreWorkingInputPut = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function(value, ...args) {
      if (fail && this.name === 'operationReceipts' && value.namespace === 'working-input') {
        if (once) fail = false;
        throw new DOMException('Synthetic canonical transaction failure', 'UnknownError');
      }
      return put.call(this, value, ...args);
    };
  }, {once});
  return () => worker.evaluate(() => globalThis.__restoreWorkingInputPut());
}
