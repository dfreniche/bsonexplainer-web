import { fromJsonText } from './extjson.js';
import { encode, TYPE_NAMES, TYPE_CODES } from './bson.js';

const input = document.getElementById('json-input');
const jsonPanel = document.getElementById('json-tree');
const bsonPanel = document.getElementById('bson-tree');
const hexPanel = document.getElementById('hex-dump');
const errorBox = document.getElementById('error');
const sizeLabel = document.getElementById('total-size');

const SAMPLE = `{
  "menu": {
    "id": "file",
    "value": "File",
    "popup": {
      "menuitem": [
        { "value": "New", "onclick": "CreateNewDoc()" },
        { "value": "Open", "onclick": "OpenDoc()" },
        { "value": "Close", "onclick": "CloseDoc()" }
      ]
    }
  }
}`;

const MAX_SHOWN_BYTES = 40;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const hex2 = (n) => n.toString(16).padStart(2, '0');

// Escape bytes like the spec examples: printable ASCII as-is, everything else as \xNN.
function escapeBytes(bytes, start, end) {
  let out = '';
  const stop = Math.min(end, start + MAX_SHOWN_BYTES);
  for (let i = start; i < stop; i++) {
    const b = bytes[i];
    out += b >= 0x20 && b < 0x7f && b !== 0x5c ? String.fromCharCode(b) : `\\x${hex2(b)}`;
  }
  return out + (end > stop ? '…' : '');
}

// ---------- JSON tree (left panel) ----------

const jsonLeafText = (node) => {
  switch (node.t) {
    case 'string': return JSON.stringify(node.v);
    case 'int32': case 'double': case 'bool': return String(node.v);
    case 'int64': return node.v.toString();
    case 'date': return new Date(Number(node.ms)).toISOString();
    case 'objectId': return node.hex;
    case 'null': return 'null';
    case 'binary': return `binary, ${node.bytes.length} bytes`;
    case 'regex': return `/${node.pattern}/${node.options}`;
    case 'timestamp': return `t=${node.t}, i=${node.i}`;
    default: return node.t;
  }
};

function renderJson(key, node) {
  const label = key === null ? '' : `<span class="key">${esc(key)}</span>`;
  if (node.t === 'doc' || node.t === 'array') {
    const entries = node.t === 'doc' ? node.entries : node.items.map((v, i) => [String(i), v]);
    const kind = node.t === 'array' ? 'array' : 'object';
    return `<details open><summary>${label} <span class="type">${kind}, ${entries.length} fields</span></summary>` +
      entries.map(([k, v]) => renderJson(k, v)).join('') + `</details>`;
  }
  const typeName = TYPE_NAMES[node.t] ?? node.t;
  return `<div class="leaf">${label}${key === null ? '' : ': '}${esc(jsonLeafText(node))} <span class="type">${esc(typeName)}</span></div>`;
}

// ---------- BSON tree (right panel) ----------

function renderBsonDoc(doc, bytes, label) {
  const rows = doc.elements.map((el) => {
    const code = `0x${hex2(el.typeCode)} = ${el.typeName}`;
    const [vs, ve] = el.valueRange;
    const valueBytes = escapeBytes(bytes, vs, ve);
    const shown = el.children ? `${el.shown} (shown below)` : el.shown;
    return `<tr class="el" data-start="${el.start}" data-end="${el.end}">
      <td>${esc(code)}</td>
      <td>${esc(el.name)}\\x00</td>
      <td><code>${esc(valueBytes)}</code><br><span class="muted">${esc(shown)}</span></td>
    </tr>`;
  }).join('');
  const [es, ee] = doc.eoo;
  const eoo = `<tr class="eoo" data-start="${es}" data-end="${ee}">
    <td>0x00 = EOO</td><td>end of ${esc(label)}</td><td><code>\\x00</code></td></tr>`;
  const nested = doc.elements
    .filter((el) => el.children)
    .map((el) => renderBsonDoc(el.children, bytes, `Embedded field "${el.name}" (${el.typeName.toLowerCase()})`))
    .join('');
  return `<details open data-start="${doc.start}" data-end="${doc.end}">
    <summary><span class="key">${esc(label)}</span> <span class="type">${doc.size} bytes</span></summary>
    <table><thead><tr><th>type</th><th>field name</th><th>field value</th></tr></thead>
    <tbody>${rows}${eoo}</tbody></table>${nested}
  </details>`;
}

// ---------- Hex dump ----------

let byteSpans = [];

function renderHex(bytes) {
  const lines = [];
  for (let off = 0; off < bytes.length; off += 16) {
    const chunk = bytes.slice(off, off + 16);
    const cells = [...chunk].map((b, j) => `<span data-i="${off + j}">${hex2(b)}</span>`).join(' ');
    const ascii = [...chunk].map((b) => (b >= 0x20 && b < 0x7f ? esc(String.fromCharCode(b)) : '.')).join('');
    lines.push(`<span class="hex-row"><span class="off">${off.toString(16).padStart(8, '0')}</span>  ${cells}${'   '.repeat(16 - chunk.length)}  <span class="ascii">${ascii}</span></span>`);
  }
  hexPanel.innerHTML = lines.join('\n');
  byteSpans = [...hexPanel.querySelectorAll('[data-i]')];
}

function highlight(start, end) {
  byteSpans.forEach((s) => s.classList.remove('hl'));
  if (start === undefined) return;
  for (let i = start; i < end && i < byteSpans.length; i++) byteSpans[i].classList.add('hl');
}

bsonPanel.addEventListener('mouseover', (e) => {
  const target = e.target.closest('[data-start]');
  if (target) highlight(Number(target.dataset.start), Number(target.dataset.end));
});
bsonPanel.addEventListener('mouseleave', () => highlight());

// ---------- Main render ----------

function render() {
  let parsed;
  try {
    parsed = fromJsonText(input.value);
    const { bytes, tree } = encode(parsed);
    errorBox.hidden = true;
    jsonPanel.innerHTML = renderJson(null, parsed);
    bsonPanel.innerHTML = renderBsonDoc(tree, bytes, tree.isArray ? 'array' : 'document');
    sizeLabel.textContent = `— total size: ${bytes.length} bytes`;
    renderHex(bytes);
  } catch (err) {
    errorBox.textContent = err instanceof SyntaxError ? `Invalid JSON: ${err.message}` : err.message;
    errorBox.hidden = false;
  }
}

let timer;
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(render, 150);
});

document.querySelector('.toolbar').addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  document.querySelectorAll('.tree details').forEach((d) => (d.open = action === 'expand'));
});

input.value = SAMPLE;
render();
