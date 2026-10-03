// One global (CM6) with the CodeMirror pieces the Creator Studio editor uses.
export { EditorState, Compartment, StateEffect, StateField, Transaction, EditorSelection, Prec, RangeSetBuilder } from '@codemirror/state';
export { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection,
  dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, placeholder, ViewPlugin, Decoration,
  WidgetType, hoverTooltip, showTooltip } from '@codemirror/view';
export { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth,
  toggleComment, selectAll, indentMore, indentLess, cursorDocStart, cursorDocEnd, insertNewlineAndIndent,
  selectLine, copyLineDown, deleteLine, moveLineUp, moveLineDown } from '@codemirror/commands';
export { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap,
  indentUnit, syntaxTree, foldAll, unfoldAll, foldCode, unfoldCode } from '@codemirror/language';
export { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, startCompletion, closeCompletion,
  acceptCompletion, completeFromList, currentCompletions, selectedCompletion, selectedCompletionIndex,
  setSelectedCompletion, completionStatus, snippetCompletion, snippet, ifNotIn, ifIn, insertCompletionText,
  pickedCompletion, moveCompletionSelection } from '@codemirror/autocomplete';
export { search, searchKeymap, highlightSelectionMatches, openSearchPanel, closeSearchPanel, findNext,
  findPrevious, replaceNext, replaceAll, setSearchQuery, getSearchQuery, SearchQuery, gotoLine } from '@codemirror/search';
export { linter, lintGutter, setDiagnostics, forEachDiagnostic, nextDiagnostic } from '@codemirror/lint';
export { html, htmlCompletionSource, htmlLanguage } from '@codemirror/lang-html';
export { css, cssCompletionSource, cssLanguage } from '@codemirror/lang-css';
export { javascript, localCompletionSource, scopeCompletionSource, javascriptLanguage } from '@codemirror/lang-javascript';
export { json, jsonParseLinter } from '@codemirror/lang-json';
export { tags } from '@lezer/highlight';
