/* Shared classic-script schema: usable in an isolated content world and modules. */
(() => {
  'use strict';
  const SUMMARY_FIELDS = Object.freeze({
    mainPresent: 'boolean', mainVisible: 'boolean', mainBusy: 'boolean',
    userRoleCount: 'number', visibleUserRoleCount: 'number', validTurnCount: 'number',
    turnMarkerCount: 'number', roleIdPresentCount: 'number', roleIdValidCount: 'number',
    ancestorIdCount: 'number', descendantIdCount: 'number', editorPassedCount: 'number',
    busyPassedCount: 'number', finalCandidateCount: 'number'
  });
  const ROW_FIELDS = Object.freeze({
    turnFound: 'boolean', turnMarkerFound: 'boolean', articleFound: 'boolean',
    idAttributeOnRole: 'boolean', idOnRole: 'boolean', idOnAncestor: 'boolean', idOnDescendant: 'boolean',
    editorCheckAvailable: 'boolean', rootInsideEditor: 'boolean', rootIsContentEditable: 'boolean',
    visibleEditorsInTurn: 'number', visibleInputsInTurn: 'number', visibleTextareasInTurn: 'number',
    visibleEditablesInTurn: 'number', visibleTextboxesInTurn: 'number', editorPassed: 'boolean', busy: 'boolean',
    roleMatchesTextSelector: 'boolean', textMatches: 'number', ownedTextMatches: 'number',
    visibleTextMatches: 'number', unsafeAncestorMatches: 'number', unsafeDescendantMatches: 'number',
    safeTextMatches: 'number', candidateAccepted: 'boolean', duplicateIdentity: 'boolean', staleIdentity: 'boolean'
  });
  const MAX_ROWS = 20;
  const MAX_COUNT = 1000000;
  function blank(fields) {
    return Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, type === 'boolean' ? false : 0]));
  }
  function emptyStructure() { return { schemaVersion: 1, ...blank(SUMMARY_FIELDS), rows: [], rowsTruncated: false }; }
  function emptyRow() { return blank(ROW_FIELDS); }
  function project(value, fields) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const result = {};
    for (const [key, type] of Object.entries(fields)) {
      const entry = value[key];
      if (type === 'boolean') {
        if (typeof entry !== 'boolean') return null;
        result[key] = entry;
      } else {
        if (!Number.isSafeInteger(entry) || entry < 0) return null;
        result[key] = Math.min(entry, MAX_COUNT);
      }
    }
    return result;
  }
  function sanitizeStructure(value) {
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.rows) || typeof value.rowsTruncated !== 'boolean') return null;
    const summary = project(value, SUMMARY_FIELDS);
    if (!summary) return null;
    const rows = [];
    for (const valueRow of value.rows.slice(0, MAX_ROWS)) {
      const row = project(valueRow, ROW_FIELDS);
      if (!row) return null;
      rows.push(row);
    }
    return { schemaVersion: 1, ...summary, rows, rowsTruncated: value.rowsTruncated || value.rows.length > MAX_ROWS };
  }
  globalThis.ArchiveDiagnostics = Object.freeze({ SUMMARY_FIELDS, ROW_FIELDS, MAX_ROWS, MAX_COUNT, emptyStructure, emptyRow, sanitizeStructure });
})();
