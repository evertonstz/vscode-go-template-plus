import chai, { expect } from 'chai';
import assertArrays from 'chai-arrays';
import * as vscode from 'vscode';
import { createCombinedLegend, MergedSemanticTokensProvider } from '../../semanticProvider';

chai.use(assertArrays);

suite('Merged Semantic Provider', () => {
  suite('createCombinedLegend', () => {
    test('Creates legend with all token types', () => {
      const legend = createCombinedLegend();
      expect(legend.tokenTypes).to.include('keyword');
      expect(legend.tokenTypes).to.include('variable');
      expect(legend.tokenTypes).to.include('string');
      expect(legend.tokenTypes).to.include('number');
      expect(legend.tokenTypes).to.include('tag');
      expect(legend.tokenTypes).to.include('attribute');
      expect(legend.tokenTypes).to.include('control');
      expect(legend.tokenTypes).to.include('builtin');
    });

    test('Creates legend with modifiers', () => {
      const legend = createCombinedLegend();
      expect(legend.tokenModifiers).to.include('template');
      expect(legend.tokenModifiers).to.include('base');
    });
  });

  suite('MergedSemanticTokensProvider', () => {
    let provider: MergedSemanticTokensProvider;
    let context: vscode.ExtensionContext;

    suiteSetup(async () => {
      // Get extension context from vscode.extensions API
      const ext = vscode.extensions.getExtension('evertonstz.vscode-go-template-plus');
      if (!ext) {
        throw new Error('Extension not found');
      }
      if (!ext.isActive) {
        await ext.activate();
      }
      context = ext.exports?.context || ({} as vscode.ExtensionContext);
      provider = new MergedSemanticTokensProvider(context);
    });

    test('Provides tokens for template-only file (no directive)', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '{{ .Title }}',
      });
      const tokens = await provider.provideDocumentSemanticTokens(doc);
      expect(tokens).to.not.be.null;
      expect(tokens?.data).to.be.Uint32Array();
      expect(tokens?.data.length).to.be.greaterThan(0);
    });

    test('Provides tokens for file with directive (plaintext fallback)', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '{{/*meta: base=plaintext*/}}\nHello {{ .World }}',
      });
      const tokens = await provider.provideDocumentSemanticTokens(doc);
      expect(tokens).to.not.be.null;
      expect(tokens?.data).to.be.Uint32Array();
    });

    test('Caches tokens by document version', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '{{ .Data }}',
      });

      const tokens1 = await provider.provideDocumentSemanticTokens(doc);
      const tokens2 = await provider.provideDocumentSemanticTokens(doc);

      // Should return same instance due to caching
      expect(tokens1).to.equal(tokens2);
    });

    test('Handles empty document', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '',
      });
      const tokens = await provider.provideDocumentSemanticTokens(doc);
      expect(tokens).to.not.be.null;
    });

    test('Handles document without templates', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: 'Plain text without any templates',
      });
      const tokens = await provider.provideDocumentSemanticTokens(doc);
      expect(tokens).to.not.be.null;
    });

    test('Handles multi-line template', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: `{{ if .Show }}
  {{ .Content }}
{{ end }}`,
      });
      const tokens = await provider.provideDocumentSemanticTokens(doc);
      expect(tokens).to.not.be.null;
      expect(tokens?.data).to.be.Uint32Array();
      expect(tokens?.data.length).to.be.greaterThan(0);
    });
  });
});
