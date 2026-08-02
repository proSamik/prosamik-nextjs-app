import { getDatabase, withDatabaseRetry } from '@/lib/database';

export interface ContributionDay {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
}

export interface StreakRange {
    length: number;
    start: string | null;
    end: string | null;
}

export interface ContributionStats {
    totalContributions: number;
    firstContributionDate: string | null;
    currentStreak: StreakRange;
    longestStreak: StreakRange;
}

export interface ConsistencyData {
    username: string;
    days: ContributionDay[];
    stats: ContributionStats;
    syncedAt: string | null;
}

const DEFAULT_GITHUB_USERNAME = 'proSamik';
const DEFAULT_START_YEAR = 2016;

function getUtcDateString(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function shiftDate(date: string, offset: number) {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return getUtcDateString(value);
}

type GitHubContributionLevel =
    | 'NONE'
    | 'FIRST_QUARTILE'
    | 'SECOND_QUARTILE'
    | 'THIRD_QUARTILE'
    | 'FOURTH_QUARTILE';

const contributionLevels: Record<GitHubContributionLevel, ContributionDay['level']> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
};

async function githubGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GITHUB_TOKEN is not configured.');
    }

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'prosamik.com-consistency-tracker',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`GitHub GraphQL request failed with status ${response.status}.`);
    }

    const result = await response.json() as {
        data?: T;
        errors?: Array<{ message: string }>;
    };

    if (result.errors?.length || !result.data) {
        throw new Error(result.errors?.map((error) => error.message).join('; ') || 'GitHub returned no data.');
    }

    return result.data;
}

async function fetchContributionYears(username: string) {
    const data = await githubGraphql<{
        user: { contributionsCollection: { contributionYears: number[] } } | null;
    }>(
        `query ContributionYears($login: String!) {
            user(login: $login) {
                contributionsCollection {
                    contributionYears
                }
            }
        }`,
        { login: username }
    );

    if (!data.user) {
        throw new Error(`GitHub user ${username} was not found.`);
    }

    return data.user.contributionsCollection.contributionYears;
}

async function fetchContributionYear(username: string, year: number, today: string) {
    const currentYear = Number(today.slice(0, 4));
    const to = year === currentYear
        ? new Date().toISOString()
        : new Date(Date.UTC(year + 1, 0, 1) - 1).toISOString();
    const data = await githubGraphql<{
        user: {
            contributionsCollection: {
                contributionCalendar: {
                    weeks: Array<{
                        contributionDays: Array<{
                            contributionCount: number;
                            contributionLevel: GitHubContributionLevel;
                            date: string;
                        }>;
                    }>;
                };
            };
        } | null;
    }>(
        `query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
                contributionsCollection(from: $from, to: $to) {
                    contributionCalendar {
                        weeks {
                            contributionDays {
                                contributionCount
                                contributionLevel
                                date
                            }
                        }
                    }
                }
            }
        }`,
        {
            login: username,
            from: `${year}-01-01T00:00:00.000Z`,
            to,
        }
    );

    if (!data.user) {
        throw new Error(`GitHub user ${username} was not found.`);
    }

    const days = data.user.contributionsCollection.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .filter((day) => day.date <= today)
        .map((day) => ({
            date: day.date,
            count: day.contributionCount,
            level: contributionLevels[day.contributionLevel],
        }));

    if (days.length === 0) {
        throw new Error(`GitHub returned no contribution days for ${year}.`);
    }

    return days;
}

async function ensureContributionTable() {
    const sql = getDatabase();

    await withDatabaseRetry('ensure GitHub contributions table', async () => {
        await sql`
            CREATE TABLE IF NOT EXISTS github_contributions (
                username TEXT NOT NULL,
                contribution_date DATE NOT NULL,
                contribution_count INTEGER NOT NULL CHECK (contribution_count >= 0),
                contribution_level SMALLINT NOT NULL CHECK (contribution_level BETWEEN 0 AND 4),
                synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (username, contribution_date)
            )
        `;
    });
}

export function calculateContributionStats(days: ContributionDay[], today = getUtcDateString()): ContributionStats {
    const countByDate = new Map(days.map((day) => [day.date, day.count]));
    const contributedDays = days.filter((day) => day.count > 0);
    const totalContributions = days.reduce((total, day) => total + day.count, 0);
    const firstContributionDate = contributedDays[0]?.date ?? null;

    let currentEnd = today;
    if ((countByDate.get(currentEnd) ?? 0) === 0) {
        currentEnd = shiftDate(currentEnd, -1);
    }

    let currentLength = 0;
    let currentCursor = currentEnd;
    while ((countByDate.get(currentCursor) ?? 0) > 0) {
        currentLength += 1;
        currentCursor = shiftDate(currentCursor, -1);
    }

    let longestLength = 0;
    let longestStart: string | null = null;
    let longestEnd: string | null = null;
    let runningLength = 0;
    let runningStart: string | null = null;

    if (days.length > 0) {
        let cursor = days[0].date;
        const finalDate = days[days.length - 1].date;

        while (cursor <= finalDate) {
            if ((countByDate.get(cursor) ?? 0) > 0) {
                runningLength += 1;
                runningStart ??= cursor;

                if (runningLength > longestLength) {
                    longestLength = runningLength;
                    longestStart = runningStart;
                    longestEnd = cursor;
                }
            } else {
                runningLength = 0;
                runningStart = null;
            }

            cursor = shiftDate(cursor, 1);
        }
    }

    return {
        totalContributions,
        firstContributionDate,
        currentStreak: {
            length: currentLength,
            start: currentLength > 0 ? shiftDate(currentEnd, -(currentLength - 1)) : null,
            end: currentLength > 0 ? currentEnd : null,
        },
        longestStreak: {
            length: longestLength,
            start: longestStart,
            end: longestEnd,
        },
    };
}

export async function getConsistencyData(): Promise<ConsistencyData> {
    await ensureContributionTable();
    const sql = getDatabase();
    const username = process.env.GITHUB_USERNAME || DEFAULT_GITHUB_USERNAME;
    const rows = await withDatabaseRetry('load GitHub contributions', async () => sql<{
            date: string;
            count: number;
            level: ContributionDay['level'];
            synced_at: string;
        }[]>`
            SELECT
                contribution_date::text AS date,
                contribution_count AS count,
                contribution_level AS level,
                synced_at::text AS synced_at
            FROM github_contributions
            WHERE LOWER(username) = LOWER(${username})
            ORDER BY contribution_date ASC
        `);

    const days = rows.map(({ date, count, level }) => ({ date, count, level }));

    return {
        username,
        days,
        stats: calculateContributionStats(days),
        syncedAt: rows.at(-1)?.synced_at ?? null,
    };
}

export async function syncGitHubContributions(options: { full?: boolean } = {}) {
    await ensureContributionTable();
    const sql = getDatabase();
    const username = process.env.GITHUB_USERNAME || DEFAULT_GITHUB_USERNAME;
    const today = getUtcDateString();
    const currentYear = Number(today.slice(0, 4));
    const configuredStartYear = Number(process.env.GITHUB_CONTRIBUTIONS_START_YEAR || DEFAULT_START_YEAR);
    const [{ stored_days: storedDays }] = await withDatabaseRetry(
        'count stored GitHub contributions',
        async () => sql<{ stored_days: number }[]>`
            SELECT COUNT(*)::int AS stored_days
            FROM github_contributions
            WHERE LOWER(username) = LOWER(${username})
        `
    );

    const years = options.full || storedDays === 0
        ? (await fetchContributionYears(username))
            .filter((year) => year >= configuredStartYear && year <= currentYear)
            .sort((first, second) => first - second)
        : [currentYear];

    const contributionDays = (
        await Promise.all(years.map((year) => fetchContributionYear(username, year, today)))
    ).flat();

    await withDatabaseRetry('store GitHub contributions', async () => {
        await sql.begin(async (transaction) => {
            await transaction`SELECT pg_advisory_xact_lock(hashtext('prosamik-github-contributions-sync'))`;

            if (options.full) {
                await transaction`
                    DELETE FROM github_contributions
                    WHERE LOWER(username) = LOWER(${username})
                `;
            }

            await transaction`
                INSERT INTO github_contributions ${transaction(
                    contributionDays.map((day) => ({
                        username,
                        contribution_date: day.date,
                        contribution_count: day.count,
                        contribution_level: day.level,
                    })),
                    'username',
                    'contribution_date',
                    'contribution_count',
                    'contribution_level'
                )}
                ON CONFLICT (username, contribution_date)
                DO UPDATE SET
                    contribution_count = EXCLUDED.contribution_count,
                    contribution_level = EXCLUDED.contribution_level,
                    synced_at = NOW()
            `;
        });
    });

    return {
        username,
        years,
        daysUpdated: contributionDays.length,
        syncedAt: new Date().toISOString(),
    };
}
