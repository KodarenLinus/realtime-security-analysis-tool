import * as vscode from 'vscode';
import { diagnostics, riskHighlight, scanText, startAutoScan } from './utils/textScan';

export function main(auto: boolean): vscode.Disposable {
  if (auto) {
    console.log('Auto scan code');
    return startAutoScan();
  } else {
    console.log('Manual scanning of code');
    return vscode.commands.registerCommand('securityScanner.scan', scanText);
  }
}

export const activate = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(main(true), diagnostics, riskHighlight);
};

export const deactivate = () => {};
