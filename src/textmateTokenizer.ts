/**
 * TextMate-based tokenization for base languages
 */

import * as vscode from 'vscode';
import { IGrammar, StateStack } from 'vscode-textmate';
import { mapScopeToSemanticToken, shouldSkipToken } from './scopeMapper';

export interface BaseToken {
  line: number;
  startChar: number;
  length: number;
  type: string;
  modifiers: string[];
}

/**
 * Tokenize text using a TextMate grammar
 * @param text The text to tokenize
 * @param grammar The loaded TextMate grammar
 * @returns Array of base tokens
 */
export function tokenizeWithGrammar(text: string, grammar: IGrammar): BaseToken[] {
  const tokens: BaseToken[] = [];
  const lines = text.split('\n');

  let ruleStack: StateStack | null = null;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Tokenize line
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;

    // Process tokens
    for (const token of result.tokens) {
      const tokenText = line.substring(token.startIndex, token.endIndex);

      // Skip whitespace-only tokens
      if (shouldSkipToken(tokenText)) {
        continue;
      }

      // Map scope to semantic token
      const semanticToken = mapScopeToSemanticToken(token.scopes);
      if (!semanticToken) {
        continue;
      }

      tokens.push({
        line: lineNum,
        startChar: token.startIndex,
        length: token.endIndex - token.startIndex,
        type: semanticToken.type,
        modifiers: semanticToken.modifiers,
      });
    }
  }

  return tokens;
}

/**
 * Convert base tokens to semantic tokens builder format
 * Assumes tokens are sorted by line then startChar
 */
export function baseTokensToSemanticTokens(
  tokens: BaseToken[],
  legend: vscode.SemanticTokensLegend,
): vscode.SemanticTokens {
  const builder = new vscode.SemanticTokensBuilder(legend);

  for (const token of tokens) {
    const typeIndex = legend.tokenTypes.indexOf(token.type);
    if (typeIndex < 0) {
      continue; // Skip unknown types
    }

    // Calculate modifier bitset
    let modifierBits = 0;
    for (const mod of token.modifiers) {
      const modIndex = legend.tokenModifiers.indexOf(mod);
      if (modIndex >= 0) {
        modifierBits |= 1 << modIndex;
      }
    }

    builder.push(token.line, token.startChar, token.length, typeIndex, modifierBits);
  }

  return builder.build();
}
