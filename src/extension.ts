import * as vscode from 'vscode';
import { goTemplateLegend } from './GoTemplateSemanticTokensProvider';
import MarkdownGoTemplateSemanticTokensProvider from './MarkdownGoTemplateSemanticTokensProvider';
import { initializeOnigLib } from './grammarLoader';
import { createCombinedLegend, MergedSemanticTokensProvider } from './semanticProvider';
import { parseDirectiveFromText } from './metaDirective';

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

  // Auto-switch to go-template on directive detection
  setupAutoSwitch(context);

  // React to template style changes
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('go-template.templateStyle')) {
      applyTemplateStyle();
    }
  });
  applyTemplateStyle();

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

  // Associate *.tmpl/*.tpl with go-template (Workspace scope)
  context.subscriptions.push(
    vscode.commands.registerCommand('go-template.associateTemplates', async () => {
      const filesConfig = vscode.workspace.getConfiguration('files');
      const existing = (filesConfig.get<Record<string, string>>('associations') || {}) as Record<
        string,
        string
      >;
      const updated = { ...existing, '*.tmpl': 'go-template', '*.tpl': 'go-template' };
      await filesConfig.update('associations', updated, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(
        'Associated *.tmpl and *.tpl with go-template in this workspace.',
      );
    }),
  );

  // Remove go-template associations for *.tmpl/*.tpl (Workspace scope)
  context.subscriptions.push(
    vscode.commands.registerCommand('go-template.removeTemplateAssociations', async () => {
      const filesConfig = vscode.workspace.getConfiguration('files');
      const existing = (filesConfig.get<Record<string, string>>('associations') || {}) as Record<
        string,
        string
      >;
      const { ['*.tmpl']: _t, ['*.tpl']: _p, ...rest } = existing;
      await filesConfig.update('associations', rest, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(
        'Removed go-template associations for *.tmpl and *.tpl in this workspace.',
      );
    }),
  );

  // Associate *.tmpl/*.tpl with go-template (Global scope)
  context.subscriptions.push(
    vscode.commands.registerCommand('go-template.associateTemplatesGlobal', async () => {
      const filesConfig = vscode.workspace.getConfiguration('files');
      const existing = (filesConfig.get<Record<string, string>>('associations') || {}) as Record<
        string,
        string
      >;
      const updated = { ...existing, '*.tmpl': 'go-template', '*.tpl': 'go-template' };
      await filesConfig.update('associations', updated, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        'Associated *.tmpl and *.tpl with go-template globally.',
      );
    }),
  );

  // Remove go-template associations for *.tmpl/*.tpl (Global scope)
  context.subscriptions.push(
    vscode.commands.registerCommand('go-template.removeTemplateAssociationsGlobal', async () => {
      const filesConfig = vscode.workspace.getConfiguration('files');
      const existing = (filesConfig.get<Record<string, string>>('associations') || {}) as Record<
        string,
        string
      >;
      const { ['*.tmpl']: _t, ['*.tpl']: _p, ...rest } = existing;
      await filesConfig.update('associations', rest, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        'Removed go-template associations for *.tmpl and *.tpl globally.',
      );
    }),
  );
};

const applyTemplateStyle = (): void => {
  const config = vscode.workspace.getConfiguration('go-template');
  const style = config.get<string>('templateStyle', 'italic');

  // Map to VS Code fontStyle strings
  let fontStyle = '';
  switch (style) {
    case 'bold':
      fontStyle = 'bold';
      break;
    case 'italic+bold':
      fontStyle = 'italic bold';
      break;
    case 'none':
      fontStyle = '';
      break;
    case 'italic':
    default:
      fontStyle = 'italic';
  }

  // Apply to current window via workbench config overrides
  const editorConfig = vscode.workspace.getConfiguration('editor');
  const current = editorConfig.get<any>('semanticTokenColorCustomizations') || {};
  const allThemes = current['[*]'] || {};
  const rules = { ...(allThemes.rules || {}), ['*.template']: { fontStyle } };
  const next = { ...current, ['[*]']: { ...(allThemes || {}), enabled: true, rules } };
  editorConfig.update('semanticTokenColorCustomizations', next, vscode.ConfigurationTarget.Global);
};

/**
 * Auto-switch to go-template when {{/*meta: ...* /}} directive is detected.
 * Gated by go-template.autoSwitchFromDirective setting (default: off).
 */
const setupAutoSwitch = (context: vscode.ExtensionContext): void => {
  const switched = new WeakSet<vscode.TextDocument>();

  const maybeSwitch = (doc: vscode.TextDocument) => {
    const cfg = vscode.workspace.getConfiguration('go-template');
    if (!cfg.get<boolean>('autoSwitchFromDirective', true)) {
      return;
    }
    // Already switched or already go-template
    if (doc.languageId === 'go-template' || switched.has(doc)) {
      return;
    }
    // Don't convert whole markdown files
    if (doc.languageId === 'markdown') {
      return;
    }

    // Read first 1-2 lines
    const firstTwo = doc.getText(new vscode.Range(0, 0, Math.min(2, doc.lineCount), 0));
    const directive = parseDirectiveFromText(firstTwo);
    if (!directive) {
      return;
    }

    console.log(`[AutoSwitch] Switching ${doc.fileName} to go-template (detected: ${directive.base})`);

    // Switch to go-template
    vscode.languages.setTextDocumentLanguage(doc, 'go-template').then(
      () => {
        switched.add(doc);
      },
      (err) => {
        console.error('[AutoSwitch] Failed to switch document language:', err);
      },
    );
  };

  // On open
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(maybeSwitch));

  // On change (only for edits that touch line 0-1, with debounce)
  let changeTimer: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const touchesTop = e.contentChanges.some((c) => c.range.start.line <= 1);
      if (!touchesTop || e.document.lineCount < 1) {
        return;
      }

      console.log(`[AutoSwitch] Change detected in ${e.document.fileName}, lines 0-1`);

      if (changeTimer) {
        clearTimeout(changeTimer);
      }
      changeTimer = setTimeout(() => {
        maybeSwitch(e.document);
      }, 200);
    }),
  );

  // Check already-open documents on activation
  vscode.workspace.textDocuments.forEach(maybeSwitch);
};
