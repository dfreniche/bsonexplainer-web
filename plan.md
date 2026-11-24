# Plan

Status: v0.1.0 implemented. Sample renders to 219 bytes (matches the spec example); 11 unit tests pass.

## Decisions
- Via: the packages `@via-ds/tokens` and `@via-ds/components` are public on npm, so no token is needed. Only the CSS is used (tokens, fonts, components index.css), vendored into `dist/vendor/`. No React.
- Build: `pnpm build` runs `scripts/build.mjs`, which copies the app to `dist/` for GitHub Pages and renders the ASCII title with figlet at build time (no runtime font fetch).
- Hover linking: BSON row <-> JSON node <-> hex bytes are highlighted together, paired by path from the root.
- Expand/collapse is mirrored between the JSON and BSON trees (paired by path).
- Brand palette: Spring Green highlights/title, Forest Green light title and ribbon (hover Evergreen). Page background stays on Via neutral tokens.
- Open-question defaults (not confirmed by user): Pages deploy via GitHub Actions from `main`.

## Steps
1. [done] Project setup: `package.json` (pnpm 12.8.1), Via, figlet.
2. [done] BSON encoder (`src/bson.js`): all types in the spec except Decimal128. Produces bytes plus a tree with byte ranges.
3. [done] Extended JSON layer (`src/extjson.js`): $oid, $date, $numberInt/Long/Double, $binary, $regularExpression, $timestamp, $minKey, $maxKey.
4. [done] UI (`index.html`, `styles.css`, `src/app.js`): title, JSON input, JSON and BSON side by side, expand/collapse, hex dump with row hover.
5. [done] Styling with Via tokens.
6. [done] Tests with `node:test` (`test/bson.test.mjs`).
7. [done] GitHub Actions workflow (`.github/workflows/pages.yml`). Not yet run on GitHub.
8. [done] Footer with BSON resources (later reduced to BSON overview, spec, bug0 tool, bsondump docs) and "Fork me on GitHub" corner ribbon.
9. [done] Sync expand/collapse between JSON and BSON trees (`onToggle` in `src/app.js`).
10. [done] Sync hover highlight between BSON rows, JSON nodes and hex bytes (`showSync`, `highlight`).
11. [done] MongoDB brand colors for highlights, title and ribbon.
12. [done] Hex dump moved into a tab next to BSON; the JSON panel is always visible.
13. [done] JSON size label, updated subtitle, MongoDB favicon (`favicon.ico`).
14. [done] "Field size" column in BSON tables, separating the int32 length prefix (String, Binary, Document, Array) from the field value. Encoder exposes `sizeRange` per element; `renderBsonDoc` adds the column; fixed-size types show `—`. See `specs.md`.
15. [done] Tooltip on the field size cell (and header) explaining int32 little-endian encoding. Native `title` attribute.
16. [done] Move the size tooltip onto a small ℹ️ emoji after the size, so it shows only on hovering the emoji.
17. [done] Fix: native `title` tooltip did not show and `cursor: help` looked oversized. Replace with a CSS tooltip (`data-tip`, `::after`) and the default cursor.
18. [done] Fixed-size types (Int32, Double, ObjectId, Boolean, Date, Null, Timestamp, Int64, MinKey, MaxKey) show `N bytes (fixed)` in the field size column with an ℹ️ tooltip explaining implied sizes. Regex stays `—`.
19. [done] Fix: tooltip broke words mid-word (inherited `word-break: break-all`); now 360px wide with normal word breaking.

## Known limitations / TODO
- `$numberDecimal` (Decimal128) is rejected with an error.
- JS objects reorder integer-like keys (`{"b":1,"1":2}` is read with "1" first).
- JSON `1.0` is read as int32 (JS drops the fraction).
- No automated UI tests; the page was checked with headless Chrome (DOM dump and screenshot).

## Dependency justification
- `@via-ds/tokens`, `@via-ds/components`: required by specs.
- `figlet`: chosen by the user for the ASCII title; build-time only.
- `pnpm` dev tooling: required by the user.
- Everything else (BSON encoding, Extended JSON, UI, tests) is dependency-free.
