import assert from 'node:assert/strict';
import test from 'node:test';
import { ENABLED_LOCALES, languageAlternates, localizePath, splitLocalePath } from './config.ts';

test('default locale has no prefix; others do', () => {
    assert.equal(localizePath('/blogs/x'), '/blogs/x');
    assert.equal(localizePath('/blogs/x', 'es'), '/es/blogs/x');
    assert.equal(localizePath('/', 'es'), '/es');
});

test('splitLocalePath separates the locale from the page path', () => {
    assert.deepEqual(splitLocalePath('/es/blogs/x'), { locale: 'es', path: '/blogs/x', prefixed: true });
    assert.deepEqual(splitLocalePath('/es'), { locale: 'es', path: '/', prefixed: true });
    assert.deepEqual(splitLocalePath('/blogs/x'), { locale: 'en', path: '/blogs/x', prefixed: false });
    assert.equal(splitLocalePath('/about').prefixed, false);
});

test('hreflang only lists enabled locales and an x-default', () => {
    assert.deepEqual(ENABLED_LOCALES, ['en']);
    assert.deepEqual(languageAlternates('/blogs/x', ['en', 'es'], 'https://www.prosamik.com'), {
        en: 'https://www.prosamik.com/blogs/x',
        'x-default': 'https://www.prosamik.com/blogs/x',
    });
});
