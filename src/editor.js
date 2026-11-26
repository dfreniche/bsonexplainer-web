// JSON code editor (CodeMirror 6): line numbers, JSON syntax colors, auto-indent,
// bracket matching/closing, undo/redo. Exposes a tiny textarea-like API.
import { basicSetup, EditorView } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Colors come from CSS variables (see styles.css) so light/dark both stay readable.
const highlight = HighlightStyle.define([
  { tag: t.propertyName, color: 'var(--code-key)' },
  { tag: t.string, color: 'var(--code-string)' },
  { tag: [t.number, t.integer, t.float], color: 'var(--code-number)' },
  { tag: [t.bool, t.null, t.keyword], color: 'var(--code-keyword)' },
  { tag: [t.brace, t.squareBracket, t.separator], color: 'var(--code-punct)' },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--via-color-background-secondary)', color: 'inherit', fontSize: '13px' },
  '.cm-scroller': { fontFamily: 'var(--via-font-family-monospace)', minHeight: '9em', maxHeight: '40vh' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--via-color-text-secondary)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
  '&.cm-focused': { outline: '2px solid var(--via-color-green-400)' },
  '.cm-cursor': { borderLeftColor: 'currentColor' },
});

export function createEditor(parent, doc, onChange) {
  const view = new EditorView({
    parent,
    doc,
    extensions: [
      basicSetup,
      json(),
      syntaxHighlighting(highlight),
      theme,
      EditorView.contentAttributes.of({ 'aria-label': 'JSON input', spellcheck: 'false' }),
      EditorView.updateListener.of((u) => { if (u.docChanged) onChange(); }),
    ],
  });
  return {
    getValue: () => view.state.doc.toString(),
    setValue: (v) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } }),
  };
}
