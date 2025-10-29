# Script runner for Visual Studio Code

By default, this extension display a "Run script" button above every function call script('_Script name_', whatever) in any files end with .script.{js,ts,tsx,jsx}
The function name, button(s) and command(s) can be customized.
For example to add button(s) for function foo, add the following settings to either .vscode/settings.json, extension settings or User settings. The "foo" is required, while other "foo-*" are to add more command buttons

```jsonc
{
  "fbc.scriptrunner.functions": {
    "foo": {
      "command": "npx tsx {filePath} {scriptName}",
      "title": "Run with tsx"
    },
    "foo-whatever-1": {
      "command": "npx ts-node {filePath} {scriptName}",
      "title": "Run with ts-node"
    },
    "foo-whatever-2": {
      "command": "echo 'Hello, world'",
      "title": "Hello"
    },
  }
}
```

**Example of usage**:

<!-- https://github.com/samuelgja/better-tests/blob/main/assets/example.png?raw=true -->
![result](https://github.com/cannd/script-runner/blob/main/assets/example.png?raw=true )

And the corresponding configuration file (.vscode/settings.json):
![configuration](https://github.com/cannd/script-runner/blob/main/assets/settings.png?raw=true )


## Configuration

### `.vscode/settings.json`

You can use the following configurations to customize the behavior of the Script runner extension.

```jsonc
{
  "fbc.scriptrunner.filePattern": {
    "type": "string",
    "default": "**/*.script.{js,ts,tsx,jsx}",
    "description": "Glob pattern to match test files (e.g., **/*.script.{js,ts,tsx,jsx})"
  },
  "fbc.scriptrunner.functions": {
    "type": "object",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "command": {
          "type": "string",
          "description": "Command to execute. Supported variables: {filePath} {scriptName}",
          "default": "npx tsx {filePath} {scriptName}"
        },
        "title": {
          "type": "string",
          "description": "Title to display",
          "default": "Run script"
        }
      }
    },
    "default": {
      "script": {
        "command": "npx tsx {filePath} {scriptName}",
        "title": "Run script"
      }
    }
  }
}
```
