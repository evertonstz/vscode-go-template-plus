import * as vscode from 'vscode';
import { goTemplateLegend } from './GoTemplateSemanticTokensProvider';
import MarkdownGoTemplateSemanticTokensProvider from './MarkdownGoTemplateSemanticTokensProvider';
import { initializeOnigLib } from './grammarLoader';
import { createCombinedLegend, MergedSemanticTokensProvider } from './semanticProvider';

const CONFIG_SECTION = 'go-template';

const getConfig = (): { languages: vscode.DocumentFilter[]; patterns: vscode.DocumentFilter[] } => {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    languages: (config.get<string[]>('languages') || []).map<vscode.DocumentFilter>((language) => ({
      language,
    })),
    patterns: (config.get<string[]>('patterns') || []).map<vscode.DocumentFilter>((pattern) => ({
      pattern,
    })),
  };
};

const registerProvider = (context: vscode.ExtensionContext, selector: vscode.DocumentFilter[]) => {
  let disposable: { dispose(): void } | undefined;
  while ((disposable = context.subscriptions.pop())) {
    disposable.dispose();
  }

  const combinedLegend = createCombinedLegend();

  // Always register for go-template language
  const goTemplateSelector: vscode.DocumentFilter[] = [{ language: 'go-template' }];
  const allSelectors = [...goTemplateSelector, ...selector];

  if (allSelectors.length > 0) {
    context.subscriptions.push(
      vscode.languages.registerDocumentSemanticTokensProvider(
        allSelectors,
        new MergedSemanticTokensProvider(context),
        combinedLegend,
      ),
    );
  }

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      [{ language: 'markdown' }],
      new MarkdownGoTemplateSemanticTokensProvider(),
      goTemplateLegend,
    ),
  );
};

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  // Initialize Oniguruma WASM
  try {
    await initializeOnigLib(context);
  } catch (error) {
    console.error(
      'Failed to initialize Oniguruma WASM, falling back to template-only mode:',
      error,
    );
    vscode.window.showWarningMessage(
      'Go Template+: Failed to load base language support. Only template highlighting available.',
    );
  }

  const { languages, patterns } = getConfig();
  registerProvider(context, [...languages, ...patterns]);

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration(CONFIG_SECTION)) {
      return;
    }

    const { languages, patterns } = getConfig();
    registerProvider(context, [...languages, ...patterns]);
  });

  vscode.commands.registerCommand('go-template.reload', () => {
    vscode.window.showInformationMessage('Reloading Go Template Syntax Support.');
    const { languages, patterns } = getConfig();
    registerProvider(context, [...languages, ...patterns]);
  });
};
