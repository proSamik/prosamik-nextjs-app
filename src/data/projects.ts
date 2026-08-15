export type ProjectIcon =
    | "ban"
    | "brain"
    | "chrome"
    | "clapperboard"
    | "database"
    | "git-branch"
    | "globe"
    | "monitor";

export interface Project {
    slug: string;
    icon: ProjectIcon;
    title: string;
    type: string;
    description: string;
    problem: string[];
    motivation: string[];
    mistakes: string[];
    learnings: string[];
    achievements: string[];
    projectUrl: string;
    storyLinks?: Array<{
        label: string;
        url: string;
    }>;
}

// This is the single content source for /projects and /projects/[slug].
// Each array item renders as a separate paragraph on the project story page.
export const projects: Project[] = [
    {
        slug: "rankizz",
        icon: "chrome",
        title: "Rankizz",
        type: "Web App & Chrome Extension",
        description: "Affordable SEO, AI search, social discovery, and analytics in one workspace",
        problem: [
            "While building Subclip, I tried several marketing methods and SEO stood out because it brought compounding results over time. The problem was that SEO tools such as Ahrefs and Semrush are expensive for beginners, and the return on investment is difficult to justify when someone is only starting out.",
            "Search is also no longer limited to web rankings. People need to understand AI citations and visibility in listicles, Reddit, YouTube, and LinkedIn, while also checking Google Search Console, Bing Webmaster, and Google Analytics. These tools and platforms are usually scattered across separate dashboards.",
        ],
        motivation: [
            "I wanted to bridge that gap for indie hackers, solo founders, and solopreneurs who need useful research before they have the resources to take a large software subscription risk. Rankizz brings data from multiple AI providers and search platforms into one place so users can understand where they are visible and where they need to improve.",
            "I also wanted Rankizz to work with the way people build today. Instead of requiring everyone to live inside another dashboard, the product offers REST API and MCP access so users can build custom workflows and connect SEO and AI-search data to their own agents.",
        ],
        mistakes: [
            "The scope is much larger than a traditional keyword research tool. Combining web search, AI citations, social discovery, analytics, APIs, MCP access, and a browser extension means every part needs clear boundaries and a useful workflow instead of becoming another collection of disconnected reports.",
        ],
        learnings: [
            "Rankizz has reinforced that modern visibility is distributed. Ranking on Google is only one part of being discovered; being mentioned by AI systems and appearing in the platforms those systems learn from can matter just as much.",
            "The product has also made me think more deeply about the difference between collecting data and making it actionable. A common dashboard is useful when it helps someone decide what to research, publish, monitor, or automate next.",
        ],
        achievements: [
            "Rankizz brings web rankings, AI citations, listicle research, Reddit, YouTube, LinkedIn, Search Console, Bing Webmaster, and Google Analytics into a common workspace for people who want a more accessible alternative to expensive enterprise SEO tools.",
            "The free Chrome extension lets users save competitor and inspiration websites for later SEO research. Depending on their preference, those saves can sync to the Rankizz database or stay local on the device.",
            "Rankizz is available as a web app with REST API and MCP access, giving users a way to use the same research inside custom workflows and agent-powered automation.",
        ],
        projectUrl: "https://www.rankizz.com",
        storyLinks: [
            {
                label: "Chrome extension",
                url: "https://chromewebstore.google.com/detail/rankizz-seo-extension/gihmcajchokaobbcbpmdjoafbdlikcfe",
            },
        ],
    },
    {
        slug: "subclip",
        icon: "clapperboard",
        title: "Subclip.app",
        type: "Web, iOS & macOS App",
        description: "AI video editor for captions, dubbing, transcription, and translation",
        problem: [
            "I was recording a video every day for my YouTube channel, and editing became the part I struggled with most. Adding subtitles took time, yet I could not find a tool that let me generate them without limits. I knew how to build apps by then, so this felt like a problem worth solving. Subclip.app began as my first real attempt at an Electron desktop application.",
        ],
        motivation: [
            "I wanted to build a desktop product that people could buy once and keep using. A local app also meant creators could keep their videos and edits on their own machines instead of uploading everything to another service.",
        ],
        mistakes: [
            "Subclip.app is my longest-running project, so the list of mistakes is long. I expected too much from it before doing enough market research. I also started without a clear distribution strategy, which left me with a poor conversion rate even after putting a huge amount of work into the product.",
            "The biggest mistake was expecting life-changing money from one project. That expectation made every slow period feel worse and pushed me into too many experiments before I understood which part of the product or marketing actually needed attention.",
        ],
        learnings: [
            "This project taught me more about distribution than anything I built before it. I learned what building in public feels like for me, how to post on Reddit without treating every post as promotion, and how SEO and technical SEO work in practice.",
            "I kept pivoting the product instead of limiting it to the first desktop version. Each pivot came with technical and business lessons. There is still a lot I want to document, but the main lesson is that building the product and finding a repeatable way to sell it are two different jobs.",
        ],
        achievements: [
            "Subclip.app became my first full-fledged startup and the longest project I have stayed with. It has made more than $1,100 in total revenue so far. That is a big number for me, even though the business is not profitable yet because I spent a lot on experiments and learning.",
            "The product has also generated recurring revenue. My goal now is to make it self-sustaining and eventually profitable. I do not know whether that will take a few months or another year, but that is what I am working toward.",
        ],
        projectUrl: "https://www.subclip.app",
        storyLinks: [
            {
                label: "YouTube channel",
                url: "https://www.youtube.com/@prosamik",
            },
        ],
    },
    {
        slug: "track-bad-habits",
        icon: "ban",
        title: "Track Bad Habits",
        type: "iOS App",
        description: "Log slip-ups, understand your triggers, and stay accountable with streaks and widgets",
        problem: [
            "Consistent Tracker helped me see the work I was doing regularly. I wanted the opposite kind of tool for habits I was trying to stop. My idea was to record the bad habits honestly and use accountability to make those patterns harder to ignore.",
        ],
        motivation: [
            "I already had a way to track positive consistency, so building Track Bad Habits felt like the next step. This time I did not want another web app. I wanted to build a native iOS application in Swift and use the project to learn how an Apple app works from development to release.",
        ],
        mistakes: [
            "FreeScreenshot was my first macOS app, and I did not want to repeat the same mistakes on iOS. I spent time learning SwiftUI and understanding the structure of the app before asking AI to help me build it.",
            "I still made the backend more complicated than it needed to be. I added a paywall and used Supabase with PostgreSQL when a simpler local-first setup may have been enough for the first version.",
        ],
        learnings: [
            "The biggest learning was the release process. I learned how App Store Connect works, how to prepare a build for review, and what it takes to get an iOS app approved. The process has a lot of steps, but I was able to work through all of them.",
        ],
        achievements: [
            "Track Bad Habits was the first app of any kind that I officially launched on an app store. I had built Android apps before, but I never published one on the Play Store. Seeing an app from my own phone become available to other people through the App Store felt like a real achievement.",
        ],
        projectUrl: "https://apps.apple.com/in/app/track-bad-habits/id6756222875",
    },
    {
        slug: "mapyourideas",
        icon: "brain",
        title: "mapyourideas.com",
        type: "Web App",
        description: "AI powered brainstorming and mind mapping app",
        problem: [
            "After building several connected tools, I wanted one place where I could map what I wanted to do, what I did not want to do, and how different ideas related to each other. I could not find a workflow that matched the way my mind moved between ideas.",
        ],
        motivation: [
            "I wanted to build something like Miro, but with AI doing more of the work. The AI would help create the graph, shape the flow, and turn a rough thought into something structured. mapyourideas.com was my first product with AI built directly into the core experience.",
        ],
        mistakes: [
            "Because this was my first AI product, I made several rookie mistakes. I built around WebSockets even though I did not need them, then discovered that the approach did not fit a serverless Vercel deployment. I also did not know that AI providers already supported streaming, so I made the response flow much harder than it needed to be.",
            "I built something close to my own AI SDK before I understood the existing options. I was also new to React Flow, which led to some messy workarounds. When I listed the product for sale, I was learning the payment and listing process at the same time, including how to use Creem as the payment provider.",
        ],
        learnings: [
            "The technical execution was difficult, but the more important lesson came from distribution. I had more courage when I launched this product. I posted about it on Threads, which I had never treated as a sales channel, and that post brought me a customer.",
            "The positioning did more work than a generic mind-map pitch would have done. Instead of saying that I had built another flowchart tool, I described it as a combination of Google Docs, ChatGPT, and Miro. A map could become a document, and the AI could help shape both. That explanation connected with at least one person, and I believe it could have become a proper business if I had continued.",
        ],
        achievements: [
            "mapyourideas.com gave me my first software sale. The customer stayed for four months. I made about $36 in total and received roughly $28 after fees. One paying user did not make it a profitable business, but it proved that someone was willing to pay for an idea I had built.",
            "Even after I shut down the backend and frontend, people still visited the site and emailed me. I did not understand the potential of SEO at the time, so I never doubled down on it. Looking back, the positioning and continued interest showed that the idea had more potential than I gave it credit for.",
        ],
        projectUrl: "https://github.com/proSamik/mapyourideas",
    },
    {
        slug: "freescreenshot",
        icon: "monitor",
        title: "FreeScreenshot",
        type: "macOS App",
        description: "Add beautiful colorful backgrounds to your Mac screenshots",
        problem: [
            "While building Consistent Tracker, I wanted to share screenshots of the product. I noticed that many people used separate tools to add colorful backgrounds and make screenshots easier to share. I decided to build that tool for myself instead of adding another service to my workflow.",
        ],
        motivation: [
            "FreeScreenshot was mainly a learning project. I wanted to find out whether I could build a macOS application with help from AI. It was my first macOS app, and I failed in plenty of ways while figuring it out.",
        ],
        mistakes: [
            "I had experience with Android and web development, but almost none with native macOS development. I went into the project without understanding Swift, app signing, packaging, or how a Mac app should be structured. That made even small decisions harder than they needed to be.",
        ],
        learnings: [
            "The product itself was simple, so I spent more time learning distribution. I posted it on Reddit with a direct title that positioned it as an alternative to an existing screenshot tool. People already understood the old product, so they immediately understood what mine did and wanted to try the open-source alternative.",
            "That launch taught me that distribution can matter more than technical complexity. A tiny MVP can still get attention if people understand the problem and the positioning quickly.",
        ],
        achievements: [
            "I built a working macOS application and learned notarization, code signing, and the differences between builds for Intel and Apple Silicon Macs.",
            "The Reddit post received more than 20,000 visits, and the YouTube video received roughly 200 to 300 views. I also saw conversions. If I had made the app paid, some people may have bought it, but my goal at the time was to release the idea, test the response, and learn. That part worked better than I expected.",
        ],
        projectUrl: "https://github.com/proSamik/freescreenshot",
        storyLinks: [
            {
                label: "posted it on Reddit",
                url: "https://www.reddit.com/r/macapps/comments/1jtpoow/i_have_made_an_opensource_alternative_to/",
            },
        ],
    },
    {
        slug: "githubme",
        icon: "globe",
        title: "githubme.com",
        type: "Web App",
        description: "Convert any GitHub README into a readable article format",
        problem: [
            "I was nearly finished with prosamik.com when I ran into the question of how I would publish blogs. I had previously worked at a WordPress company, so I understood what a CMS did, but I did not know that tools such as Payload CMS already worked well with Next.js. Building my own CMS felt like the obvious solution at the time.",
            "I did not want to build and maintain a full backend just to store articles. I also wanted version control for every post. GitHub already handled storage and version history through README and Markdown files, so I used GitHub as the CMS and rendered those files inside the prosamik.com interface.",
        ],
        motivation: [
            "Once the idea worked for my portfolio, I wanted to make it useful for anyone with a public GitHub README but no personal website. The rule was simple: replace github.com with githubme.com in a repository or Markdown URL, and the same content would open as a cleaner reading page.",
        ],
        mistakes: [
            "My first mistake was not researching the CMS options that already existed for Next.js. Payload CMS and other maintained tools already solved the publishing problem. I jumped straight into building because the idea felt exciting.",
            "I also assumed that many people wanted to beautify README pages without validating that demand. It was an impulsive product decision, and I built the solution before checking whether enough users cared about the problem.",
        ],
        learnings: [
            "githubme.com taught me how to build a landing page that looked much better than my earlier work. On the technical side, I learned how GitHub content and APIs worked, how to connect the frontend and backend directly, and how to proxy requests when the browser could not call a source as expected.",
            "The project had more parsing and rendering logic behind it than the simple URL trick suggested. I became better at building, but I was still focused more on implementation than distribution or understanding what users wanted.",
        ],
        achievements: [
            "The final product could render a README through my own domain by identifying the repository and Markdown file from the URL. It also supported YouTube embeds, which GitHub README pages do not render directly.",
            "A developer could use githubme.com as the public landing page for a project without building a separate site. That was the most useful part of the experiment, even though I did not turn it into a larger business.",
        ],
        projectUrl: "https://github.com/proSamik/githubme",
    },
    {
        slug: "consistency-tracker",
        icon: "git-branch",
        title: "Consistent Tracker",
        type: "Web App",
        description: "Track your consistency across GitHub, Twitter, Instagram, and YouTube",
        problem: [
            "When I work steadily but do not see immediate results, it is easy to feel as if the effort is going nowhere. GitHub already gave me a contribution graph for coding, but I had nothing similar for posting YouTube videos or staying consistent on Twitter and other platforms.",
            "I wanted a public view of that effort. If I could see the days adding up, I thought it would be easier to stay motivated even before the results arrived.",
        ],
        motivation: [
            "I could not find the exact tracker I wanted, so I built Consistent Tracker. I believed the same idea could help indie hackers and video creators who wanted a visible record of the work they were doing every day.",
        ],
        mistakes: [
            "I built the tool mainly for myself and stopped before making it production ready for other users. I published a landing page, and Google started ranking it for searches such as consistency tracker, but there was no complete product behind that demand.",
            "Because I never finished the production experience, I could not learn whether the search traffic would have turned into users or sales.",
        ],
        learnings: [
            "Tracking public activity across platforms was harder than I expected. Some platforms did not expose enough data without account authentication. I did not yet understand the scraping tools I could use for public accounts, while private account data required a proper connection and user dashboard.",
            "YouTube taught me a particularly useful lesson about dates and time zones. I lived in IST, the server ran in the United States, and parts of the tracker calculated activity in UTC. A post near midnight could appear on the wrong day unless I stored and displayed dates in the user's local time.",
        ],
        achievements: [
            "I used Consistent Tracker to record 180 days of posting YouTube videos. Some platforms already had their own contribution-style views, but I built the YouTube tracker myself, checked it daily, and maintained the streak.",
            "Seeing the final record made the effort feel real. The project did what I originally needed it to do, even though I did not finish turning it into a product for everyone else.",
        ],
        projectUrl: "https://github.com/proSamik/consistency-tracker-calendar",
    },
    {
        slug: "tweet-copier",
        icon: "chrome",
        title: "Tweet Copier",
        type: "Chrome Extension",
        description: "Save tweets and threads with one click in text format for analysis and inspiration",
        problem: [
            "I often saved inspiration from Twitter, but selecting and copying a full tweet with a mouse was annoying. Threads were popular at the time, and copying an entire thread made the process even more tedious.",
        ],
        motivation: [
            "I had never built a Chrome extension. AI tools had become good enough to help, and I was already using Cursor, so I decided to make a small extension that added a copy button directly to Twitter. It would copy one tweet or collect a complete thread in a reusable text format.",
        ],
        mistakes: [
            "I built the extension with plain HTML, CSS, and JavaScript. That worked, but I wish I had used a framework such as Plasmo. The project would have taught me a more maintainable extension workflow instead of only the lowest-level pieces.",
        ],
        learnings: [
            "I learned how Chrome extensions are structured, how they interact with an existing website, and how to debug code that runs inside another product's interface. By the end, I knew I could build a useful browser extension with help from AI.",
        ],
        achievements: [
            "I finished and released the code through GitHub. I did not publish Tweet Copier in the Chrome Web Store because it required a developer fee. Looking back, paying the fee may have been worthwhile, especially because I plan to build more extensions.",
            "The project also gave me another repository to maintain properly and a working base I could reuse for future browser-extension ideas.",
        ],
        projectUrl: "https://github.com/proSamik/a-tweet-copier",
    },
    {
        slug: "onlinedb",
        icon: "database",
        title: "OnlineDB",
        type: "Web App",
        description: "Connect localhost or serverless databases to view and edit data easily",
        problem: [
            "While building githubme.com, I struggled to inspect records in my local PostgreSQL database. I wanted to paste a database URL into a public-facing interface and view its tables, whether the database was local or hosted through a provider such as Supabase or Neon.",
        ],
        motivation: [
            "The honest motivation was that I wanted to make money from the project. I also wanted an easier way to inspect local PostgreSQL data without writing a custom query every time. I did not know about Drizzle Studio yet, so a browser-based database viewer seemed like a useful product.",
            "I also had no idea how payments or most of the business side worked. I decided to build the tool first and find out whether anyone would pay for it.",
        ],
        mistakes: [
            "The first mistake was familiar: I did not research the existing options well enough. Drizzle Studio already made it easy to inspect a local database.",
            "I also misunderstood what a deployed web app could reach. A server running on Vercel or elsewhere cannot connect directly to a database on a user's localhost. Exposing it required a tunnel such as ngrok, and an HTTPS tunnel was not enough for PostgreSQL. I needed TCP forwarding, which was limited on the free ngrok plan. Asking someone to pay ngrok and then pay me just to view a local database made the product difficult to justify.",
        ],
        learnings: [
            "The failure taught me the difference between HTTP, HTTPS, and TCP connections, and what it means to expose a local port to the web. I also learned how the same problem changes when the database is on a VPS instead of a local machine.",
            "I learned more about databases, how to build a usable table interface, and how commands could run behind the UI. This was also the project that introduced me to Drizzle.",
        ],
        achievements: [
            "I completed a technically complicated project from beginning to end. I was able to expose my local database through a TCP connection and inspect it from a web interface.",
            "It did not become a viable business, but making that connection work was still an achievement. The finished experiment taught me far more than the original idea suggested.",
        ],
        projectUrl: "https://github.com/proSamik/database-viewer-in-web",
    },
    {
        slug: "prosamik",
        icon: "globe",
        title: "prosamik.com",
        type: "Web App",
        description: "Personal site and product portfolio",
        problem: [
            "I came from Android development and had a solid coding background, but I did not know web development. Next.js was popular, so learning it looked like a practical way to understand how modern web applications worked.",
            "The usual beginner problem was deciding what to build. I did not want to follow a tutorial and copy someone else's project, so I chose something I genuinely needed: this portfolio website.",
        ],
        motivation: [
            "Every developer needs a portfolio. When I started my indie-hacking journey, I also wanted a record of the work behind it. If the journey did not succeed as a business, I would still have a place that showed what I had built and how hard I had worked.",
            "I wanted a future employer, collaborator, or customer to look at prosamik.com and understand that I could follow through on what I said. At that point, building the portfolio as a Next.js application felt like the right first step.",
        ],
        mistakes: [
            "My first mistake was choosing complexity because I wanted the project to feel technically challenging. I had heard a lot about Go concurrency, so I decided to build a microservices architecture with a Next.js frontend and a Go backend. A portfolio did not need that architecture.",
            "I did not yet know how to connect a frontend and backend properly. I learned by asking ChatGPT questions, putting the answers into code, reading the errors, and trying again. I was not using Codex or Claude at the time. ChatGPT was less capable than today's tools, but the slower process forced me to see many of the bugs and decisions a developer normally handles.",
        ],
        learnings: [
            "Building prosamik.com taught me how a frontend and backend communicate. I learned how to deploy the frontend on Vercel and the backend on Railway, including how to Dockerize the backend and understand what the container was doing.",
            "I also worked through OAuth and SMTP email sending for the first time. None of those pieces were extraordinary on their own, but doing them from scratch through conversation with ChatGPT gave me a working picture of how a complete web application fits together.",
        ],
        achievements: [
            "The main achievement was learning how to code with AI without giving up the technical thinking. My previous coding experience helped me understand what was happening behind the generated code, which made my prompts more precise.",
            "As I built more of the application, my knowledge improved and so did the questions I asked. prosamik.com became both a portfolio and the project that taught me how much better AI-assisted development works when the person prompting still understands the system.",
        ],
        projectUrl: "https://prosamik.com",
    },
];

export function getProjectBySlug(slug: string) {
    return projects.find((project) => project.slug === slug);
}
