// JSON + MongoDB Extended JSON -> canonical typed tree consumed by bson.js.
// Limitation: JS objects do not preserve key order for integer-like keys
// (e.g. {"b":1,"1":2} is read as "1" first). Documented in specs.md.

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const INT64_MIN = -(2n ** 63n);
const INT64_MAX = 2n ** 63n - 1n;

export function fromJsonText(text) {
  return convert(JSON.parse(text));
}

export function convert(v) {
  if (v === null) return { t: 'null' };
  if (typeof v === 'boolean') return { t: 'bool', v };
  if (typeof v === 'string') return { t: 'string', v };
  if (typeof v === 'number') return fromNumber(v);
  if (Array.isArray(v)) return { t: 'array', items: v.map(convert) };
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0].startsWith('$')) {
      const special = fromWrapper(keys[0], v[keys[0]]);
      if (special) return special;
    }
    return { t: 'doc', entries: keys.map((k) => [k, convert(v[k])]) };
  }
  throw new Error(`Unsupported JSON value: ${String(v)}`);
}

// Plain JSON numbers: int32 when they fit, int64 for larger integers, else double.
// Note: JSON "1.0" is parsed by JS as 1, so it becomes int32.
function fromNumber(n) {
  if (Number.isInteger(n) && n >= INT32_MIN && n <= INT32_MAX) return { t: 'int32', v: n };
  if (Number.isSafeInteger(n)) return { t: 'int64', v: BigInt(n) };
  return { t: 'double', v: n };
}

function parseInt64(s) {
  const v = BigInt(String(s));
  if (v < INT64_MIN || v > INT64_MAX) throw new Error(`Value out of int64 range: ${s}`);
  return v;
}

function parseInt32(s) {
  const v = Number(s);
  if (!Number.isInteger(v) || v < INT32_MIN || v > INT32_MAX) {
    throw new Error(`Value out of int32 range: ${s}`);
  }
  return v;
}

function fromWrapper(key, val) {
  switch (key) {
    case '$oid':
      if (typeof val !== 'string' || !/^[0-9a-fA-F]{24}$/.test(val)) {
        throw new Error('$oid must be a 24-character hex string');
      }
      return { t: 'objectId', hex: val.toLowerCase() };

    case '$date': {
      let ms;
      if (typeof val === 'string') ms = Date.parse(val);
      else if (typeof val === 'number') ms = val;
      else if (val && typeof val === 'object' && '$numberLong' in val) ms = Number(val.$numberLong);
      if (ms === undefined || Number.isNaN(ms)) throw new Error('Invalid $date value');
      return { t: 'date', ms: BigInt(ms) };
    }

    case '$numberInt':
      return { t: 'int32', v: parseInt32(val) };

    case '$numberLong':
      return { t: 'int64', v: parseInt64(val) };

    case '$numberDouble':
      return { t: 'double', v: Number(val) };

    case '$numberDecimal':
      throw new Error('$numberDecimal (Decimal128) is not supported yet');

    case '$binary': {
      if (!val || typeof val.base64 !== 'string' || typeof val.subType !== 'string') {
        throw new Error('$binary needs {"base64": "...", "subType": "00"}');
      }
      const bytes = Uint8Array.from(atob(val.base64), (c) => c.charCodeAt(0));
      return { t: 'binary', subtype: parseInt(val.subType, 16), bytes };
    }

    case '$regularExpression':
      if (!val || typeof val.pattern !== 'string') throw new Error('Invalid $regularExpression');
      return { t: 'regex', pattern: val.pattern, options: val.options || '' };

    case '$timestamp':
      if (!val || typeof val.t !== 'number' || typeof val.i !== 'number') {
        throw new Error('$timestamp needs {"t": n, "i": n}');
      }
      return { t: 'timestamp', sec: val.t, i: val.i };

    case '$minKey':
      return { t: 'minKey' };
    case '$maxKey':
      return { t: 'maxKey' };

    default:
      return null;
  }
}
