# BSON EXPLAINER - web version

Single page web application that shows how JSON gets converted into BSON.

- has to run in GitHub pages (static hosting)
- HTML + vanilla JS + CSS
- BSON specification is here: https://bsonspec.org/spec.html 
- Let's use the via design system at https://github.com/10gen/via/tree/main#getting-started 

## The app

The app should show a BSON EXPLAINER title (using an ASCII art font). Also should allow to enter JSON in a textbox. Then it will show side by side JSON in one scrollable panel and BSON in another. Both JSON and BSON should be tree-like nodes we can expand and contract.

Example of the information shown in BSON:
```
Total size: 219 bytes

\xdb\x00\x00\x00  // total document size
| type            | field name | field value                                                  |
| :-------------- | :--------- | :----------------------------------------------------------- |
| 0x03 = Document | menu\x00   | \xd0\x00\x00\x00 (embedded document, 208 bytes, shown below) |

Embedded field "menu" (document):
  \xd0\x00\x00\x00  // embedded document size (208 bytes)
  | type            | field name | field value                                                  |
  | :-------------- | :--------- | :----------------------------------------------------------- |
  | 0x02 = String   | id\x00     | \x05\x00\x00\x00file\x00                                     |
  | 0x02 = String   | value\x00  | \x05\x00\x00\x00File\x00                                     |
  | 0x03 = Document | popup\x00  | \xa7\x00\x00\x00 (embedded document, 167 bytes, shown below) |

  Embedded field "popup" (document):
    \xa7\x00\x00\x00  // embedded document size (167 bytes)
    | type         | field name   | field value                                                  |
    | :----------- | :----------- | :----------------------------------------------------------- |
    | 0x04 = Array | menuitem\x00 | \x98\x00\x00\x00 (embedded document, 152 bytes, shown below) |

    Embedded field "menuitem" (array):
      \x98\x00\x00\x00  // embedded document size (152 bytes)
      | type            | field name | field value                                              |
      | :-------------- | :--------- | :------------------------------------------------------- |
      | 0x03 = Document | 0\x00      | 0\x00\x00\x00 (embedded document, 48 bytes, shown below) |
      | 0x03 = Document | 1\x00      | ,\x00\x00\x00 (embedded document, 44 bytes, shown below) |
      | 0x03 = Document | 2\x00      | .\x00\x00\x00 (embedded document, 46 bytes, shown below) |

      Embedded field "0" (document):
        0\x00\x00\x00  // embedded document size (48 bytes)
        | type          | field name  | field value                        |
        | :------------ | :---------- | :--------------------------------- |
        | 0x02 = String | value\x00   | \x04\x00\x00\x00New\x00            |
        | 0x02 = String | onclick\x00 | \x0f\x00\x00\x00CreateNewDoc()\x00 |
        \x00  // 0x00 = type EOO ('end of object') for "0"

      Embedded field "1" (document):
        ,\x00\x00\x00  // embedded document size (44 bytes)
        | type          | field name  | field value                   |
        | :------------ | :---------- | :---------------------------- |
        | 0x02 = String | value\x00   | \x05\x00\x00\x00Open\x00      |
        | 0x02 = String | onclick\x00 | \x0a\x00\x00\x00OpenDoc()\x00 |
        \x00  // 0x00 = type EOO ('end of object') for "1"

      Embedded field "2" (document):
        .\x00\x00\x00  // embedded document size (46 bytes)
        | type          | field name  | field value                    |
        | :------------ | :---------- | :----------------------------- |
        | 0x02 = String | value\x00   | \x06\x00\x00\x00Close\x00      |
        | 0x02 = String | onclick\x00 | \x0b\x00\x00\x00CloseDoc()\x00 |
        \x00  // 0x00 = type EOO ('end of object') for "2"
      \x00  // 0x00 = type EOO ('end of object') for "menuitem"
    \x00  // 0x00 = type EOO ('end of object') for "popup"
  \x00  // 0x00 = type EOO ('end of object') for "menu"
\x00  // 0x00 = type EOO ('end of object')
```




## Decisions (confirmed with the user, 2026-11-17)

- **Design system**: install Via with pnpm (from the private `10gen/via` repo). Because the app must run on GitHub Pages as static files, the needed Via assets are bundled/vendored into the deployed output.
- **ASCII title**: generated with the `figlet` npm library (external dependency, accepted by the user).
- **Input types**: standard JSON plus MongoDB Extended JSON (`$oid`, `$date`, `$numberLong`, `$numberInt`, `$numberDouble`, `$numberDecimal`, `$binary`, `$regularExpression`, `$timestamp`, `$minKey`, `$maxKey`, ...). Plain JSON numbers map to int32, int64 or double depending on value.
- **BSON panel**: collapsible tree with size, type/name/value tables and EOO markers (as in the example above), plus a raw hex dump of the whole byte stream.

## Implementation notes (v0.1.0)

- Build output is `dist/` (`pnpm build`); deployed to GitHub Pages by `.github/workflows/pages.yml`.
- Decimal128 (`$numberDecimal`) is not supported yet. Known limitations are listed in `plan.md`.

- Footer links: BSON overview (mongodb.com), BSON specification (bsonspec.org), and "Fork me on GitHub" (github.com/dfreniche/bsonexplainer-web).

- "Fork me on GitHub" is a corner ribbon (top-right, fixed) linking to github.com/dfreniche/bsonexplainer-web; it replaces the footer link.

- JSON and BSON trees stay in sync: expanding or collapsing a node in one panel does the same in the other. Nodes are paired by their path from the root.

- Hover highlighting is synced: hovering a BSON row highlights its JSON node and its bytes in the hex dump; hovering a JSON node highlights its BSON row and bytes.

- Highlights and the title use MongoDB Spring Green (Via `green-400`, #00ED64); the title uses `green-600` in light mode for contrast.

- Subtitle: "Shows how JSON is converted into BSON, byte by byte. Runs in your browser. No data sent."
- Each panel shows its total size: JSON = UTF-8 bytes of the input text as typed; BSON = encoded bytes.
- Footer links: BSON overview, BSON specification, bug0 JSON to BSON tool, bsondump docs.

- Favicon: MongoDB favicon.ico, self-hosted at the site root (copied from https://www.mongodb.com/assets/images/global/favicon.ico).

- Brand palette (from MongoDB colors sheet): Spring Green #00ED64, Forest Green #00684A, Evergreen #023430, Slate Blue #001E2B. Highlights and dark title use Spring Green; light title uses Forest Green; ribbon uses Forest Green (hover Evergreen). Page background stays on Via neutral tokens (decided).

- BSON tables have a **field size** column between "field name" and "field value" (columns: type | field name | field size | field value). Only types that carry an int32 length prefix have a size: String (byte length of the UTF-8 text + the trailing `\x00`), Binary (length of the data, excluding the subtype byte), Document and Array (total size of the embedded document). The column shows the 4 raw bytes (e.g. `\x05\x00\x00\x00`) and the decoded number below it (e.g. `5 bytes`). Fixed-size types (Int32, Double, ObjectId, ...) show `—`. The field value column no longer includes the size prefix: for a string it shows only the text bytes plus terminator (e.g. `file\x00`); for Binary the subtype byte and data; for Document/Array just `(embedded document, shown below)`. Hover highlighting still covers the whole element, size bytes included.

- The field size cell has a tooltip (native `title` attribute, no dependency) explaining the encoding, e.g. for 5: "int32, little-endian: 5 = 0x00000005, stored lowest byte first as \x05\x00\x00\x00. The upper bytes are zero because the value fits in fewer than 4 bytes." The size header cell carries the same generic explanation. For strings it also says the size counts the trailing \x00.

- The size tooltip is attached to a small ℹ️ emoji placed after the size (`5 bytes ℹ️`), not to the whole cell: it appears only when hovering the emoji. The emoji is focusable (`tabindex="0"`) with `role="img"` and an `aria-label`, so keyboard users can reach it. The header tooltip is unchanged.
