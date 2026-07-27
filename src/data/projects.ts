export type ProjectIcon =
    | 'ban'
    | 'brain'
    | 'chrome'
    | 'clapperboard'
    | 'database'
    | 'git-branch'
    | 'globe'
    | 'monitor';

export interface Project {
    slug: string;
    icon: ProjectIcon;
    title: string;
    type: string;
    description: string;
    problem: string;
    motivation: string;
    mistakes: string[];
    learnings: string[];
    achievements: string[];
    projectUrl: string;
}

// This is the single content source for /projects and /projects/[slug].
// Add detailed mistakes, learnings, and achievements here as each story evolves.
export const projects: Project[] = [
    {
        slug: 'subclip',
        icon: 'clapperboard',
        title: 'Subclip.app',
        type: 'Web, iOS & macOS App',
        description: 'AI video editor for captions, dubbing, transcription, and translation',
        problem: 'Video creators often need several tools and repetitive steps to caption, transcribe, dub, and translate one video.',
        motivation: 'Build one focused video workflow that reduces repetitive editing work and helps creators publish faster.',
        mistakes: [],
        learnings: [],
        achievements: ['Shipped Subclip across web and Apple platforms.'],
        projectUrl: 'https://www.subclip.app',
    },
    {
        slug: 'track-bad-habits',
        icon: 'ban',
        title: 'Track Bad Habits',
        type: 'iOS App',
        description: 'Log slip-ups, understand your triggers, and stay accountable with streaks and widgets',
        problem: 'Bad habits are difficult to change when slip-ups and their triggers are not recorded honestly.',
        motivation: 'Create a minimal daily accountability tool focused on patterns, streaks, and reflection.',
        mistakes: [],
        learnings: [],
        achievements: ['Published Track Bad Habits on the Apple App Store.'],
        projectUrl: 'https://apps.apple.com/in/app/track-bad-habits/id6756222875',
    },
    {
        slug: 'mapyourideas',
        icon: 'brain',
        title: 'mapyourideas.com',
        type: 'Web App',
        description: 'AI powered brainstorming and mind mapping app',
        problem: 'Early ideas can become scattered before they are organized into a useful plan.',
        motivation: 'Make brainstorming more visual and help turn rough thoughts into connected ideas.',
        mistakes: [],
        learnings: [],
        achievements: ['Built an AI-assisted mind-mapping workflow.'],
        projectUrl: 'https://github.com/proSamik/mapyourideas',
    },
    {
        slug: 'freescreenshot',
        icon: 'monitor',
        title: 'FreeScreenshot',
        type: 'macOS App',
        description: 'Add beautiful colorful backgrounds to your Mac screenshots',
        problem: 'Plain screenshots often need manual styling before they are ready to share.',
        motivation: 'Make polished screenshot presentation quick and accessible on macOS.',
        mistakes: [],
        learnings: [],
        achievements: ['Released the FreeScreenshot source code publicly on GitHub.'],
        projectUrl: 'https://github.com/proSamik/freescreenshot',
    },
    {
        slug: 'githubme',
        icon: 'globe',
        title: 'githubme.com',
        type: 'Web App',
        description: 'Convert any GitHub README into a readable article format',
        problem: 'README files are useful in repositories but are not always comfortable to read or share as standalone articles.',
        motivation: 'Turn public GitHub Markdown into a clean reading experience with a simple URL.',
        mistakes: [],
        learnings: [],
        achievements: ['Launched githubme.com as a public web product.'],
        projectUrl: 'https://github.com/proSamik/githubme',
    },
    {
        slug: 'consistency-tracker',
        icon: 'git-branch',
        title: 'Consistent Tracker',
        type: 'Web App',
        description: 'Track your consistency across GitHub, Twitter, Instagram, and YouTube',
        problem: 'Creative and development activity is spread across platforms, making consistency difficult to see in one place.',
        motivation: 'Create a calendar-style view of consistent work across multiple public platforms.',
        mistakes: [],
        learnings: [],
        achievements: ['Built a multi-platform consistency calendar.'],
        projectUrl: 'https://github.com/proSamik/consistency-tracker-calendar',
    },
    {
        slug: 'tweet-copier',
        icon: 'chrome',
        title: 'Tweet Copier',
        type: 'Chrome Extension',
        description: 'Save tweets and threads with one click in text format for analysis and inspiration',
        problem: 'Copying complete tweets and threads into a reusable text format is unnecessarily repetitive.',
        motivation: 'Make saving useful social content a one-click browser action.',
        mistakes: [],
        learnings: [],
        achievements: ['Built and open-sourced a focused Chrome extension.'],
        projectUrl: 'https://github.com/proSamik/a-tweet-copier',
    },
    {
        slug: 'onlinedb',
        icon: 'database',
        title: 'OnlineDB',
        type: 'Web App',
        description: 'Connect localhost or serverless databases to view and edit data easily',
        problem: 'Inspecting and editing local or serverless database records can require heavyweight or provider-specific tooling.',
        motivation: 'Provide a straightforward browser interface for working with database data.',
        mistakes: [],
        learnings: [],
        achievements: ['Built and open-sourced a web-based database viewer.'],
        projectUrl: 'https://github.com/proSamik/database-viewer-in-web',
    },
    {
        slug: 'prosamik',
        icon: 'globe',
        title: 'prosamik.com',
        type: 'Web App',
        description: 'Personal site and product portfolio',
        problem: 'Projects and personal milestones need a durable home that is easy to browse and discover.',
        motivation: 'Create one place to document experiments, lessons, and the work behind each product.',
        mistakes: [],
        learnings: [],
        achievements: ['Launched a personal portfolio and project archive.'],
        projectUrl: 'https://prosamik.com',
    },
];

export function getProjectBySlug(slug: string) {
    return projects.find((project) => project.slug === slug);
}
