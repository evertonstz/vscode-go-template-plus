import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IGrammar, IOnigLib, Registry } from 'vscode-textmate';
import { loadWASM, OnigScanner, OnigString } from 'onigasm';

// Language ID → Scope Name → Grammar Filename mapping
const LANGUAGE_GRAMMAR_MAP: Record<string, { scope: string; filename: string }> = {
  html: { scope: 'text.html.basic', filename: 'html.tmLanguage.json' },
  yaml: { scope: 'source.yaml', filename: 'yaml.tmLanguage.json' },
  json: { scope: 'source.json', filename: 'json.tmLanguage.json' },
  markdown: { scope: 'text.html.markdown', filename: 'markdown.tmLanguage.json' },
  shellscript: { scope: 'source.shell', filename: 'shellscript.tmLanguage.json' },
  sql: { scope: 'source.sql', filename: 'sql.tmLanguage.json' },
  plaintext: { scope: 'text.plain', filename: 'plaintext.tmLanguage.json' },
};

let registry: Registry | null = null;
let onigLibInitialized = false;
const grammarCache = new Map<string, IGrammar | null>();

/**
 * Initialize Oniguruma WASM library
 */
export async function initializeOnigLib(context: vscode.ExtensionContext): Promise<void> {
  if (onigLibInitialized) {
    return;
  }

  try {
    const wasmPath = context.asAbsolutePath(path.join('grammars', 'onigasm.wasm'));
    const wasmBin = fs.readFileSync(wasmPath).buffer;
    await loadWASM(wasmBin);
    onigLibInitialized = true;
  } catch (error) {
    console.error('Failed to load onigasm.wasm:', error);
    throw error;
  }
}

/**
 * Create an IOnigLib implementation using onigasm
 */
function createOnigLib(): IOnigLib {
  return {
    createOnigScanner: (patterns: string[]) => new OnigScanner(patterns),
    createOnigString: (str: string) => new OnigString(str),
  };
}

/**
 * Get or initialize the TextMate registry
 */
export function getRegistry(context: vscode.ExtensionContext): Registry {
  if (!registry) {
    if (!onigLibInitialized) {
      throw new Error('Oniguruma WASM not initialized. Call initializeOnigLib first.');
    }

    registry = new Registry({
      onigLib: Promise.resolve(createOnigLib()),
      loadGrammar: async (scopeName: string) => {
        const grammarsDir = context.asAbsolutePath('grammars');

        // Find the grammar file for this scope
        for (const { scope, filename } of Object.values(LANGUAGE_GRAMMAR_MAP)) {
          if (scope === scopeName) {
            const grammarPath = path.join(grammarsDir, filename);
            if (fs.existsSync(grammarPath)) {
              const content = fs.readFileSync(grammarPath, 'utf-8');
              return JSON.parse(content);
            }
          }
        }

        return null;
      },
    });
  }

  return registry;
}

/**
 * Load a grammar for a given language ID
 */
export async function loadGrammarForLanguage(
  languageId: string,
  context: vscode.ExtensionContext,
): Promise<IGrammar | null> {
  // Check cache
  if (grammarCache.has(languageId)) {
    return grammarCache.get(languageId) || null;
  }

  // Get language mapping
  const mapping = LANGUAGE_GRAMMAR_MAP[languageId];
  if (!mapping) {
    console.warn(`No grammar mapping found for language: ${languageId}`);
    grammarCache.set(languageId, null);
    return null;
  }

  try {
    const reg = getRegistry(context);
    const grammar = await reg.loadGrammar(mapping.scope);
    grammarCache.set(languageId, grammar);
    return grammar;
  } catch (error) {
    console.error(`Failed to load grammar for ${languageId}:`, error);
    grammarCache.set(languageId, null);
    return null;
  }
}

/**
 * Get the scope name for a language ID
 */
export function getScopeForLanguage(languageId: string): string | null {
  return LANGUAGE_GRAMMAR_MAP[languageId]?.scope || null;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(languageId: string): boolean {
  return languageId in LANGUAGE_GRAMMAR_MAP;
}

/**
 * Clear the grammar cache
 */
export function clearGrammarCache(): void {
  grammarCache.clear();
}
