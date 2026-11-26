import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode } from '../src/bson.js';
import { fromJsonText } from '../src/extjson.js';

const hex = (bytes) => Buffer.from(bytes).toString('hex');
const encodeJson = (text) => encode(fromJsonText(text)).bytes;

test('empty document is 5 bytes', () => {
  assert.equal(hex(encodeJson('{}')), '0500000000');
});

test('{"a":1} uses int32 (0x10)', () => {
  // size 12, type 0x10, "a\0", int32 1, EOO
  assert.equal(hex(encodeJson('{"a":1}')), '0c0000001061000100000000');
});

test('string value: length includes NUL terminator', () => {
  // {"a":"hi"} -> size 14, type 0x02, "a\0", len 3, "hi\0", EOO
  assert.equal(hex(encodeJson('{"a":"hi"}')), '0f000000' + '02' + '6100' + '03000000' + '686900' + '00');
});

test('boolean and null', () => {
  assert.equal(hex(encodeJson('{"b":true}')), '09000000' + '08' + '6200' + '01' + '00');
  assert.equal(hex(encodeJson('{"n":null}')), '08000000' + '0a' + '6e00' + '00');
});

test('large integers become int64 (0x12), fractions become double (0x01)', () => {
  const big = encodeJson('{"a":9007199254740991}');
  assert.equal(big[4], 0x12);
  const frac = encodeJson('{"a":1.5}');
  assert.equal(frac[4], 0x01);
});

test('Extended JSON: $oid, $numberLong, $date, $regularExpression', () => {
  const b = encodeJson('{"id":{"$oid":"5f1d7f3e9a1b2c3d4e5f6a7b"}}');
  assert.equal(b[4], 0x07);
  assert.equal(hex(b.slice(-13, -1)), '5f1d7f3e9a1b2c3d4e5f6a7b');
  assert.equal(encodeJson('{"x":{"$numberLong":"5"}}')[4], 0x12);
  assert.equal(encodeJson('{"d":{"$date":"2020-01-01T00:00:00Z"}}')[4], 0x09);
  const re = encodeJson('{"r":{"$regularExpression":{"pattern":"^a","options":"i"}}}');
  assert.equal(re[4], 0x0b);
});

test('Extended JSON: $numberInt range check and unsupported $numberDecimal', () => {
  assert.throws(() => encodeJson('{"a":{"$numberInt":"9999999999"}}'), /int32 range/);
  assert.throws(() => encodeJson('{"a":{"$numberDecimal":"1.0"}}'), /Decimal128/);
});

test('top-level must be an object or array', () => {
  assert.throws(() => encodeJson('5'), /top level/);
});

test('array is encoded as document with keys "0","1",...', () => {
  // {"a":[1]} -> the inner array has key "0"
  const { tree } = encode(fromJsonText('{"a":[7]}'));
  const arr = tree.elements[0];
  assert.equal(arr.typeName, 'Array');
  assert.equal(arr.children.elements[0].name, '0');
});

test('spec example document (menu) is 219 bytes', () => {
  const json = JSON.stringify({
    menu: {
      id: 'file',
      value: 'File',
      popup: {
        menuitem: [
          { value: 'New', onclick: 'CreateNewDoc()' },
          { value: 'Open', onclick: 'OpenDoc()' },
          { value: 'Close', onclick: 'CloseDoc()' },
        ],
      },
    },
  });
  const { bytes, tree } = encode(fromJsonText(json));
  assert.equal(bytes.length, 219);
  assert.equal(tree.size, 219);
  assert.equal(tree.elements[0].children.size, 208);
});

test('size prefix is exposed separately from the value', () => {
  const { tree } = encode(fromJsonText('{"id":"file","n":1,"b":{"$binary":{"base64":"AQID","subType":"00"}}}'));
  const [str, int, bin] = tree.elements;
  assert.deepEqual(str.sizeRange, [8, 12]);
  assert.deepEqual(str.valueRange, [12, 17]); // "file\0"
  assert.equal(int.sizeRange, null);
  assert.equal(bin.valueRange[0] - bin.sizeRange[1], 0); // value starts with the subtype byte
});

test('$timestamp encodes increment then seconds as uint32 LE', () => {
  const { bytes } = encode(fromJsonText('{"a":{"$timestamp":{"t":1,"i":2}}}'));
  // 4B len, type 0x11, "a\0", then i=2, t=1
  assert.deepEqual([...bytes.slice(4, 14)], [0x11, 0x61, 0, 2, 0, 0, 0, 1, 0, 0]);
});
