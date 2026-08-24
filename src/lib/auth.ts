import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { isAllowedAdminEmail } from './admin-auth';

const databaseUrl = process.env.DATABASE_URL;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
const betterAuthBaseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!googleClientId || !googleClientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
}

if (!betterAuthSecret && process.env.NODE_ENV === 'production') {
    throw new Error('Better Auth secret is not configured. Set BETTER_AUTH_SECRET.');
}

const globalAuthDatabase = globalThis as typeof globalThis & {
    betterAuthPool?: Pool;
};

function getPgConnectionString(url: string): string {
    const parsedUrl = new URL(url);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    const usesLibpqCompatibility = parsedUrl.searchParams.get('uselibpqcompat') === 'true';

    if (!usesLibpqCompatibility && sslMode && ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
        parsedUrl.searchParams.set('sslmode', 'verify-full');
    }

    return parsedUrl.toString();
}

function getAuthDatabase(): Pool | undefined {
    if (!databaseUrl) {
        return undefined;
    }

    if (globalAuthDatabase.betterAuthPool) {
        return globalAuthDatabase.betterAuthPool;
    }

    globalAuthDatabase.betterAuthPool = new Pool({
        connectionString: getPgConnectionString(databaseUrl),
        max: 2,
    });

    return globalAuthDatabase.betterAuthPool;
}

export const auth = betterAuth({
    ...(databaseUrl ? { database: getAuthDatabase() } : {}),
    secret: betterAuthSecret,
    baseURL: betterAuthBaseURL,
    emailAndPassword: {
        enabled: false,
    },
    socialProviders: {
        google: {
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (!isAllowedAdminEmail(user.email)) {
                        return false;
                    }
                },
            },
            update: {
                before: async (user) => {
                    if (user.email && !isAllowedAdminEmail(user.email)) {
                        return false;
                    }
                },
            },
        },
    },
    rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
        customRules: {
            '/sign-in/social': {
                window: 60,
                max: 5,
            },
        },
    },
    advanced: {
        ipAddress: {
            ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'],
        },
    },
    plugins: [
        nextCookies(),
    ],
});
