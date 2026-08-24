import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type PresignedMediaUpload = {
    uploadUrl: string;
    url: string;
    mediaType: 'image' | 'video';
    objectKey: string;
};

type MediaFileMetadata = {
    name: string;
    type: string;
    size: number;
};

type R2Config = {
    bucketName: string;
    publicUrlBase: string;
    s3Client: S3Client;
};

let r2Config: R2Config | null = null;

const mimeToExtension: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-m4v': 'm4v',
};

function getMediaType(contentType: string): 'image' | 'video' {
    if (contentType.startsWith('video/')) {
        return 'video';
    }

    return 'image';
}

function getFileExtension(file: MediaFileMetadata): string {
    const extension = mimeToExtension[file.type] || file.name.split('.').pop()?.toLowerCase() || 'bin';
    return extension.replace(/[^a-z0-9]/g, '') || 'bin';
}

function getR2Config(): R2Config {
    if (r2Config) {
        return r2Config;
    }

    const publicUrl = process.env.R2_PUBLIC_URL;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;

    if (!accessKeyId || !secretAccessKey || !endpoint || !publicUrl) {
        throw new Error('R2 credentials are missing. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_PUBLIC_URL.');
    }

    const parsedEndpoint = new URL(endpoint);
    const endpointSegments = parsedEndpoint.pathname.split('/').filter(Boolean);
    const configuredBucket = process.env.R2_BUCKET_NAME;
    const bucketName = (configuredBucket || endpointSegments.at(-1) || '').trim();

    if (!bucketName) {
        throw new Error('R2 bucket name is missing. Set R2_BUCKET_NAME or include bucket in R2_ENDPOINT.');
    }

    const endpointBasePath = endpointSegments.slice(0, -1).join('/');
    const normalizedR2Endpoint = endpointSegments.length > 0
        ? `${parsedEndpoint.protocol}//${parsedEndpoint.host}${endpointBasePath ? `/${endpointBasePath}` : ''}`
        : parsedEndpoint.origin;

    const publicUrlBase = publicUrl.replace(/\/$/, '');
    const s3Client = new S3Client({
        region: 'auto',
        forcePathStyle: true,
        endpoint: normalizedR2Endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    r2Config = {
        bucketName,
        publicUrlBase,
        s3Client,
    };

    return r2Config;
}

export function isAllowedMediaType(contentType: string): boolean {
    return contentType.startsWith('image/') || contentType.startsWith('video/');
}

export function isR2PublicMediaUrl(url: string): boolean {
    try {
        const { publicUrlBase } = getR2Config();
        const publicBase = new URL(`${publicUrlBase}/`);
        const candidate = new URL(url);
        const basePath = publicBase.pathname.endsWith('/') ? publicBase.pathname : `${publicBase.pathname}/`;

        return candidate.origin === publicBase.origin
            && candidate.pathname.startsWith(`${basePath}random-thoughts/`);
    } catch {
        return false;
    }
}

function getObjectKey(url: string): string | null {
    if (!isR2PublicMediaUrl(url)) {
        return null;
    }

    const { publicUrlBase } = getR2Config();
    const publicBase = new URL(`${publicUrlBase}/`);
    const candidate = new URL(url);
    const basePath = publicBase.pathname.endsWith('/') ? publicBase.pathname : `${publicBase.pathname}/`;

    return decodeURIComponent(candidate.pathname.slice(basePath.length));
}

export async function createPresignedMediaUpload(file: MediaFileMetadata): Promise<PresignedMediaUpload> {
    const { bucketName, publicUrlBase, s3Client } = getR2Config();

    if (!file.name || !Number.isFinite(file.size) || file.size <= 0) {
        throw new Error('The selected file is empty or invalid.');
    }

    if (!isAllowedMediaType(file.type)) {
        throw new Error('Only image and video files are supported.');
    }

    const mediaType = getMediaType(file.type);
    const extension = getFileExtension(file);
    const objectKey = `random-thoughts/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: file.type,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 10 * 60 });

    return {
        uploadUrl,
        url: `${publicUrlBase}/${objectKey}`,
        mediaType,
        objectKey,
    };
}

export async function deleteFromR2(url: string): Promise<void> {
    const objectKey = getObjectKey(url);
    if (!objectKey) {
        return;
    }

    const { bucketName, s3Client } = getR2Config();
    await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
    }));
}
