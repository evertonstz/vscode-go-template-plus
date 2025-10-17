# Go Template+ High‑Fidelity Highlight Project

## 1. Overview

Go Template+ extends the original [Go template VS Code extension](https://github.com/jinliming2/vscode-go-template) by adding:

- Underlying (base) language detection (HTML, YAML, JSON, Markdown, Shell, SQL, Plaintext).
- An explicit inline directive to force the base language.
- High‑fidelity merged highlighting: original Go template constructs plus native base language tokenization.
- A virtual document mapping technique using TextMate grammars and semantic tokens.
- Status bar and command utilities.

This document captures the technical design, roadmap, implementation plan, guidelines, and risk analysis for the “Phase 3” approach (direct jump to high-fidelity highlighting).

---

## 2. Goals & Non‑Goals

### Goals
- Preserve accurate column/line mapping between original template file and base language tokens.
- Allow deterministic override via directive: `{{/*meta: base=html*/}}`.
- Provide automatic heuristic fallback when no directive is present.
- Support multiple base languages without maintaining a monolithic static grammar.
- Deliver semantic tokens (colorization) for both template and base code.
- Keep performance acceptable for typical template sizes (< 1 MB).

### Non‑Goals (Initial)
- Full static analysis or linting of template pipelines.
- Execution/runtime validation of templates.
- AST-level merging (scope-level semantics like HTML attribute value parsing inside template interpolations).
- Multi-line / multi-directive or region-level base language switching (future embedding design).

---

## 3. Directive Specification

Placed on the first line, valid Go template block comment:
```
{{/*meta: base=html*/}}
```

Key: `base=<languageId>`

Parsing rules:
- Regex: `^\s*\{\{\s*\/\*meta:\s*(.*?)\s*\*\/\s*\}\}\s*$`
- Split tokens by `;`, `,`, or whitespace.
- Only `base` recognized now; ignore unknown keys gracefully.

If directive exists and `goTemplate.baseLanguageDirective.enabled` is true, it overrides detection completely.

---

## 4. Underlying Language Detection

Order of precedence:
1. Directive (source = `directive`).
2. File extension mapping (source = `extension`).
3. Content heuristics (source = `content`).
4. Fallback `plaintext` (source = `fallback`).

Supported base languages (initial):
- html
- yaml
- json
- markdown
- shellscript
- sql
- plaintext

Extension mapping examples:
- `.html`, `.htm` → html
- `.yaml`, `.yml` → yaml
- `.json` → json
- `.md` → markdown
- `.sql` → sql
- `.sh` → shellscript

Heuristic signals (simplified):
- HTML: presence of `<html`, `<div`, `<!DOCTYPE`.
- YAML: many `key:` style lines, leading `---`.
- JSON: starts with `{`/`[` and contains `"key":`.
- Markdown: headers `#`, fenced code blocks, list markers.
- Shell: shebang `#!/bin/`, keywords `if`, `fi`, `for`.
- SQL: keywords `SELECT`, `CREATE`, `FROM`.

---

## 5. Virtual Document Mapping

### Motivation
Dynamic combination of template semantics + arbitrary base language grammar without constructing a monolithic integrated grammar.

### Process
1. Extract template spans using regex: `{{-?\s*[\s\S]*?-?}}`.
2. Build virtual base text: replace each template span with a space sequence of equal length (`' '.repeat(length)`) to preserve absolute offsets.
3. Tokenize virtual base text with TextMate grammar for detected base language.
4. Independently tokenize template spans (simple tokenizer).
5. Merge tokens:
   - Base tokens ignore whitespace-only (padding) segments.
   - Template tokens are inserted at their original locations.

### Offset Consistency
Because length is preserved, line/column calculations remain valid for:
- Diagnostics (future)
- Semantic tokens builder

---

## 6. TextMate Grammar Integration

Use `vscode-textmate` + `onigasm` (WASM) inside extension:
- Initialize Oniguruma WASM on activation.
- Maintain a registry instance.
- Map language → scope → grammar file name.
- Vendor necessary `.tmLanguage.json` grammar files into `grammars/`.
- Cache loaded grammars (`Map<string, IGrammar>`).

Language → Scope mapping:
| Language     | Scope              | File                     |
|--------------|--------------------|--------------------------|
| html         | text.html.basic    | html.tmLanguage.json     |
| yaml         | source.yaml        | yaml.tmLanguage.json     |
| json         | source.json        | json.tmLanguage.json     |
| markdown     | text.markdown      | markdown.tmLanguage.json |
| shellscript  | source.shell       | shellscript.tmLanguage.json |
| sql          | source.sql         | sql.tmLanguage.json      |
| plaintext    | text.plain         | plaintext.tmLanguage.json |

Fallback to plaintext if grammar missing.

---

## 7. Semantic Tokens Provider

Workflow (per document request):
1. Check cache by `TextDocument.version`.
2. Detect base language.
3. Extract template spans.
4. Build virtual base buffer.
5. Tokenize line-by-line with TextMate grammar (maintain `ruleStack`).
6. Map each token's scope list → semantic token type + modifiers:
   - Template tokens have modifier `template`.
   - Base tokens have modifier `base`.
7. Skip tokens comprised entirely of whitespace.
8. Add template tokens (punctuation / keyword / variable / operator / function).
9. Build and cache semantic tokens.

Token Types (initial legend):
`keyword`, `variable`, `string`, `number`, `operator`, `tag`, `attribute`, `function`, `comment`, `punctuation`, `text`

Modifiers:
`template`, `base`

---

## 8. Template Tokenization (Current)

Naive classification inside `{{ ... }}`:
- Delimiters: `{{` and `}}` → `punctuation`
- Keywords set: `if`, `else`, `end`, `range`, `with`, `block`, `define`, `template` → `keyword`
- Variables: Tokens starting with `.` → `variable`
- Pipe `|` → `operator`
- Bare identifiers (regex `^[A-Za-z_]\w*$`) → `function`
- Future: `$var` assignments, string literals, numeric constants, pipeline chains, trimming operators `{{-` / `-}}`.

---

## 9. Performance & Caching

Strategies:
- Semantic token caching keyed by `document.version`.
- Debounce status updates (configuration `goTemplate.semantic.refreshDebounceMs`).
- Limit tokenization for very large files (> 1 MB) by falling back to template-only highlighting.
- Potential future incremental tokenization: Track changed line ranges; re-tokenize only affected lines (needs diffing or text change events with ranges).

Memory considerations:
- Grammar cache per scope.
- Token cache per open document (WeakMap).

---

## 10. Configuration Options

| Setting                                   | Type    | Default | Description |
|-------------------------------------------|---------|---------|-------------|
| `goTemplate.baseLanguageDirective.enabled` | boolean | true    | Parse top-of-file directive for base language override. |
| `goTemplate.baseLanguageDetection.enabled` | boolean | true    | Enable heuristic detection if no directive present. |
| `goTemplate.semantic.refreshDebounceMs`    | number  | 300     | Debounce interval for status bar updates / reprocessing UI. |

Future settings:
- `goTemplate.maxFileSizeSemantic` (number of bytes).
- `goTemplate.heuristic.languages` (list of allowed base languages).
- `goTemplate.templateTokenizer.mode` (simple | advanced).

---

## 11. File & Module Structure

| File | Responsibility |
|------|----------------|
| `src/metaDirective.ts` | Directive parsing logic. |
| `src/detectBase.ts` | Language detection (directive, extension, heuristics). |
| `src/templateSpans.ts` | Extract template spans + build virtual base buffer. |
| `src/grammarLoader.ts` | Initialize TextMate registry & load grammars. |
| `src/scopeMapper.ts` | Map TextMate scopes → semantic token types/modifiers. |
| `src/templateTokenizer.ts` | Tokenize Go template content. |
| `src/semanticProvider.ts` | Merge tokens and build semantic tokens. |
| `src/extension.ts` | Activation, status bar, registration. |
| `grammars/*.tmLanguage.json` | Vendored TextMate grammars. |
| `language-configuration.json` | Basic language config (comments, brackets). |
| `project.md` | Project documentation (this file). |

---

## 12. Development Workflow

1. Fork upstream repository.
2. Add new files & adjust `package.json` (name/displayName/version).
3. Vendor required grammars (respect licenses; include acknowledgments).
4. Implement semantic tokens provider.
5. Add directive & detection logic.
6. Test across sample templates.
7. Optimize performance (cache / debounce).
8. Publish pre-release (e.g., `0.2.0-beta.1`).
9. Gather feedback; refine scope mappings and token types.

---

## 13. Testing Strategy

### Unit Tests (suggested via `ts-node` or simple harness)
- Directive parsing edge cases (spaces, unknown keys, missing).
- Span extraction with nested or trimmed template markers: `{{- ... -}}`.
- Virtual buffer length == original length; mapping integrity.

### Integration (Manual / VS Code)
- HTML template file with directive vs heuristic.
- Large YAML template manifest (> 5k lines).
- Mixed content Markdown template.
- Performance under rapid edits (typing inside HTML surrounding template expression).
- Fallback to plaintext when grammar intentionally removed.

### Visual
- Confirm distinct coloring for template keywords vs base tags/attributes.
- Ensure template padding areas do not produce phantom tokens.

### Edge Cases
- Template expression inside HTML attribute: `<div class="{{ .Class }}">`
- Multiple directives (should only honor first line).
- Unknown directive base (should fallback and show clear status tooltip).

---

## 14. Roadmap

| Version | Features |
|---------|----------|
| 0.2.x   | Initial high-fidelity semantic tokens; directive + detection. |
| 0.3.x   | Advanced template parser (pipeline, assignments, string & number tokens). |
| 0.4.x   | Incremental tokenization (re-tokenize changed lines). |
| 0.5.x   | Embedding hints (future: base segmentation + inner language variations). |
| 0.6.x   | Diagnostics (mismatch between directive + heuristics, unknown identifiers). |
| 0.7.x   | Formatter awareness (strip trailing spaces while preserving spans). |
| 1.0.0   | Stable release; performance benchmarks; documentation & examples. |

---

## 15. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regex over-matching template spans | Incorrect highlighting alignment | Replace regex with a state machine parser for `{{`/`}}`. |
| Grammar file licensing issues | Legal / distribution blockers | Maintain attribution & license copies; vendor only permissive licensed grammars. |
| Performance degradation on large files | User experience / slow typing | Implement size threshold fallback + incremental diffing. |
| Scope mapping insufficiency | Poor color fidelity across languages | Gradually refine mapping tables; allow user overrides (future config). |
| Directive misuse (typos) | Wrong highlight or confusion | Tooltip reveals detection source; optional diagnostic for unknown base. |
| Upstream changes (original extension) | Divergence / maintenance overhead | Document differences; optionally contribute back or coordinate. |

---

## 16. Future Enhancements (Ideas)

- Template structural outline: show ranges (`range`, `if`, `define`) in VS Code Outline.
- Folding regions aligned with template blocks (`{{ range }}` to `{{ end }}`).
- Hover provider for template identifiers (e.g., `.Title`, `.Items`) using a pluggable data model.
- Go-to-definition for template-defined blocks (`{{ define "header" }}`).
- Template partial usage metrics (analysis tool).
- Workspace indexing for template block names.

---

## 17. Contribution Guidelines (Draft)

1. Open an issue describing enhancement or bug.
2. For grammar additions: include license and source origin.
3. PR checklist:
   - Run `npm run build`.
   - Include test sample under `test-samples/` if adding detection rule.
   - Update `project.md` if architecture changes.
4. Avoid adding heavyweight parsing dependencies without discussion.

Coding style:
- TypeScript strict mode.
- Prefer small pure functions.
- Avoid premature optimization; document hotspots if encountered.

---

## 18. Licensing & Attribution

- Base project: MIT (original upstream).
- Vendored grammars may have MIT / BSD licenses—retain original notices in `grammars/LICENSES/`.
- New code (this fork) remains MIT.

README should credit:
> “Forked and extended from jinliming2/vscode-go-template for advanced multi-language semantic highlighting.”

---

## 19. Open Questions

| Question | Decision Needed |
|----------|-----------------|
| Do we expose user-custom grammar mappings? | Possibly via `goTemplate.grammarOverrides` later. |
| Should directive support dialect (e.g., `base=html dialect=handlebars`)? | Future, once multi-engine embedding added. |
| Provide telemetry on language detection accuracy? | Optional; requires user consent. |
| Support nested template engines? (e.g., HTML + Go templates + embedded JS) | Might require multi-pass merging; evaluate after 1.0. |

---

## 20. Quick Start (Developer)

1. Clone fork.
2. Install dependencies: `npm install`.
3. Add grammar files to `grammars/`.
4. Launch VS Code with extension host: `F5`.
5. Open a `.tmpl` file containing directive.
6. Observe status bar & merged highlighting.

---

## 21. Example

HTML Template with directive:
```html
{{/*meta: base=html*/}}
<!DOCTYPE html>
<html>
  <head>
    <title>{{ .Title }}</title>
  </head>
  <body>
    {{ range .Items }}
      <div class="item">{{ . }}</div>
    {{ end }}
  </body>
  </html>
```

YAML Template (heuristic detection):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Name }}
data:
  KEY: {{ .Value }}
```

---

## 22. Minimal Implementation Tasks Checklist

- [ ] Fork upstream repo.
- [ ] Update `package.json` (name/displayName/version).
- [ ] Add configuration entries.
- [ ] Implement directive parser.
- [ ] Implement base detection heuristics.
- [ ] Implement template span extraction & virtual base builder.
- [ ] Vendor grammars & add loader.
- [ ] Implement semantic tokens provider + legend.
- [ ] Implement scope mapper (initial).
- [ ] Implement naive template tokenizer.
- [ ] Add status bar integration.
- [ ] Performance test on large files.
- [ ] Prepare README and publish pre-release.

---

## 23. Maintenance Strategy

- Maintain compatibility with upstream: periodically merge improvements to original template grammar if relevant.
- Keep grammar versions documented (commit hash or source version).
- Add CHANGELOG entries for each release including: Added / Changed / Fixed / Performance / Internal.

---

## 24. CHANGELOG Template (For Future)

```
## [0.2.0] - YYYY-MM-DD
### Added
- High-fidelity semantic token merging.
- Directive override parsing.

### Changed
- Status bar now shows detection source.

### Fixed
- Span extraction handles trimmed delimiters `{{-` / `-}}`.

### Performance
- Added caching by document version.

### Internal
- Introduced scope mapping module.
```

---

## 25. Definitions / Glossary

| Term | Meaning |
|------|--------|
| Template Span | Region between `{{` and `}}` including delimiters. |
| Virtual Base Buffer | Modified content with spans replaced by equal-length spaces. |
| TextMate Grammar | Pattern-based tokenizer emitted from `.tmLanguage.json`. |
| Semantic Tokens | Structured tokens for colorization defined by VS Code API. |
| Directive | Top-of-file comment providing explicit metadata (base language). |

---

## 26. Final Notes

Jumping directly to Phase 3 is valid: complexity rises, but modular separation (directive, detection, spans, grammar loader, semantic provider) keeps maintainability manageable. Start with correct layering; refine token quality incrementally.

Feel free to iterate on scope mappings and tokenizer accuracy as user feedback arrives.

---

## 27. Contact / Support

Open issues in the fork repository for:
- New base language requests
- Incorrect highlighting / scope mapping
- Performance regressions
- Directive parsing bugs

---

(End of Project Documentation)
