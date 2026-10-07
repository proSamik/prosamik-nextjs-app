/** Pure configuration guard; exported so the fail-closed bucket rule is testable. */
export function assertPrivateBucketIsDistinct(secureBucket: string | undefined, publicBucket: string | undefined): string {
    const secure = secureBucket?.trim();
    const publicName = publicBucket?.trim();
    if (!secure) throw new Error('Private R2 is unavailable: SECURE_BUCKET is not configured.');
    if (publicName && secure === publicName) {
        throw new Error('Private R2 must use a bucket distinct from the public Random Thoughts bucket.');
    }
    return secure;
}
