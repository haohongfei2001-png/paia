import './diagnostics-schema.js';
import { ADAPTER_VERSION, STATUS_CODES } from './constants.js';
export const { SUMMARY_FIELDS, ROW_FIELDS, MAX_ROWS, MAX_COUNT, emptyStructure, emptyRow, sanitizeStructure } = globalThis.ArchiveDiagnostics;

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, MAX_COUNT) : 0; }
export function sanitizeDiagnostics(value = {}) {
  const structure = sanitizeStructure(value.structure);
  return {
    status: STATUS_CODES.has(value.status) ? value.status : 'CAPTURE_FAILED',
    adapterVersion: ADAPTER_VERSION,
    lastScanAt: timestamp(value.lastScanAt), lastSuccessAt: timestamp(value.lastSuccessAt),
    lastError: STATUS_CODES.has(value.lastError?.code) ? { code: value.lastError.code, at: timestamp(value.lastError.at) } : null,
    scanned: count(value.scanned), added: count(value.added),
    structure, structureAt: structure ? timestamp(value.structureAt) : null
  };
}
