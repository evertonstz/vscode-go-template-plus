/**
 * Maps TextMate scope names to semantic token types and modifiers
 */

export interface SemanticTokenInfo {
  type: string;
  modifiers: string[];
}

/**
 * Map a TextMate scope stack to semantic token type and modifiers
 * @param scopes Array of scope names from innermost to outermost
 * @returns Semantic token info or null if should be skipped
 */
export function mapScopeToSemanticToken(scopes: string[]): SemanticTokenInfo | null {
  if (!scopes || scopes.length === 0) {
    return null;
  }

  // Join all scopes to check for patterns (scopes are ordered most specific to least)
  const scopeString = scopes.join(' ');

  // HTML/XML - map to standard types that themes understand
  // Use 'class' for tag names (colored like type names in most themes)
  if (scopeString.includes('entity.name.tag')) {
    return { type: 'class', modifiers: ['base'] };
  }
  if (scopeString.includes('entity.other.attribute-name')) {
    return { type: 'property', modifiers: ['base'] };
  }

  // JavaScript/TypeScript Classes and Types
  if (
    scopeString.includes('entity.name.type.class') ||
    scopeString.includes('entity.name.type.interface')
  ) {
    return { type: 'class', modifiers: ['base'] };
  }
  if (
    scopeString.includes('entity.name.type.module') ||
    scopeString.includes('entity.name.type.namespace')
  ) {
    return { type: 'namespace', modifiers: ['base'] };
  }
  if (scopeString.includes('support.class') || scopeString.includes('support.type')) {
    return { type: 'class', modifiers: ['base'] };
  }
  if (scopeString.includes('variable.other.constant')) {
    return { type: 'variable', modifiers: ['base', 'readonly'] };
  }

  // Strings
  if (
    scopeString.includes('string.quoted') ||
    scopeString.includes('string.unquoted') ||
    scopeString.includes('string.interpolated')
  ) {
    return { type: 'string', modifiers: ['base'] };
  }

  // Comments
  if (scopeString.includes('comment')) {
    return { type: 'comment', modifiers: ['base'] };
  }

  // Keywords
  if (scopeString.includes('keyword.control') || scopeString.includes('keyword.other')) {
    return { type: 'keyword', modifiers: ['base'] };
  }
  if (scopeString.includes('storage.type') || scopeString.includes('storage.modifier')) {
    return { type: 'keyword', modifiers: ['base'] };
  }

  // Operators
  if (scopeString.includes('keyword.operator')) {
    return { type: 'operator', modifiers: ['base'] };
  }
  if (scopeString.includes('punctuation.separator')) {
    return { type: 'operator', modifiers: ['base'] };
  }

  // Numbers
  if (scopeString.includes('constant.numeric')) {
    return { type: 'number', modifiers: ['base'] };
  }

  // Functions
  if (scopeString.includes('entity.name.function') || scopeString.includes('support.function')) {
    return { type: 'function', modifiers: ['base'] };
  }

  // Variables
  if (scopeString.includes('variable')) {
    return { type: 'variable', modifiers: ['base'] };
  }

  // Properties
  if (scopeString.includes('support.type.property-name')) {
    return { type: 'property', modifiers: ['base'] };
  }

  // Punctuation
  if (
    scopeString.includes('punctuation.definition') ||
    scopeString.includes('punctuation.separator') ||
    scopeString.includes('punctuation.terminator') ||
    scopeString.includes('punctuation.section')
  ) {
    return { type: 'punctuation', modifiers: ['base'] };
  }

  // Meta/markup
  if (scopeString.includes('meta.tag')) {
    return { type: 'punctuation', modifiers: ['base'] };
  }

  // Constants (booleans, etc.)
  if (scopeString.includes('constant.language')) {
    return { type: 'variable', modifiers: ['base'] };
  }

  // Default to text for unrecognized scopes
  return { type: 'text', modifiers: ['base'] };
}

/**
 * Check if a token should be skipped (whitespace-only or padding)
 * @param text The text content of the token
 * @returns true if token should be skipped
 */
export function shouldSkipToken(text: string): boolean {
  return !text || /^\s+$/.test(text);
}
