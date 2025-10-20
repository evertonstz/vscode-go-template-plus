# Go Template+ — Advanced Syntax Highlighting for VSCode

[![Launched](https://img.shields.io/badge/VSCode--Go--Template-launched-brightgreen.svg?logo=visual-studio-code)](https://github.com/evertonstz/vscode-go-template-plus)
[![GitHub license](https://img.shields.io/github/license/evertonstz/vscode-go-template-plus.svg)](https://raw.githubusercontent.com/evertonstz/vscode-go-template-plus/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/evertonstz/vscode-go-template-plus.svg)](https://github.com/evertonstz/vscode-go-template-plus/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/evertonstz/vscode-go-template-plus.svg)](https://github.com/evertonstz/vscode-go-template-plus/network)
[![GitHub issues](https://img.shields.io/github/issues/evertonstz/vscode-go-template-plus.svg)](https://github.com/evertonstz/vscode-go-template-plus/issues)

Advanced Go Template syntax highlighting with **base language detection** and **merged semantic tokens**.

> This project is a fork of [jinliming2/vscode-go-template](https://github.com/jinliming2/vscode-go-template) by [Liming Jin](https://github.com/jinliming2). The original extension provides excellent TextMate grammar-based highlighting for Go templates. This fork extends it with semantic token providers, base language detection, and integrated highlighting for underlying languages (HTML, YAML, JSON, Markdown, Shell, SQL, and more).

## Release

- **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=evertonstz.vscode-go-template-plus) / Recommend**
- [GitHub Release](https://github.com/evertonstz/vscode-go-template-plus/releases)

## Features

### Original Features (from jinliming2/vscode-go-template)

- **TextMate Grammar-Based Highlighting**: Uses VS Code's built-in TextMate grammar system to provide syntax highlighting for Go template constructs (`{{`, `}}`, `range`, `if`, `end`, variables, pipes, functions, strings, etc.).

- **Native Go Template Files**: Automatic highlighting for files with extensions `*.go.txt`, `*.go.tpl`, `*.go.tmpl`, `*.gtpl`.

  ![Template](./assets/screenshots/tpl.png)

- **Go Source File Injection**: Highlights Go templates embedded in Go string literals (both raw strings and double-quoted strings).

  ![Go](./assets/screenshots/go.png)

- **Limited Language Injections**: TextMate grammar injections for Go templates in `HTML`, `CSS`, `JS`, `JSON`, and `XML` files (hardcoded, no base language highlighting—only template constructs get colored).

  ![HTML](./assets/screenshots/html.png)

- **Markdown Code Blocks**: Highlights Go template syntax in fenced code blocks with `go-template` language identifier.

  ![Markdown](./assets/screenshots/markdown.png)

- **FirstLine Detection**: Automatically activates for files starting with a Go template comment pattern (e.g., `{{/* ... */}}`), regardless of extension.

  ![Comment](./assets/screenshots/comment.png)

- **Custom File Patterns**: Configure additional file extensions or glob patterns via `go-template.languages` (language IDs) and `go-template.patterns` (glob patterns). **Note**: The original implementation only highlighted template syntax (`{{...}}`), not the underlying language content.

  ![Custom](./assets/screenshots/custom.png)

### New Features (Go Template+)

- **Base Language Detection & Merged Highlighting**: Automatically detects the underlying language (HTML, YAML, JSON, Markdown, Shell, SQL, Plaintext) and provides high-fidelity syntax highlighting for both Go template constructs and the base language simultaneously.

- **Meta Directive Support**: Explicitly declare the base language with a top-of-file directive:
  ```go
  {{/*meta: base=html*/}}
  <!DOCTYPE html>
  <html>...</html>
  ```
  Supported on line 1, or line 2 if line 1 is a shebang (`#!/bin/bash`).

- **Auto-Switch on Directive Detection**: Automatically switch document language mode to `go-template` when a meta directive is detected (opt-in via `go-template.autoSwitchFromDirective` setting, enabled by default).

- **Customizable Template Styling**: Configure font style for template tokens (italic, bold, italic+bold, or none) via VS Code settings to distinguish template syntax from base language.

- **File Association Commands**: Quickly associate/disassociate `*.tmpl` and `*.tpl` files with `go-template` language mode via Command Palette:
  - `Go Template: Associate *.tmpl/*.tpl with go-template (Workspace)`
  - `Go Template: Remove go-template associations for *.tmpl/*.tpl (Workspace)`
  - Global variants also available

- **Optimized Performance**: Precomputed line offsets, two-pointer merge algorithm, and efficient virtual buffer construction for fast tokenization on large files.

- **Numeric Constants**: Support for integer and float literals in Go templates (`-123`, `3.14`, etc.).

- **Vendored Language Grammars**: Includes TextMate grammars for HTML, YAML, JSON, Markdown, Shellscript, SQL, and Plaintext—no external dependencies required.

## Configuration

Access settings via **Preferences: Open Settings (UI)** and search for "Go Template":

- **`go-template.templateStyle`**: Font style for template tokens (`italic`, `bold`, `italic+bold`, `none`). Default: `italic`.
- **`go-template.autoSwitchFromDirective`**: Automatically switch to `go-template` language mode when a meta directive is detected. Default: `true`.
- **`go-template.baseLanguageDirective.enabled`**: Parse top-of-file directive for base language override. Default: `true`.
- **`go-template.languages`**: Additional language IDs to enable Go template highlighting.
- **`go-template.patterns`**: File glob patterns (e.g., `**/*.yaml`, `**/*.{yaml,yml}`) to enable Go template highlighting.

**Note**: Extension-based and heuristic base language detection (without directive) are planned features—currently only directive-based detection and plaintext fallback are implemented.

## Commands

Available via Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> / <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>):

- **`Go Template: Reload Go Template Syntax Highlight Support`**: Manually reload the extension (useful if highlighting breaks).
- **`Go Template: Associate *.tmpl/*.tpl with go-template (Workspace)`**: Add file associations for `*.tmpl` and `*.tpl` in workspace settings.
- **`Go Template: Remove go-template associations for *.tmpl/*.tpl (Workspace)`**: Remove workspace-level file associations.
- **`Go Template: Associate *.tmpl/*.tpl with go-template (Global)`**: Add file associations globally (all workspaces).
- **`Go Template: Remove go-template associations for *.tmpl/*.tpl (Global)`**: Remove global file associations.

## Known Issues

1. This extension cannot bypass grammar check errors from Language Servers (e.g., HTML/YAML linters may flag template syntax as invalid).
2. Template syntax highlighting in some languages may need a reload. (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> → `go-template.reload`)
3. One pre-existing flaky test in `begin.end.test.ts` (timeout, unrelated to new features).

## Contributing & Development

See [feature.md](./feature.md) for technical design and [roadmap.md](./roadmap.md) for development progress.

### Running Tests
```bash
yarn install
yarn test
```

### Debugging
1. Open project in VS Code/Cursor
2. Press **F5** to launch Extension Development Host
3. Open **Help → Toggle Developer Tools** to view console logs

## Release Notes

[Changelog](./CHANGELOG.md)

## License

MIT — See [LICENSE](./LICENSE) for details.

Original work by [Liming Jin](https://github.com/jinliming2) ([jinliming2/vscode-go-template](https://github.com/jinliming2/vscode-go-template)).
Extended by [Everton Correia](https://github.com/evertonstz) ([evertonstz/vscode-go-template-plus](https://github.com/evertonstz/vscode-go-template-plus)).
