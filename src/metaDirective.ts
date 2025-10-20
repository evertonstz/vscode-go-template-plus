/**
 * Parses the meta directive from the first line of a Go template file.
 * Format: {{/ *meta: base=html* /}} (without spaces)
 */

export interface MetaDirective {
  base?: string;
}

const DIRECTIVE_REGEX = /^\s*\{\{-?\s*\/\*\s*meta:\s*(.*?)\s*\*\/\s*-?\}\}\s*$/;

/**
 * Parse a meta directive line
 * @param line The first line of the file
 * @returns Parsed directive object or null if not a valid directive
 */
export function parseMetaDirective(line: string): MetaDirective | null {
  const match = DIRECTIVE_REGEX.exec(line);
  if (!match) {
    return null;
  }

  const content = match[1];
  const directive: MetaDirective = {};

  // Split by semicolon, comma, or whitespace
  const tokens = content.split(/[;,\s]+/).filter((t) => t.length > 0);

  for (const token of tokens) {
    const [key, value] = token.split('=').map((s) => s.trim());
    if (key === 'base' && value) {
      directive.base = value;
    }
    // Future: support other keys like dialect, etc.
  }

  return directive;
}

/**
 * Extract the first line from document text
 * @param text Full document text
 * @returns First line
 */
export function getFirstLine(text: string): string {
  const eolIndex = text.indexOf('\n');
  return eolIndex >= 0 ? text.substring(0, eolIndex) : text;
}

/**
 * Parse meta directive from document text
 * @param text Full document text
 * @returns Parsed directive or null
 */
export function parseDirectiveFromText(text: string): MetaDirective | null {
  // Support directive on line 1, or on line 2 when line 1 is a shebang (#!/...)
  const lines = text.split(/\r?\n/);
  const candidate = lines.length > 0 && lines[0].startsWith('#!') ? lines[1] || '' : lines[0] || '';
  return parseMetaDirective(candidate);
}
