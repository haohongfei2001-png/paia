// Internal bounded wire primitives shared by the dormant usage decoders.
// No transport, persistent bodies, qualification or financial authority.
const encoder = new TextEncoder();
const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
const intrinsic = name => Object.getOwnPropertyDescriptor(typedArray, name).get;
const byteLength = intrinsic('byteLength'), byteOffset = intrinsic('byteOffset'), bufferOf = intrinsic('buffer');
const arrayType = intrinsic(Symbol.toStringTag);

export function parseQwenWireJson(text, limits, budget, fail, reasons) {
 let at = 0;
 const invalid = () => fail('INVALID', reasons.json);
 const bound = () => fail('UNKNOWN', 'TRANSPORT_BOUND');
 const space = () => { while (/[\x20\t\r\n]/.test(text[at] || '\0')) at++; };
 const key = () => { if (++budget.keys > limits.maxKeys) bound(); };
 function string() {
  const start = at++;
  while (at < text.length) {
   const char = text[at++];
   if (char === '\\') { at++; continue; }
   if (char !== '"') continue;
   let value;
   try { value = JSON.parse(text.slice(start, at)); } catch { invalid(); }
   if (encoder.encode(value).length > limits.maxStringBytes) bound();
   return value;
  }
  invalid();
 }
 function value(depth) {
  if (depth > limits.maxDepth) bound();
  space();
  if (text[at] === '"') return string();
  if (text[at] === '{') {
   at++; space(); const out = Object.create(null);
   if (text[at] === '}') { at++; return out; }
   for (;;) {
    if (text[at] !== '"') invalid();
    key(); const name = string();
    if (Object.hasOwn(out, name)) fail('INVALID', reasons.duplicate);
    space(); if (text[at++] !== ':') invalid();
    out[name] = value(depth + 1); space();
    if (text[at] === '}') { at++; return out; }
    if (text[at++] !== ',') invalid();
    space();
   }
  }
  if (text[at] === '[') {
   at++; space(); const out = []; key(); // array length also consumes a key
   if (text[at] === ']') { at++; return out; }
   for (;;) {
    key(); out.push(value(depth + 1)); space();
    if (text[at] === ']') { at++; return out; }
    if (text[at++] !== ',') invalid();
   }
  }
  for (const [word, result] of [['true', true], ['false', false], ['null', null]]) {
   if (text.startsWith(word, at)) { at += word.length; return result; }
  }
  const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(at));
  if (!number) invalid();
  at += number[0].length; const out = Number(number[0]);
  if (!Number.isFinite(out)) invalid();
  return out;
 }
 const out = value(0); space(); if (at !== text.length) invalid(); return out;
}


// Intrinsic slots only; never invoke caller/subclass length, offset or buffer.
export function qwenWireChunk(chunk, fail, reason) {
 let size, buffer, offset;
 try {
  if (arrayType.call(chunk) !== 'Uint8Array') fail('INVALID', reason);
  size = byteLength.call(chunk); buffer = bufferOf.call(chunk); offset = byteOffset.call(chunk);
  if (!(buffer instanceof ArrayBuffer)) fail('INVALID', reason);
 } catch { fail('INVALID', reason); }
 return {size, buffer, offset};
}
