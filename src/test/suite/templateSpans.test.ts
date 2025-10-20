import { expect } from 'chai';
import {
  buildVirtualBuffer,
  extractTemplateSpans,
  getSpanAtOffset,
  isInsideTemplateSpan,
  lineColumnToOffset,
  offsetToLineColumn,
  validateBufferParity,
} from '../../templateSpans';

suite('Template Spans', () => {
  suite('extractTemplateSpans', () => {
    test('Extract simple template span', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(1);
      expect(spans[0]).to.deep.equal({
        start: 6,
        end: 18,
        content: '{{ .World }}',
      });
    });

    test('Extract multiple template spans', () => {
      const text = '{{ .A }} middle {{ .B }}';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(2);
      expect(spans[0].content).to.equal('{{ .A }}');
      expect(spans[1].content).to.equal('{{ .B }}');
    });

    test('Extract template span with trimming markers', () => {
      const text = 'before {{- .Trim -}} after';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(1);
      expect(spans[0].content).to.equal('{{- .Trim -}}');
      expect(spans[0].start).to.equal(7);
      expect(spans[0].end).to.equal(20);
    });

    test('Extract mixed trimming markers', () => {
      const text = '{{- .Left }} {{ .Right -}}';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(2);
      expect(spans[0].content).to.equal('{{- .Left }}');
      expect(spans[1].content).to.equal('{{ .Right -}}');
    });

    test('Handle multi-line template spans', () => {
      const text = '{{ if .Cond }}\n  content\n{{ end }}';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(2);
      expect(spans[0].content).to.equal('{{ if .Cond }}');
      expect(spans[1].content).to.equal('{{ end }}');
    });

    test('Handle nested braces inside template', () => {
      const text = '{{ printf "%v" (dict "key" "val") }}';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(1);
      expect(spans[0].content).to.equal('{{ printf "%v" (dict "key" "val") }}');
    });

    test('Return empty array for text without templates', () => {
      const text = 'plain text without templates';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(0);
    });

    test('Handle empty text', () => {
      const spans = extractTemplateSpans('');
      expect(spans).to.have.lengthOf(0);
    });

    test('Handle adjacent template spans', () => {
      const text = '{{ .A }}{{ .B }}';
      const spans = extractTemplateSpans(text);
      expect(spans).to.have.lengthOf(2);
      expect(spans[0].end).to.equal(spans[1].start);
    });
  });

  suite('buildVirtualBuffer', () => {
    test('Replace template span with spaces', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      const virtual = buildVirtualBuffer(text, spans);
      expect(virtual).to.equal('hello              there');
      expect(virtual.length).to.equal(text.length);
    });

    test('Replace multiple spans', () => {
      const text = '{{ .A }} middle {{ .B }}';
      const spans = extractTemplateSpans(text);
      const virtual = buildVirtualBuffer(text, spans);
      expect(virtual).to.equal('         middle         ');
      expect(virtual.length).to.equal(text.length);
    });

    test('Preserve line breaks', () => {
      const text = '{{ .A }}\nmiddle\n{{ .B }}';
      const spans = extractTemplateSpans(text);
      const virtual = buildVirtualBuffer(text, spans);
      expect(virtual).to.equal('        \nmiddle\n        ');
      expect(virtual.length).to.equal(text.length);
    });

    test('Return original text when no spans', () => {
      const text = 'plain text';
      const virtual = buildVirtualBuffer(text, []);
      expect(virtual).to.equal(text);
    });

    test('Handle text that is only templates', () => {
      const text = '{{ .A }}{{ .B }}';
      const spans = extractTemplateSpans(text);
      const virtual = buildVirtualBuffer(text, spans);
      expect(virtual).to.equal('                ');
      expect(virtual.length).to.equal(text.length);
    });
  });

  suite('isInsideTemplateSpan', () => {
    test('Detect offset inside span', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      expect(isInsideTemplateSpan(10, spans)).to.be.true;
    });

    test('Detect offset outside span', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      expect(isInsideTemplateSpan(0, spans)).to.be.false;
      expect(isInsideTemplateSpan(20, spans)).to.be.false;
    });

    test('Span start is inside', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      expect(isInsideTemplateSpan(6, spans)).to.be.true;
    });

    test('Span end is outside', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      expect(isInsideTemplateSpan(18, spans)).to.be.false;
    });
  });

  suite('getSpanAtOffset', () => {
    test('Get span containing offset', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      const span = getSpanAtOffset(10, spans);
      expect(span).to.not.be.null;
      expect(span?.content).to.equal('{{ .World }}');
    });

    test('Return null when offset outside spans', () => {
      const text = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(text);
      expect(getSpanAtOffset(0, spans)).to.be.null;
      expect(getSpanAtOffset(20, spans)).to.be.null;
    });
  });

  suite('offsetToLineColumn', () => {
    test('Convert offset in single line', () => {
      const text = 'hello world';
      expect(offsetToLineColumn(text, 0)).to.deep.equal({ line: 0, column: 0 });
      expect(offsetToLineColumn(text, 6)).to.deep.equal({ line: 0, column: 6 });
    });

    test('Convert offset across multiple lines', () => {
      const text = 'line1\nline2\nline3';
      expect(offsetToLineColumn(text, 0)).to.deep.equal({ line: 0, column: 0 });
      expect(offsetToLineColumn(text, 6)).to.deep.equal({ line: 1, column: 0 });
      expect(offsetToLineColumn(text, 8)).to.deep.equal({ line: 1, column: 2 });
    });
  });

  suite('lineColumnToOffset', () => {
    test('Convert line/column in single line', () => {
      const text = 'hello world';
      expect(lineColumnToOffset(text, 0, 0)).to.equal(0);
      expect(lineColumnToOffset(text, 0, 6)).to.equal(6);
    });

    test('Convert line/column across multiple lines', () => {
      const text = 'line1\nline2\nline3';
      expect(lineColumnToOffset(text, 0, 0)).to.equal(0);
      expect(lineColumnToOffset(text, 1, 0)).to.equal(6);
      expect(lineColumnToOffset(text, 2, 0)).to.equal(12);
    });
  });

  suite('validateBufferParity', () => {
    test('Validate equal length buffers', () => {
      const original = 'hello {{ .World }} there';
      const spans = extractTemplateSpans(original);
      const virtual = buildVirtualBuffer(original, spans);
      expect(validateBufferParity(original, virtual)).to.be.true;
    });

    test('Detect length mismatch', () => {
      expect(validateBufferParity('hello', 'hi')).to.be.false;
    });

    test('Validate empty buffers', () => {
      expect(validateBufferParity('', '')).to.be.true;
    });
  });

  suite('Integration: Real template examples', () => {
    test('HTML template with Go constructs', () => {
      const text = `{{/*meta: base=html*/}}
<div class="{{ .ClassName }}">
  {{ if .ShowTitle }}
    <h1>{{ .Title }}</h1>
  {{ end }}
</div>`;
      const spans = extractTemplateSpans(text);
      const virtual = buildVirtualBuffer(text, spans);

      // Verify length parity
      expect(validateBufferParity(text, virtual)).to.be.true;

      // Verify HTML is preserved
      expect(virtual).to.include('<div class="');
      expect(virtual).to.include('<h1>');
      expect(virtual).to.include('</div>');

      // Verify templates are replaced with spaces
      expect(virtual).to.not.include('.ClassName');
      expect(virtual).to.not.include('.Title');
    });

    test('YAML template with Go constructs', () => {
      const text = `apiVersion: v1
kind: {{ .Kind }}
metadata:
  name: {{ .Name }}`;
      const spans = extractTemplateSpans(text);
      const virtual = buildVirtualBuffer(text, spans);

      expect(validateBufferParity(text, virtual)).to.be.true;
      expect(virtual).to.include('apiVersion: v1');
      expect(virtual).to.include('kind: ');
      expect(virtual).to.not.include('.Kind');
    });
  });
});
