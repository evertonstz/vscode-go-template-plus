import { expect } from 'chai';
import { detectBaseLanguage } from '../../detectBase';

suite('Base Language Detection', () => {
  suite('detectBaseLanguage', () => {
    test('Detect from directive', () => {
      const text = '{{/*meta: base=html*/}}\n<div></div>';
      const result = detectBaseLanguage(text);
      expect(result).to.deep.equal({
        languageId: 'html',
        source: 'directive',
      });
    });

    test('Detect different languages from directive', () => {
      const cases = [
        { text: '{{/*meta: base=yaml*/}}\nkey: value', expected: 'yaml' },
        { text: '{{/*meta: base=json*/}}\n{"key": "value"}', expected: 'json' },
        { text: '{{/*meta: base=markdown*/}}\n# Header', expected: 'markdown' },
        { text: '{{/*meta: base=sql*/}}\nSELECT * FROM table', expected: 'sql' },
        { text: '{{/*meta: base=shellscript*/}}\n#!/bin/bash', expected: 'shellscript' },
      ];

      for (const { text, expected } of cases) {
        const result = detectBaseLanguage(text);
        expect(result.languageId).to.equal(expected);
        expect(result.source).to.equal('directive');
      }
    });

    test('Fallback to plaintext when no directive', () => {
      const text = '<html>\n  <body></body>\n</html>';
      const result = detectBaseLanguage(text);
      expect(result).to.deep.equal({
        languageId: 'plaintext',
        source: 'fallback',
      });
    });

    test('Fallback when directive on wrong line', () => {
      const text = '<html>\n{{/*meta: base=html*/}}\n</html>';
      const result = detectBaseLanguage(text);
      expect(result).to.deep.equal({
        languageId: 'plaintext',
        source: 'fallback',
      });
    });

    test('Respect directiveEnabled=false', () => {
      const text = '{{/*meta: base=html*/}}\n<div></div>';
      const result = detectBaseLanguage(text, false);
      expect(result).to.deep.equal({
        languageId: 'plaintext',
        source: 'fallback',
      });
    });

    test('Handle empty text', () => {
      const result = detectBaseLanguage('');
      expect(result).to.deep.equal({
        languageId: 'plaintext',
        source: 'fallback',
      });
    });

    test('Handle directive with extra whitespace', () => {
      const text = '  {{  /* meta:  base=html  */  }}  \n<div></div>';
      const result = detectBaseLanguage(text);
      expect(result).to.deep.equal({
        languageId: 'html',
        source: 'directive',
      });
    });
  });
});
