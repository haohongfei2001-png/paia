import {ArchiveError} from './constants.js';

// Compatibility privacy controls for records made by the retired product.
// Reading status never prunes or creates a row and never returns its counters.
const ROW = 'product-signals:v1';
export class LegacyUsageRecords {
  constructor(store) { this.store = store; }
  row(write, work) { return this.store.run(() => this.store.repository.transaction(write, work, ['meta'])); }
  async status() {
    return this.row(false, async t => {
      const row = await t.get('meta', ROW);
      return {enabled:false, retired:true, hasHistory:!!row, legacyEnabled:row?.enabled === true};
    });
  }
  async settings({enabled} = {}) {
    if (enabled !== false) throw new ArchiveError('FEATURE_UNAVAILABLE');
    return this.row(true, async t => {
      const row = await t.get('meta', ROW);
      if (row) await t.put('meta', {...row, enabled:false});
      return {enabled:false, retired:true};
    });
  }
  async clear() {
    return this.row(true, async t => { await t.delete('meta', ROW); return {ok:true, enabled:false, retired:true}; });
  }
}
