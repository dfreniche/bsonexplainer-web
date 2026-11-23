// BSON encoder (https://bsonspec.org/spec.html). No dependencies.
//
// Input: canonical typed tree produced by extjson.js:
//   {t:'doc', entries:[[name, value], ...]}   {t:'array', items:[value, ...]}
//   {t:'double', v}  {t:'string', v}  {t:'bool', v}  {t:'null'}
//   {t:'int32', v}   {t:'int64', v: BigInt}  {t:'date', ms: BigInt}
//   {t:'objectId', hex}  {t:'binary', subtype, bytes: Uint8Array}
//   {t:'regex', pattern, options}  {t:'timestamp', t, i}  {t:'minKey'} {t:'maxKey'}
//
// Output: { bytes: Uint8Array, tree } where `tree` describes every element with
// its byte range, so the UI can show a table and link it to the hex dump.

export const TYPE_CODES = {
  double: 0x01, string: 0x02, doc: 0x03, array: 0x04, binary: 0x05,
  objectId: 0x07, bool: 0x08, date: 0x09, null: 0x0a, regex: 0x0b,
  int32: 0x10, timestamp: 0x11, int64: 0x12, minKey: 0xff, maxKey: 0x7f,
};

export const TYPE_NAMES = {
  double: 'Double', string: 'String', doc: 'Document', array: 'Array',
  binary: 'Binary', objectId: 'ObjectId', bool: 'Boolean', date: 'UTC datetime',
  null: 'Null', regex: 'Regex', int32: 'Int32', timestamp: 'Timestamp',
  int64: 'Int64', minKey: 'MinKey', maxKey: 'MaxKey',
};

const enc = new TextEncoder();

class Writer {
  constructor() {
    this.bytes = [];
  }
  get pos() {
    return this.bytes.length;
  }
  raw(arr) {
    for (const b of arr) this.bytes.push(b);
  }
  u8(b) {
    this.bytes.push(b & 0xff);
  }
  view(size, fn) {
    const dv = new DataView(new ArrayBuffer(size));
    fn(dv);
    this.raw(new Uint8Array(dv.buffer));
  }
  i32(n) {
    this.view(4, (dv) => dv.setInt32(0, n, true));
  }
  patchI32(at, n) {
    const dv = new DataView(new Uint8Array(this.bytes.slice(at, at + 4)).buffer);
    dv.setInt32(0, n, true);
    const arr = new Uint8Array(dv.buffer);
    for (let i = 0; i < 4; i++) this.bytes[at + i] = arr[i];
  }
  cstring(s) {
    const b = enc.encode(s);
    if (b.includes(0)) throw new Error(`Field names and regex fields cannot contain NUL: "${s}"`);
    this.raw(b);
    this.u8(0);
  }
  string(s) {
    const b = enc.encode(s);
    this.i32(b.length + 1);
    this.raw(b);
    this.u8(0);
  }
}

export function encode(root) {
  if (root.t !== 'doc' && root.t !== 'array') {
    throw new Error('A BSON document must be a JSON object or array at the top level');
  }
  const w = new Writer();
  const tree = encodeDocument(w, root);
  return { bytes: Uint8Array.from(w.bytes), tree };
}

function entriesOf(node) {
  return node.t === 'array'
    ? node.items.map((v, i) => [String(i), v])
    : node.entries;
}

function encodeDocument(w, node) {
  const start = w.pos;
  w.i32(0); // size, patched below
  const elements = entriesOf(node).map(([name, value]) => encodeElement(w, name, value));
  const eooStart = w.pos;
  w.u8(0);
  const end = w.pos;
  w.patchI32(start, end - start);
  return {
    kind: 'document',
    isArray: node.t === 'array',
    start,
    end,
    size: end - start,
    elements,
    eoo: [eooStart, end],
  };
}

function encodeElement(w, name, value) {
  const start = w.pos;
  const code = TYPE_CODES[value.t];
  if (code === undefined) throw new Error(`Unknown value type: ${value.t}`);
  w.u8(code);
  const nameStart = w.pos;
  w.cstring(name);
  const nameRange = [nameStart, w.pos];
  const valueStart = w.pos;
  let children = null;
  let shown;
  let sizeRange = null; // int32 length prefix, for types that have one

  switch (value.t) {
    case 'double':
      w.view(8, (dv) => dv.setFloat64(0, value.v, true));
      shown = String(value.v);
      break;
    case 'string':
      w.string(value.v);
      sizeRange = [valueStart, valueStart + 4];
      shown = JSON.stringify(value.v);
      break;
    case 'doc':
    case 'array':
      children = encodeDocument(w, value);
      sizeRange = [valueStart, valueStart + 4];
      shown = `embedded ${value.t === 'array' ? 'array' : 'document'}, ${children.size} bytes`;
      break;
    case 'binary':
      w.i32(value.bytes.length);
      sizeRange = [valueStart, valueStart + 4];
      w.u8(value.subtype);
      w.raw(value.bytes);
      shown = `subtype 0x${value.subtype.toString(16).padStart(2, '0')}, ${value.bytes.length} bytes`;
      break;
    case 'objectId': {
      const b = value.hex.match(/../g).map((h) => parseInt(h, 16));
      w.raw(b);
      shown = value.hex;
      break;
    }
    case 'bool':
      w.u8(value.v ? 1 : 0);
      shown = String(value.v);
      break;
    case 'date':
      w.view(8, (dv) => dv.setBigInt64(0, value.ms, true));
      shown = new Date(Number(value.ms)).toISOString();
      break;
    case 'null':
      shown = 'null';
      break;
    case 'regex': {
      w.cstring(value.pattern);
      const opts = [...value.options].sort().join('');
      w.cstring(opts);
      shown = `/${value.pattern}/${opts}`;
      break;
    }
    case 'int32':
      w.i32(value.v);
      shown = String(value.v);
      break;
    case 'timestamp':
      // 8 bytes: increment (low 4 bytes) then seconds (high 4 bytes), both uint32 LE
      w.view(8, (dv) => {
        dv.setUint32(0, value.i >>> 0, true);
        dv.setUint32(4, value.t >>> 0, true);
      });
      shown = `t=${value.t}, i=${value.i}`;
      break;
    case 'int64':
      w.view(8, (dv) => dv.setBigInt64(0, value.v, true));
      shown = value.v.toString();
      break;
    case 'minKey':
      shown = 'MinKey';
      break;
    case 'maxKey':
      shown = 'MaxKey';
      break;
  }

  return {
    kind: 'element',
    start,
    end: w.pos,
    typeCode: code,
    typeName: TYPE_NAMES[value.t],
    name,
    nameRange,
    sizeRange,
    valueRange: [sizeRange ? sizeRange[1] : valueStart, w.pos],
    shown,
    children,
  };
}
