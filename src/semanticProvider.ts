/**
 * Merged semantic tokens provider that combines base language + template tokens
 */

import * as vscode from 'vscode';
import { detectBaseLanguage } from './detectBase';
import { loadGrammarForLanguage } from './grammarLoader';
import { buildVirtualBuffer, extractTemplateSpans, TemplateSpan } from './templateSpans';
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
    const templateTokens = this.tokenizeTemplateSpans(text, spans);

    // Merge tokens
    return this.mergeTokens(baseTokens, templateTokens);
  }

  private tokenizeTemplateSpans(text: string, spans: TemplateSpan[]): ParsedToken[] {
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const allTemplateTokens = this.templateProvider['parseSource'](text, eol);

    // Filter to only tokens inside template spans
    const result: ParsedToken[] = [];
    for (const token of allTemplateTokens) {
      // Convert line/begin to absolute offset
      const lines = text.split(eol);
      let absoluteOffset = 0;
      for (let i = 0; i < token.line; i++) {
        absoluteOffset += lines[i].length + eol.length;
      }
      absoluteOffset += token.begin;

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

    // Convert template tokens to common format with 'template' modifier
    const templateModifierBit = 1 << this.legend.tokenModifiers.indexOf('template');
    const baseModifierBit = 1 << this.legend.tokenModifiers.indexOf('base');

    // Merge and sort all tokens by line, then column
    interface MergedToken {
      line: number;
      startChar: number;
      length: number;
      typeIndex: number;
      modifierBits: number;
    }

    const allTokens: MergedToken[] = [];

    // Add template tokens
    for (const token of templateTokens) {
      allTokens.push({
        line: token.line,
        startChar: token.begin,
        length: token.length,
        typeIndex: token.type,
        modifierBits: templateModifierBit,
      });
    }

    // Add base tokens
    for (const token of baseTokens) {
      const typeIndex = this.legend.tokenTypes.indexOf(token.type);
      if (typeIndex >= 0) {
        allTokens.push({
          line: token.line,
          startChar: token.startChar,
          length: token.length,
          typeIndex,
          modifierBits: baseModifierBit,
        });
      }
    }

    // Sort by line, then char
    allTokens.sort((a, b) => {
      if (a.line !== b.line) {
        return a.line - b.line;
      }
      return a.startChar - b.startChar;
    });

    // Build semantic tokens
    for (const token of allTokens) {
      builder.push(token.line, token.startChar, token.length, token.typeIndex, token.modifierBits);
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
