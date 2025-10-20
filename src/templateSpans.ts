/**
 * Template span extraction and virtual buffer generation
 * Extracts {{ ... }} spans and replaces them with spaces for base language tokenization
 */

export interface TemplateSpan {
  start: number; // Absolute character offset
  end: number; // Absolute character offset (exclusive)
  content: string; // The full template span including delimiters
}

/**
 * Extract all template spans from text
 * Handles: {{...}}, {{-...}}, {{...-}}, {{-...-}}
 */
export function extractTemplateSpans(text: string): TemplateSpan[] {
  const spans: TemplateSpan[] = [];
  const regex = /\{\{-?[\s\S]*?-?\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  return spans;
}

/**
 * Build a virtual buffer by replacing template spans with equal-length spaces
 * This preserves absolute character offsets for base language tokenization
 */
export function buildVirtualBuffer(text: string, spans: TemplateSpan[]): string {
  if (spans.length === 0) {
    return text;
  }

  let result = '';
  let lastEnd = 0;

  for (const span of spans) {
    // Add text before the span
    result += text.substring(lastEnd, span.start);
    // Replace span with spaces of equal length
    result += ' '.repeat(span.end - span.start);
    lastEnd = span.end;
  }

  // Add remaining text after last span
  result += text.substring(lastEnd);

  return result;
}

/**
 * Check if a character offset is inside a template span
 */
export function isInsideTemplateSpan(offset: number, spans: TemplateSpan[]): boolean {
  return spans.some((span) => offset >= span.start && offset < span.end);
}

/**
 * Get the template span containing a given offset, if any
 */
export function getSpanAtOffset(offset: number, spans: TemplateSpan[]): TemplateSpan | null {
  return spans.find((span) => offset >= span.start && offset < span.end) || null;
}

/**
 * Convert absolute offset to line and column (0-based)
 */
export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 0;
  let column = 0;

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Convert line and column (0-based) to absolute offset
 */
export function lineColumnToOffset(text: string, line: number, column: number): number {
  let currentLine = 0;
  let offset = 0;

  for (let i = 0; i < text.length; i++) {
    if (currentLine === line && offset - getLineStart(text, i) === column) {
      return offset;
    }

    if (text[i] === '\n') {
      currentLine++;
    }
    offset++;
  }

  // If we reach here, return end of text
  return text.length;
}

/**
 * Get the start offset of the line containing the given offset
 */
function getLineStart(text: string, offset: number): number {
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '\n') {
      return i + 1;
    }
  }
  return 0;
}

/**
 * Validate that original and virtual buffers have the same length
 */
export function validateBufferParity(original: string, virtual: string): boolean {
  return original.length === virtual.length;
}
