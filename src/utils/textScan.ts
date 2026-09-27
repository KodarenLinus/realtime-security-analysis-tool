import * as vscode from 'vscode';

const getBlockAtCursor = async (editor: vscode.TextEditor): Promise<string | undefined> => {
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
  return doc.getText(new vscode.Range(block.start, 0, endLine, doc.lineAt(endLine).text.length));
};

export const scanText = async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const text = await getBlockAtCursor(editor);
  if (!text) return;

  vscode.window.setStatusBarMessage(`Scanned ${text.split('\n').length} lines`, 2000);
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
    { dispose: () => clearTimeout(timer) },
  );
};
