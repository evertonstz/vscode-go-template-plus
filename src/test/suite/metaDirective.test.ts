import { expect } from 'chai';
import { getFirstLine, parseDirectiveFromText, parseMetaDirective } from '../../metaDirective';

suite('Meta Directive Parser', () => {
  suite('parseMetaDirective', () => {
    test('Parse valid directive with base', () => {
      const result = parseMetaDirective('{{/*meta: base=html*/}}');
      expect(result).to.deep.equal({ base: 'html' });
    });

    test('Parse directive with spaces', () => {
      const result = parseMetaDirective('  {{  /* meta:  base=yaml  */  }}  ');
      expect(result).to.deep.equal({ base: 'yaml' });
    });

    test('Parse directive with trimming markers', () => {
      const result = parseMetaDirective('{{- /*meta: base=json*/ -}}');
      expect(result).to.deep.equal({ base: 'json' });
    });

    test('Parse directive with multiple keys (semicolon)', () => {
      const result = parseMetaDirective('{{/*meta: base=html; future=value*/}}');
      expect(result).to.deep.equal({ base: 'html' });
    });

    test('Parse directive with multiple keys (comma)', () => {
      const result = parseMetaDirective('{{/*meta: base=markdown, other=ignored*/}}');
      expect(result).to.deep.equal({ base: 'markdown' });
    });

    test('Return null for invalid directive', () => {
      expect(parseMetaDirective('not a directive')).to.be.null;
      expect(parseMetaDirective('{{/* comment */')).to.be.null;
      expect(parseMetaDirective('{{ .Field }}')).to.be.null;
    });

    test('Return empty object for directive without base', () => {
      const result = parseMetaDirective('{{/*meta: other=value*/}}');
      expect(result).to.deep.equal({});
    });

    test('Return empty object for malformed base key', () => {
      const result = parseMetaDirective('{{/*meta: base*/}}');
      expect(result).to.deep.equal({});
    });
  });

  suite('getFirstLine', () => {
    test('Extract first line from single-line text', () => {
      expect(getFirstLine('single line')).to.equal('single line');
    });

    test('Extract first line from multi-line text', () => {
      const text = 'first line\nsecond line\nthird line';
      expect(getFirstLine(text)).to.equal('first line');
    });

    test('Handle empty text', () => {
      expect(getFirstLine('')).to.equal('');
    });

    test('Handle text with only newline', () => {
      expect(getFirstLine('\n')).to.equal('');
    });
  });

  suite('parseDirectiveFromText', () => {
    test('Parse directive from first line', () => {
      const text = '{{/*meta: base=html*/}}\n<html></html>';
      expect(parseDirectiveFromText(text)).to.deep.equal({ base: 'html' });
    });

    test('Return null when directive not on first line', () => {
      const text = '<html>\n{{/*meta: base=html*/}}\n</html>';
      expect(parseDirectiveFromText(text)).to.be.null;
    });

    test('Return null for text without directive', () => {
      const text = '<html>\n  <body></body>\n</html>';
      expect(parseDirectiveFromText(text)).to.be.null;
    });

    test('Directive allowed on line 2 when line 1 is shebang', () => {
      const text = '#!/bin/bash\n{{/*meta: base=shellscript*/}}\necho ok';
      expect(parseDirectiveFromText(text)).to.deep.equal({ base: 'shellscript' });
    });
  });
});
