import * as vscode from "vscode";
import ts from "typescript";
import path from "path";

const getConfig = (section = 'fbc.scriptrunner') => vscode.workspace.getConfiguration(section)
const funcConfig = getConfig().get("functions", {
  script: {
    title: "Run script",
    command: "npx tsx {filePath} {scriptName}"
  }
} as Record<string, { title: string, command: string }>);
/**
 * Find all matching test via ts AST
 */
function findFunctions(
  document: vscode.TextDocument
) {
  const sourceFile = ts.createSourceFile(
    document.fileName,
    document.getText(),
    ts.ScriptTarget.Latest,
    true
  );

  const funcs: Array<{ funcName: string, scriptName: string; range: vscode.Range }> = [];

  // Visit all nodes in the AST
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const funcName = node.expression.getText(sourceFile);
      // Check if function name matches the regex
      if (!(funcName in funcConfig)) return
      // Get the script name from the first argument
      const scriptName =
        node.arguments[0] && ts.isStringLiteral(node.arguments[0])
          ? node.arguments[0].text
          : null;
      if (!scriptName) return

      // Get the range of the test function for the CodeLens
      const start = document.positionAt(node.getStart());
      const end = document.positionAt(node.getEnd());
      const range = new vscode.Range(start, end);
      funcs.push({ funcName, scriptName, range });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return funcs;
}

export class RunVitestCommand implements vscode.Command {
  static ID = 'vitest.runTest';
  title = 'Run(Vitest)';
  command = RunVitestCommand.ID;
  arguments?: [string, string];

  constructor(text: string, filename: string) {
      this.arguments = [text, filename];
  }
}


/**
 * This class provides CodeLens for test functions in the editor - find all tests in current document and provide CodeLens for them.
 * It finds all test functions in the current document and provides CodeLens for them (Run Test, Watch Test buttons).
 */
class CodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const funcs = findFunctions(document);
    for (const { funcName, scriptName, range } of funcs) {
      for (const [key, { title, command }] of Object.entries(funcConfig)) {
        if (key !== funcName && !key.startsWith(`${funcName}-`)) continue
        const runCommand = {
          title,
          command: "fbc.scriptrunner.run",
          arguments: [document.fileName, command, scriptName],
        };
        codeLenses.push(new vscode.CodeLens(range, runCommand));
      }
    }

    return codeLenses;
  }
}
// default file pattern to search for tests
const DEFAULT_FILE_PATTERN = "**/*.script.{js,jsx,ts,tsx}";

/**
 * This function registers a CodeLens provider for test files. It is used to display the "Run" and "Watch" buttons.
 */
export function registerCodeLens(context: vscode.ExtensionContext) {
  const codeLensProvider = new CodeLensProvider();

  // Get the user-defined file pattern from the settings, or use the default
  const pattern = getConfig()
    .get("filePattern", DEFAULT_FILE_PATTERN);
  const options = { scheme: "file", pattern };

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { ...options, language: "javascript" },
      codeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { ...options, language: "typescript" },
      codeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { ...options, language: "javascriptreact" },
      codeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { ...options, language: "typescriptreact" },
      codeLensProvider
    )
  );
}

async function getPackageJsonClosest(filePath: string) {
  const segments = filePath.split(path.sep);
  // loop through segments and check if there is package.json
  for (let i = segments.length; i > 0; i--) {
    const folderPath = segments.slice(0, i).join(path.sep);
    const packageJsonPath = path.join(folderPath, "package.json");
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(folderPath));
      if (stat.type !== vscode.FileType.Directory) {
        continue;
      }

      const packageJsonStat = await vscode.workspace.fs.stat(
        vscode.Uri.file(packageJsonPath)
      );
      if (packageJsonStat.type === vscode.FileType.File) {
        return folderPath;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Tracking only one active terminal, so there will be only one terminal running at a time.
// Example: when user clicks "Run Test" button, the previous terminal will be disposed.
let activeTerminal: vscode.Terminal | null = null;

/**
 * This function registers the test runner commands.
 */
export function registerCommand(context: vscode.ExtensionContext) {
  // Register the "Run" command
  const runCommand = vscode.commands.registerCommand(
    "fbc.scriptrunner.run",
    async (
      filePath?: string,
      commandTemplate?: string,
      scriptName = 'default',
      _isDebug: boolean = false
    ) => {
      if (!commandTemplate) return
      // When this command is called from the command palette, the fileName and testName arguments are not passed (commands in package.json)
      // so then fileName is taken from the active text editor and it run for the whole file.
      if (!filePath) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          filePath = editor.document.fileName;
        }
      }

      console.log("Running", filePath, scriptName);

      const packageJsonPath = await getPackageJsonClosest(filePath);

      // if (activeTerminal) {
      //   activeTerminal.dispose();
      //   activeTerminal = null;
      // }

      const cwd =
        packageJsonPath ||
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
        process.cwd();
      const relativePath = path.relative(cwd, filePath).replace(/\\/g, '/');

      const message =
        `Running script \x1b[1m\x1b[32m${scriptName || relativePath}\x1b[0m`;
      const terminalOptions: vscode.TerminalOptions = {
        cwd,
        name: "Run - " + (scriptName || 'script'),
        location: vscode.TerminalLocation.Panel,
        message,
      };
      activeTerminal = vscode.window.createTerminal(terminalOptions);
      const command = commandTemplate.replace('{filePath}', relativePath).replace('{scriptName}', scriptName);
      activeTerminal.sendText(command);
      activeTerminal.show();
    }
  );

  context.subscriptions.push(runCommand);
}
