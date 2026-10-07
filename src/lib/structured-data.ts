/**
 * Safely serialize JSON-LD for embedding inside an HTML script element. JSON
 * alone does not escape `</script>`, so replace HTML-significant characters
 * before assigning the string to `dangerouslySetInnerHTML`.
 */
export function serializeJsonLd(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
