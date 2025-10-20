import chai, { expect } from 'chai';
import assertArrays from 'chai-arrays';
import * as vscode from 'vscode';
import GoTemplateSemanticTokensProvider from '../../GoTemplateSemanticTokensProvider';
import TokenType from '../../tokenType';

chai.use(assertArrays);

suite('Parse With', () => {
  let provider: GoTemplateSemanticTokensProvider;

  suiteSetup(async () => {
    provider = new GoTemplateSemanticTokensProvider();
  });

  test('Parse with-end', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: `
        {{ with .Value }}
          xxx
          xxxx
        {{ end }}
      `,
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      1, 8, 2, TokenType.begin, 0,
      0, 3, 4, TokenType.control, 0,
      0, 5, 6, TokenType.property, 0,
      0, 7, 2, TokenType.end, 0,
      3, 8, 2, TokenType.begin, 0,
      0, 3, 3, TokenType.control, 0,
      0, 4, 2, TokenType.end, 0,
    ]);
  });

  test('Parse with-else-end', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: `
        {{ with .Value }}
          xxx
             xxxx
          xxxx
        {{ else }}
          xxx
            xxx
          xxx
        {{ end }}
      `,
    });
    const tokens = await provider.provideDocumentSemanticTokens(doc);
    expect(tokens?.data).to.be.Uint32Array();
    // prettier-ignore
    expect(tokens?.data).to.be.equalTo([
      1, 8, 2, TokenType.begin, 0,
      0, 3, 4, TokenType.control, 0,
      0, 5, 6, TokenType.property, 0,
      0, 7, 2, TokenType.end, 0,
      4, 8, 2, TokenType.begin, 0,
      0, 3, 4, TokenType.control, 0,
      0, 5, 2, TokenType.end, 0,
      4, 8, 2, TokenType.begin, 0,
      0, 3, 3, TokenType.control, 0,
      0, 4, 2, TokenType.end, 0,
    ]);
  });
});
