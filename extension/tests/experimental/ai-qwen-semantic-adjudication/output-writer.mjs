// Private CLI worker. fd 3 is the parent's pinned directory; cwd is this
// process's independent kernel directory anchor. No model, network or env.
import fs from 'node:fs';
import {writeFile, open} from 'node:fs/promises';
import {relative, isAbsolute, sep} from 'node:path';

const [root, target] = process.argv.slice(2);
const failure = code => Object.assign(new Error(code), {code});
const requireThat = (condition, code) => { if (!condition) throw failure(code); };
const within = (parent, path) => {
  const tail = relative(parent, path);
  return tail === '' || (!tail.startsWith('..' + sep) && tail !== '..' && !isAbsolute(tail));
};
let receiptHandle;
const timer = setTimeout(() => process.exit(1), 30000);
try {
  requireThat(process.argv.length === 4 && isAbsolute(root) && isAbsolute(target), 'OUTPUT_INCOMPLETE');
  const pinned = fs.fstatSync(3);
  requireThat(pinned.isDirectory(), 'OUTPUT_CHANGED');
  const sameInode = stat => stat.isDirectory() && stat.dev === pinned.dev && stat.ino === pinned.ino && stat.uid === process.geteuid() && (stat.mode & 0o777) === 0o700;
  const check = () => {
    try {
      // Use the native realpath call, not Node's cached process.cwd().
      const currentPath = fs.realpathSync.native('.');
      requireThat(currentPath === target && !within(root, currentPath), 'OUTPUT_CHANGED');
      const named = fs.lstatSync(target);
      requireThat(!named.isSymbolicLink() && sameInode(named) && sameInode(fs.statSync('.')) && sameInode(fs.fstatSync(3)), 'OUTPUT_CHANGED');
      requireThat(fs.realpathSync.native(target) === target, 'OUTPUT_CHANGED');
    } catch { throw failure('OUTPUT_CHANGED'); }
  };
  const checkFile = name => {
    const file = fs.lstatSync(name);
    requireThat(file.isFile() && !file.isSymbolicLink() && file.uid === process.geteuid() && (file.mode & 0o777) === 0o600, 'OUTPUT_CHANGED');
  };
  check();
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    requireThat(length <= 2 * 1024 * 1024, 'OUTPUT_INCOMPLETE');
    chunks.push(chunk);
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const names = payload.files.map(file => file.name);
  requireThat(JSON.stringify(names) === '["adjudication.json","schema.json","report.json"]' || JSON.stringify(names) === '["report.json"]', 'OUTPUT_INCOMPLETE');
  for (const file of payload.files) {
    check();
    await writeFile(file.name, Buffer.from(file.body, 'base64'), {flag: 'wx', mode: 0o600});
    check();
    checkFile(file.name);
  }
  // Last file, held open through the last check. An observed race invalidates
  // our own receipt inode, without unlinking/replacing any external pathname.
  check();
  receiptHandle = await open('receipt.json', 'wx', 0o600);
  check();
  await receiptHandle.writeFile(Buffer.from(payload.receipt, 'base64'));
  check();
  checkFile('receipt.json');
  process.stdout.write('{"ok":true}\n');
} catch (error) {
  if (receiptHandle) {
    try { await receiptHandle.truncate(0); } catch {}
  }
  const code = error.code === 'OUTPUT_CHANGED' ? error.code : 'OUTPUT_INCOMPLETE';
  process.stderr.write(JSON.stringify({error: code}) + '\n');
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  await receiptHandle?.close();
}
