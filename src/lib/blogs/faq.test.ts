import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFaqs, faqPlainText } from './faq.ts';

const body = `Intro.

## Quick answer

Short.

## FAQ

### Does it work?

Yes. See [the docs](https://example.com) and \`code\`.

\`\`\`sh
echo hidden-in-schema
\`\`\`

### Is it **fast**?

Fast enough.

## Next steps

More text.`;

test('extractFaqs reads question/answer pairs from the FAQ section only', () => {
    const faqs = extractFaqs(body);
    assert.equal(faqs.length, 2);
    assert.equal(faqs[0].question, 'Does it work?');
    assert.match(faqs[0].answer, /Yes\./);
    assert.equal(faqs[1].question, 'Is it **fast**?');
});

test('extractFaqs returns nothing without a FAQ section', () => {
    assert.deepEqual(extractFaqs('## Quick answer\n\nText.'), []);
});

test('faqPlainText strips links, code fences and emphasis for structured data', () => {
    const text = faqPlainText(extractFaqs(body)[0].answer);
    assert.equal(text, 'Yes. See the docs and code.');
    assert.ok(!text.includes('hidden-in-schema'));
});
