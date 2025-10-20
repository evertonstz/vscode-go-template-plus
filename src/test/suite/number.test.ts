import chai, { expect } from 'chai';
import assertArrays from 'chai-arrays';
import * as vscode from 'vscode';
import GoTemplateSemanticTokensProvider from '../../GoTemplateSemanticTokensProvider';
import TokenType from '../../tokenType';

chai.use(assertArrays);

suite('Parse Numbers', () => {
  let provider: GoTemplateSemanticTokensProvider;

  suiteSetup(async () => {
    provider = new GoTemplateSemanticTokensProvider();
  });

  test('Parse integer', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '{{ 42 }}',
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      0, 0, 2, TokenType.begin, 0,
      0, 3, 2, TokenType.number, 0,
      0, 3, 2, TokenType.end, 0,
    ]);
  });

  test('Parse negative integer', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '{{ -5 }}',
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      0, 0, 2, TokenType.begin, 0,
      0, 3, 2, TokenType.number, 0,
      0, 3, 2, TokenType.end, 0,
    ]);
  });

  test('Parse float', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '{{ 3.14 }}',
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      0, 0, 2, TokenType.begin, 0,
      0, 3, 4, TokenType.number, 0,
      0, 5, 2, TokenType.end, 0,
    ]);
  });

  test('Parse negative float', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '{{ -2.5 }}',
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      0, 0, 2, TokenType.begin, 0,
      0, 3, 4, TokenType.number, 0,
      0, 5, 2, TokenType.end, 0,
    ]);
  });

  test('Parse numbers in expressions', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '{{ len .Items | add 10 }}',
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      0, 0, 2, TokenType.begin, 0,
      0, 3, 3, TokenType.builtin, 0,
      0, 4, 6, TokenType.property, 0,
      0, 7, 1, TokenType.pipe, 0,
      0, 6, 2, TokenType.number, 0,
      0, 3, 2, TokenType.end, 0,
    ]);
  });

  test('Parse zero', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '{{ 0 }}',
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      0, 0, 2, TokenType.begin, 0,
      0, 3, 1, TokenType.number, 0,
      0, 2, 2, TokenType.end, 0,
    ]);
  });
});
