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

  // Check innermost scope first (most specific)
  const innerScope = scopes[0];

  // HTML/XML
  if (innerScope.includes('entity.name.tag')) {
    return { type: 'tag', modifiers: ['base'] };
  }
  if (innerScope.includes('entity.other.attribute-name')) {
    return { type: 'attribute', modifiers: ['base'] };
  }

  // Strings
  if (
    innerScope.includes('string.quoted') ||
    innerScope.includes('string.unquoted') ||
    innerScope.includes('string.interpolated')
  ) {
    return { type: 'string', modifiers: ['base'] };
  }

  // Comments
  if (innerScope.includes('comment')) {
    return { type: 'comment', modifiers: ['base'] };
  }

  // Keywords
  if (innerScope.includes('keyword.control') || innerScope.includes('keyword.other')) {
    return { type: 'keyword', modifiers: ['base'] };
  }
  if (innerScope.includes('storage.type') || innerScope.includes('storage.modifier')) {
    return { type: 'keyword', modifiers: ['base'] };
  }

  // Operators
  if (innerScope.includes('keyword.operator')) {
    return { type: 'operator', modifiers: ['base'] };
  }
  if (innerScope.includes('punctuation.separator')) {
    return { type: 'operator', modifiers: ['base'] };
  }

  // Numbers
  if (innerScope.includes('constant.numeric')) {
    return { type: 'number', modifiers: ['base'] };
  }

  // Functions
  if (innerScope.includes('entity.name.function') || innerScope.includes('support.function')) {
    return { type: 'function', modifiers: ['base'] };
  }

  // Variables
  if (innerScope.includes('variable')) {
    return { type: 'variable', modifiers: ['base'] };
  }

  // Properties
  if (innerScope.includes('support.type.property-name')) {
    return { type: 'property', modifiers: ['base'] };
  }

  // Punctuation
  if (
    innerScope.includes('punctuation.definition') ||
    innerScope.includes('punctuation.separator') ||
    innerScope.includes('punctuation.terminator') ||
    innerScope.includes('punctuation.section')
  ) {
    return { type: 'punctuation', modifiers: ['base'] };
  }

  // Meta/markup
  if (innerScope.includes('meta.tag')) {
    return { type: 'punctuation', modifiers: ['base'] };
  }

  // Constants (booleans, etc.)
  if (innerScope.includes('constant.language')) {
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
