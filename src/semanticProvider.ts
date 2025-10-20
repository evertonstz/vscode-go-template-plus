/**
 * Merged semantic tokens provider that combines base language + template tokens
 */

import * as vscode from 'vscode';
import { detectBaseLanguage } from './detectBase';
import { loadGrammarForLanguage } from './grammarLoader';
import {
  buildLineOffsets,
  buildVirtualBuffer,
  extractTemplateSpans,
  lineColumnToAbsolute,
  TemplateSpan,
} from './templateSpans';
import { BaseToken, tokenizeWithGrammar } from './textmateTokenizer';
import GoTemplateSemanticTokensProvider, { ParsedToken } from './GoTemplateSemanticTokensProvider';

// Cache for document versions
interface CacheEntry {
  version: number;
  tokens: vscode.SemanticTokens;
}

const documentCache = new WeakMap<vscode.TextDocument, CacheEntry>();

// Maximum file size for semantic tokenization (1 MB)
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Combined semantic token legend with modifiers
 */
export function createCombinedLegend(): vscode.SemanticTokensLegend {
  const tokenTypes = [
    'goTemplate',
    'begin',
    'end',
    'comment',
    'rawString',
    'string',
    'variable',
    'assignment',
    'pipe',
    'property',
    'control',
    'builtin',
    'stringEscape',
    'unknownEscape',
    'placeholder',
    'number',
    'class', // Standard type for HTML tags
    'type', // Standard type
    'tag',
    'attribute',
    'function',
    'operator',
    'keyword',
    'punctuation',
    'text',
  ];

  const tokenModifiers = ['template', 'base'];

  return new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
}

export class MergedSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  private context: vscode.ExtensionContext;
  private legend: vscode.SemanticTokensLegend;
  private templateProvider: GoTemplateSemanticTokensProvider;
  private directiveEnabled: boolean;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.legend = createCombinedLegend();
    this.templateProvider = new GoTemplateSemanticTokensProvider();

    // Get config
    const config = vscode.workspace.getConfiguration('go-template');
    this.directiveEnabled = config.get<boolean>('baseLanguageDirective.enabled', true);
  }

  public async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
  ): Promise<vscode.SemanticTokens | null> {
    // Check cache
    const cached = documentCache.get(document);
    if (cached && cached.version === document.version) {
      return cached.tokens;
    }

    // Check file size
    if (document.getText().length > MAX_FILE_SIZE) {
      // Fallback to template-only mode
      return this.provideTemplateOnlyTokens(document);
    }

    try {
      const tokens = await this.buildMergedTokens(document);
      documentCache.set(document, { version: document.version, tokens });
      return tokens;
    } catch (error) {
      console.error('Error building merged tokens:', error);
      // Fallback to template-only on error
      return this.provideTemplateOnlyTokens(document);
    }
  }

  private async buildMergedTokens(document: vscode.TextDocument): Promise<vscode.SemanticTokens> {
    const text = document.getText();

    // Detect base language
    const detection = detectBaseLanguage(text, this.directiveEnabled);

    // Precompute line offsets for fast position mapping
    const lineOffsets = buildLineOffsets(text);

    // Extract template spans
    const spans = extractTemplateSpans(text);

    // Build virtual buffer
    const virtualBuffer = buildVirtualBuffer(text, spans);

    // Tokenize base language (if not plaintext)
    let baseTokens: BaseToken[] = [];
    if (detection.languageId !== 'plaintext') {
      const grammar = await loadGrammarForLanguage(detection.languageId, this.context);
      if (grammar) {
        baseTokens = tokenizeWithGrammar(virtualBuffer, grammar);
      }
    }

    // Tokenize template spans
    const templateTokens = this.tokenizeTemplateSpans(text, spans, lineOffsets);

    // Merge tokens
    return this.mergeTokens(baseTokens, templateTokens);
  }

  private tokenizeTemplateSpans(
    text: string,
    spans: TemplateSpan[],
    lineOffsets: number[],
  ): ParsedToken[] {
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const allTemplateTokens = this.templateProvider['parseSource'](text, eol);

    // Filter to only tokens inside template spans
    const result: ParsedToken[] = [];
    for (const token of allTemplateTokens) {
      // Convert line/begin to absolute offset using precomputed offsets
      const absoluteOffset = lineColumnToAbsolute(lineOffsets, token.line, token.begin);

      // Check if inside a template span
      const inSpan = spans.some(
        (span) => absoluteOffset >= span.start && absoluteOffset < span.end,
      );

      if (inSpan) {
        result.push(token);
      }
    }

    return result;
  }

  private mergeTokens(
    baseTokens: BaseToken[],
    templateTokens: ParsedToken[],
  ): vscode.SemanticTokens {
    const builder = new vscode.SemanticTokensBuilder(this.legend);

    // Precompute modifier bits
    const templateModifierBit = 1 << this.legend.tokenModifiers.indexOf('template');
    const baseModifierBit = 1 << this.legend.tokenModifiers.indexOf('base');

    // Two-pointer merge (both arrays are already sorted by line, then char)
    let i = 0; // template tokens index
    let j = 0; // base tokens index

    while (i < templateTokens.length || j < baseTokens.length) {
      // Determine which token comes first
      const useTemplate =
        j >= baseTokens.length ||
        (i < templateTokens.length &&
          (templateTokens[i].line < baseTokens[j].line ||
            (templateTokens[i].line === baseTokens[j].line &&
              templateTokens[i].begin <= baseTokens[j].startChar)));

      if (useTemplate) {
        // Push template token
        const token = templateTokens[i];
        builder.push(token.line, token.begin, token.length, token.type, templateModifierBit);
        i++;
      } else {
        // Push base token
        const token = baseTokens[j];
        const typeIndex = this.legend.tokenTypes.indexOf(token.type);
        if (typeIndex >= 0) {
          builder.push(token.line, token.startChar, token.length, typeIndex, baseModifierBit);
        }
        j++;
      }
    }

    return builder.build();
  }

  private provideTemplateOnlyTokens(document: vscode.TextDocument): vscode.SemanticTokens {
    const text = document.getText();
    const eol = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
    const templateTokens = this.templateProvider['parseSource'](text, eol);

    const builder = new vscode.SemanticTokensBuilder(this.legend);
    const templateModifierBit = 1 << this.legend.tokenModifiers.indexOf('template');

    for (const token of templateTokens) {
      builder.push(token.line, token.begin, token.length, token.type, templateModifierBit);
    }

    return builder.build();
  }
}
