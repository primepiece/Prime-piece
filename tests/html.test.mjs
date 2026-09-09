import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../api/_html.js';

test('escapes the five reserved HTML characters', () => {
  assert.equal(escapeHtml(`<script>alert('x')&"y"</script>`),
    '&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;y&quot;&lt;/script&gt;');
});

test('breaks out of a mailto/tel href attribute safely', () => {
  const malicious = `x@x.com"><script>alert(1)</script>`;
  const escaped = escapeHtml(malicious);
  assert.ok(!escaped.includes('"'));
  assert.ok(!escaped.includes('<'));
});

test('passes plain text through unchanged', () => {
  assert.equal(escapeHtml('James Hopwood'), 'James Hopwood');
});

test('handles null/undefined/number input without throwing', () => {
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(42), '42');
});
