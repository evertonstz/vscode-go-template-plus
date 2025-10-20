import { parseDirectiveFromText } from './metaDirective';

export type DetectionSource = 'directive' | 'fallback';

export interface BaseLanguageDetection {
  languageId: string;
  source: DetectionSource;
}

/**
 * Detect base language using directive or fallback to plaintext
 * Only supports {{/ *meta: base=html* /}} directive detection for now
 */
export function detectBaseLanguage(text: string, directiveEnabled = true): BaseLanguageDetection {
  // Try directive (if enabled)
  if (directiveEnabled) {
    const directive = parseDirectiveFromText(text);
    if (directive?.base) {
      return {
        languageId: directive.base,
        source: 'directive',
      };
    }
  }

  return {
    languageId: 'plaintext',
    source: 'fallback',
  };
}
