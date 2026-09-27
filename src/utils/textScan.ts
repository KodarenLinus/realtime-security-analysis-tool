import * as vscode from 'vscode';
import { apiClientLaya } from '../api-ai/laya/client';
import { AIResponse, Querys } from '../api-ai/types';

const QUERIES: Querys = {
  risk: {
    type: 'choice',
    instructions: 'Is this code a security risk?',
    criteria: { risky: 'yes, it has a security risk', safe: 'no obvious risk' },
  },
};

export const diagnostics = vscode.languages.createDiagnosticCollection('security');

export const riskHighlight = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 170, 0, 0.15)',
  isWholeLine: true,
  overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
});

// Decorations belong to an editor, not a file, so reapply them from the
// diagnostics whenever a document is shown again.
const applyHighlights = (editor: vscode.TextEditor) => {
  const ranges = (diagnostics.get(editor.document.uri) ?? []).map(d => d.range);
  editor.setDecorations(riskHighlight, ranges);
};

const refreshHighlights = (uri: vscode.Uri) => {
  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.uri.toString() === uri.toString()) applyHighlights(editor);
  }
};

let lastKey = '';
let requestId = 0;
let inFlight: AbortController | undefined;

// Built per scan so changes to the settings apply without a reload.
const getLaya = () => {
  const cfg = vscode.workspace.getConfiguration('securityScanner');
  return apiClientLaya({
    url: cfg.get<string>('layaUrl'),
    apiKey: cfg.get<string>('layaApiKey') || undefined,
    timeout: cfg.get<number>('timeout'),
  });
};

const getBlockAtCursor = async (
  editor: vscode.TextEditor,
): Promise<{ text: string; range: vscode.Range } | undefined> => {
  const doc = editor.document;
  const line = editor.selection.active.line;

  const ranges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
    'vscode.executeFoldingRangeProvider',
    doc.uri,
  );

  const block = ranges
    ?.filter(r => r.start <= line && line <= r.end)
    .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  if (!block) return undefined;

  const endLine = Math.min(block.end + 1, doc.lineCount - 1);
  const range = new vscode.Range(block.start, 0, endLine, doc.lineAt(endLine).text.length);
  return { text: doc.getText(range), range };
};

const showResult = (doc: vscode.TextDocument, range: vscode.Range, res: AIResponse) => {
  const risk = res.answers.risk;
  if (risk?.choice !== 'risky') {
    diagnostics.delete(doc.uri);
    refreshHighlights(doc.uri);
    return;
  }

  const confidence =
    risk.confidence !== undefined ? ` (${Math.round(risk.confidence * 100)}%)` : '';
  const diagnostic = new vscode.Diagnostic(
    range,
    `Possible security risk${confidence}`,
    vscode.DiagnosticSeverity.Warning,
  );
  diagnostic.source = 'Laya';
  diagnostics.set(doc.uri, [diagnostic]);
  refreshHighlights(doc.uri);
};

export const scanText = async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const block = await getBlockAtCursor(editor);
  if (!block) return;

  const doc = editor.document;
  const key = `${doc.uri.toString()}\n${doc.languageId}\n${block.text}`;
  if (key === lastKey) return;
  lastKey = key;

  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;
  const id = ++requestId;

  try {
    const res = await getLaya().predict(
      `Language: ${doc.languageId}\n\n${block.text}`,
      QUERIES,
      controller.signal,
    );
    if (id !== requestId) return;
    showResult(doc, block.range, res);
  } catch (err) {
    if (id !== requestId) return;
    lastKey = ''; // allow a retry of the same block
    vscode.window.setStatusBarMessage(`Laya: ${(err as Error).message}`, 3000);
  }
};

export const startAutoScan = (): vscode.Disposable => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleScan = () => {
    clearTimeout(timer);
    timer = setTimeout(scanText, 400);
  };

  return vscode.Disposable.from(
    vscode.window.onDidChangeTextEditorSelection(scheduleScan),
    vscode.workspace.onDidChangeTextDocument(scheduleScan),
    vscode.window.onDidChangeVisibleTextEditors(editors => editors.forEach(applyHighlights)),
    {
      dispose: () => {
        clearTimeout(timer);
        inFlight?.abort();
      },
    },
  );
};
