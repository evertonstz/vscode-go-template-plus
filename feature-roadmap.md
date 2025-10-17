# Go Template+ Feature Roadmap

A practical, tickable roadmap for implementing high‑fidelity merged highlighting. Check off items as they’re completed.

## Phase 0 — Project Setup
- [x] Fork upstream repository
- [x] Update `package.json` (name, displayName, version)
- [x] Add `CONTRIBUTING.md` and `CHANGELOG.md` scaffolds
- [x] Align TypeScript config and lint rules

## Phase 1 — Configuration & Manifest
- [x] Add config: `goTemplate.baseLanguageDirective.enabled` (default: true)
- [x] Add config: `goTemplate.baseLanguageDetection.enabled` (default: true)
- [x] Add config: `goTemplate.semantic.refreshDebounceMs` (default: 300)
- [ ] (Optional) Add config: `goTemplate.maxFileSizeSemantic`
- [ ] (Optional) Add config: `goTemplate.heuristic.languages`
- [ ] (Optional) Add config: `goTemplate.templateTokenizer.mode` (simple | advanced)
- [x] Add semantic token modifiers: `template`, `base`
- [x] Add/extend semantic token types: `keyword`, `variable`, `string`, `number`, `operator`, `tag`, `attribute`, `function`, `comment`, `punctuation`, `text`
- [x] Map token scopes (`semanticTokenScopes`) to reasonable TextMate scopes

## Phase 2 — Grammar Infrastructure
- [ ] Add dependencies: `vscode-textmate`, `onigasm`
- [ ] Package `onigasm.wasm` and load on activation
- [ ] Create `grammars/` directory
- [ ] Vendor permissively-licensed grammars with acknowledgements under `grammars/LICENSES/`
- [ ] Implement `src/grammarLoader.ts` (registry init, lazy cache)
- [ ] Implement language→scope→filename mapping table

## Phase 3 — Base Language Detection
- [ ] Implement `src/metaDirective.ts` (first-line directive parser)
- [ ] Implement `src/detectBase.ts` (directive → extension → content → fallback)
- [ ] Implement extension mapping: `.html`, `.yaml`, `.yml`, `.json`, `.md`, `.sql`, `.sh`
- [ ] Implement heuristics for HTML, YAML, JSON, Markdown, Shell, SQL
- [ ] Expose detection source to status bar/telemetry hooks

## Phase 4 — Template Span Extraction & Virtual Buffer
- [ ] Implement `src/templateSpans.ts` (extract `{{ ... }}`, incl. `{{-`/`-}}`)
- [ ] Build virtual base buffer (replace spans with equal-length spaces)
- [ ] Validate 1:1 length parity between original and virtual buffers
- [ ] Add helpers to translate offsets/line-columns as needed

## Phase 5 — Template Tokenizer (Keep/Extend)
- [ ] Keep current tokenizer (`match.ts`) plumbing
- [ ] Add support: `$var` assignments
- [ ] Add support: numeric constants
- [ ] Add support: string literals and escapes (reuse existing)
- [ ] Add support: trimming operators `{{-` / `-}}`
- [ ] Add tests for complex pipelines and control structures

## Phase 6 — TextMate Tokenization & Scope Mapping
- [ ] Tokenize virtual base buffer line-by-line with `ruleStack`
- [ ] Implement `src/scopeMapper.ts` to convert scope arrays → semantic token types/modifiers
- [ ] Skip tokens that are whitespace-only or padding regions
- [ ] Ensure base tokens carry modifier `base`; template tokens carry `template`

## Phase 7 — Merge Provider
- [ ] Implement `src/semanticProvider.ts` that merges base + template tokens
- [ ] Cache by `TextDocument.version` (WeakMap)
- [ ] Add size threshold fallback to template-only mode
- [ ] Register provider in `src/extension.ts`
- [ ] Route Markdown provider to the merged path for fenced `go-template`

## Phase 8 — Language Packs (Initial)
- [ ] HTML: add grammar and scope mappings
- [ ] YAML: add grammar and scope mappings
- [ ] JSON: add grammar and scope mappings
- [ ] Markdown: add grammar and scope mappings
- [ ] Shellscript: add grammar and scope mappings
- [ ] SQL: add grammar and scope mappings
- [ ] Plaintext: fallback coverage

## Phase 9 — UX & Status
- [ ] Status bar item: show detected base language + source (`directive`, `extension`, `content`, `fallback`)
- [ ] Add command: “Re-run Go Template+ analysis”
- [ ] Add tooltip/help linking to docs
- [ ] Debounce refreshes using config value

## Phase 10 — Testing & Validation
- [ ] Unit: directive parsing (edges, unknown keys, spacing)
- [ ] Unit: span extraction (nested, trimmed, multi-line)
- [ ] Unit: virtual buffer parity (length, line/col)
- [ ] Integration: directive vs heuristic detection correctness
- [ ] Integration: large YAML manifest performance
- [ ] Visual: HTML attributes with embedded template expression
- [ ] Visual: ensure no phantom tokens in padding

## Phase 11 — Documentation & Licensing
- [ ] Update `README.md` with usage, directive, settings, examples
- [ ] Add grammar attributions and license texts
- [ ] Update `CHANGELOG.md` with 0.2.x entries

## Phase 12 — Releases
- [ ] Prepare pre-release `0.2.0-beta.1`
- [ ] Publish pre-release
- [ ] Collect feedback and refine scope mappings
- [ ] Stabilize for `0.2.x` release

## Phase 13 — Post-0.2.x Roadmap
- [ ] 0.3.x: Advanced template parser (pipeline, assignments, string & number tokens)
- [ ] 0.4.x: Incremental tokenization (re-tokenize changed lines)
- [ ] 0.5.x: Embedding hints (region-based base segmentation)
- [ ] 0.6.x: Diagnostics (directive vs heuristic mismatch, unknown identifiers)
- [ ] 0.7.x: Formatter awareness (trim spaces while preserving spans)
- [ ] 1.0.0: Performance benchmarks, docs, examples, stability

---

### Acceptance Criteria Snapshot
- [ ] Offsets preserved between original and virtual buffers
- [ ] Base tokens + template tokens co-exist and are distinguishable by modifier
- [ ] Large files stay responsive (fallback or partial tokenization)
- [ ] Users can override base via directive and see it reflected in status bar
