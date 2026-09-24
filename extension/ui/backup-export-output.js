// A user-chosen file keeps only one NDJSON page in memory while exporting.
// The legacy Blob path remains for browsers without File System Access.
export async function openBackupOutput({name, savePicker=globalThis.showSaveFilePicker, download}) {
  if (typeof savePicker === 'function') {
    const handle = await savePicker({
      suggestedName: name,
      types: [{description: 'PAIA Backup', accept: {'application/x-ndjson': ['.paia-backup']}}],
    });
    const writable = await handle.createWritable();
    let bytes = 0, closed = false;
    return {
      mode: 'stream',
      get bytes() { return bytes; },
      async write(text) {
        if (closed) throw new Error('backup output closed');
        await writable.write(text);
        bytes += new TextEncoder().encode(text).length;
      },
      async finish() {
        if (closed) throw new Error('backup output closed');
        await writable.close();
        closed = true;
      },
      async abort() {
        if (closed) return;
        closed = true;
        await writable.abort();
      },
    };
  }
  const parts = [];
  let bytes = 0, closed = false;
  return {
    mode: 'download',
    get bytes() { return bytes; },
    async write(text) {
      if (closed) throw new Error('backup output closed');
      parts.push(text);
      bytes += new TextEncoder().encode(text).length;
    },
    async finish() {
      if (closed) throw new Error('backup output closed');
      closed = true;
      download(parts, name, 'application/x-ndjson');
      parts.length = 0;
    },
    async abort() {
      closed = true;
      parts.length = 0;
    },
  };
}
