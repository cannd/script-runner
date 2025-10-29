import * as vscode from "vscode";
import { registerCodeLens, registerCommand } from "./codelens";

export function activate(context: vscode.ExtensionContext) {
  registerCommand(context);
  registerCodeLens(context);
}

export function deactivate() {}
