import { createHash } from 'node:crypto';

export type AccountabilityMediaUploadSource = {
    /** Selected from authenticated server context, never request JSON. */
    kind: 'admin' | 'mcp';
    id: string;
};

export function mediaUploadOperationKey(source: AccountabilityMediaUploadSource): string {
    if (!['admin', 'mcp'].includes(source.kind)
        || !source.id || source.id.length > 255 || source.id.trim() !== source.id) {
        throw new TypeError('A verified upload source identity is required.');
    }
    const sourceId = source.id.replace(/[^a-z0-9._:-]/gi, '_').slice(0, 72);
    return `media.upload.${source.kind}.${sourceId}`.slice(0, 96);
}

export function digestMediaUploadIdempotencyKey(value: string): Buffer {
    return createHash('sha256').update(value, 'utf8').digest();
}

/** The service passes a canonical object with stable property order. */
export function digestMediaUploadRequest(value: unknown): Buffer {
    return createHash('sha256').update(JSON.stringify(value), 'utf8').digest();
}
