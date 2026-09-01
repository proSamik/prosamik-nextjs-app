import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

function reportMissingConfiguration(variableName: string): void {
    if (process.env.NODE_ENV !== 'production') {
        throw new Error(
            `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
        );
    }
}

if (!projectToken) {
    reportMissingConfiguration('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN');
} else if (!apiHost) {
    reportMissingConfiguration('NEXT_PUBLIC_POSTHOG_HOST');
} else {
    posthog.init(projectToken, {
        api_host: apiHost,
        defaults: '2026-05-30',
    });
}
