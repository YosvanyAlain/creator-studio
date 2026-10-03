// One global (CM6) with the CodeMirror pieces the Creator Studio editor uses.
export { EditorState, Compartment, StateEffect, Transaction, EditorSelection } from '@codemirror/state';
export { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection,
  dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, placeholder } from '@codemirror/view';
export { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth,
  toggleComment, selectAll, indentMore, indentLess } from '@codemirror/commands';
export { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap,
  indentUnit, syntaxTree } from '@codemirror/language';
export { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, startCompletion,
  acceptCompletion, completeFromList } from '@codemirror/autocomplete';
export { search, searchKeymap, highlightSelectionMatches, openSearchPanel, closeSearchPanel, findNext,
  findPrevious, replaceNext, replaceAll, setSearchQuery, SearchQuery } from '@codemirror/search';
export { html } from '@codemirror/lang-html';
export { css } from '@codemirror/lang-css';
export { javascript } from '@codemirror/lang-javascript';
export { json } from '@codemirror/lang-json';
export { tags } from '@lezer/highlight';
