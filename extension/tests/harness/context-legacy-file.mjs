import {BackupService as LegacyEncoder} from './historical-backup.mjs';

// CTX4 restore tests need a synthetic existing-file envelope for the portable
// Library state, not an export of the later local Context operation ledger.
// Production export remains retired. Keep all portable rows and all validation
// intact; direct nonportable-receipt tests deliberately use LegacyEncoder itself.
export class BackupService extends LegacyEncoder {
 async project(t,section,row){
  if(section==='receipts'&&(row.namespace==='context-cards'||row.id.startsWith('context:')))return null;
  return super.project(t,section,row);
 }
}
