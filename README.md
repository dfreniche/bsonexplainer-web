# BSON Explainer (web)

A single-page app that shows how a JSON document is converted into BSON, byte by byte.

Paste JSON (MongoDB Extended JSON is supported) and see three things side by side:

- **JSON**: the input as an expandable tree.
- **BSON**: the encoded document as a tree of tables (type, field name, field value, with the raw bytes), following the [BSON specification](https://bsonspec.org/spec.html).
- **Hex dump**: the full byte stream. Hover a row in the BSON tree to highlight its bytes.

## Goals

- Teach how BSON is laid out: sizes, type codes, field names, embedded documents and arrays, and the end-of-object marker.
- Run as static files, so it can be hosted on GitHub Pages.
- Keep dependencies to a minimum. The BSON encoder and the Extended JSON parser have no dependencies.

## Supported types

Standard JSON types (string, number, boolean, null, object, array) and the MongoDB Extended JSON wrappers `$oid`, `$date`, `$numberInt`, `$numberLong`, `$numberDouble`, `$binary`, `$regularExpression`, `$timestamp`, `$minKey` and `$maxKey`.

Plain JSON numbers become int32 if they fit, int64 if they are larger safe integers, and double otherwise.

Not supported yet: `$numberDecimal` (Decimal128).

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- [pnpm](https://pnpm.io) 12 (the version is pinned in `package.json`)

## Install

```sh
git clone <repository-url>
cd bsonexplainer-web
pnpm install
```

## Run locally

Run the tests and build the static site:

```sh
pnpm test     # unit tests for the BSON encoder and Extended JSON parser
pnpm build    # writes the site to dist/
```

Serve `dist/` over HTTP. Opening `index.html` directly will not work, because the page loads its scripts as ES modules, which browsers block over `file://`.

```sh
cd dist
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

After changing `index.html`, `styles.css` or anything in `src/`, run `pnpm build` again and reload the page.

## Project layout

| Path | Purpose |
| :--- | :--- |
| `index.html`, `styles.css` | Page and styles (styles use Via design tokens) |
| `src/app.js` | UI: rendering, hover linking, expand/collapse |
| `src/extjson.js` | JSON and Extended JSON to a typed tree |
| `src/bson.js` | BSON encoder; returns bytes plus a tree with byte ranges |
| `test/bson.test.mjs` | Unit tests |
| `scripts/build.mjs` | Static build into `dist/` |
| `specs.md` | Requirements (source of truth) |
| `plan.md` | Implementation plan and known limitations |
| `.github/workflows/pages.yml` | Test, build and deploy to GitHub Pages on push to `main` |

## Design system

The UI uses the [Via design system](https://github.com/10gen/via) through its CSS tokens and fonts (`@via-ds/tokens` and `@via-ds/components`). The build copies them into `dist/vendor/`.

## Known limitations

- Keys that look like integers are reordered by JavaScript objects, so `{"b":1,"1":2}` is encoded with `"1"` first.
- A JSON `1.0` is read as the integer `1` and encoded as int32.
- `$numberDecimal` (Decimal128) is rejected with an error.

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`, which runs the tests, builds `dist/` and publishes it to GitHub Pages. Enable Pages in the repository settings with the source set to "GitHub Actions".

## Footer

The footer links to the BSON overview on mongodb.com, the BSON specification, and the GitHub repository ("Fork me on GitHub").
