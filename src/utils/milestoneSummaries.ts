import { TimelineEvent } from '@/types/timeline';

const milestoneSummaries: Record<string, string> = {
    'Joined and left rtCamp':
        'I joined rtCamp as a software engineer trainee, struggled through its intensive WordPress training, and left after a short performance improvement plan in September 2024.',
    'Drove and Travelled Around 2000 kms':
        'After leaving rtCamp, I took a break, travelled around 2,000 km, and explored my hometown and the hills around Siliguri by car and bike.',
    'What Happened to Varasi?':
        'I turned down the Varasi offer to rebuild my web development foundation and focus on shipping products instead of joining another role.',
    'On-Campus Placement':
        'After several interview rejections, I secured an on-campus Salesforce developer offer from Varasi, although the joining date was later postponed.',
    'Off-Campus Placement':
        'I prepared for unfamiliar web development topics, cleared the rtCamp interview, and received an off-campus software engineering offer.',
    'Final Year Project':
        'I carried a smart parking IoT project from earlier college work into my final year, but built it for academic requirements rather than a real release.',
    'Lost Weight: 96 kgs to 80 Kgs':
        'Over five months, I went from 96 kg to 80 kg through squash, badminton, running, cycling, and daily walking.',
    'GDSC Lead ’22':
        'I became the GDSC Lead for AIT, ran programs around Google technologies, and learned how much responsibility came with leading a campus community.',
    'I&E Cell Secretary ’22':
        'I became Secretary of the Innovation and Entrepreneurship Cell and took responsibility for its team, events, budget, and direction.',
    'OSS Sponsorship Head ’22':
        'I led sponsorship for Innerve 7, raised monetary and in-kind support, and learned that a team must deliver what it promises to sponsors.',
    'Internship at Skrolkart':
        'I spent one month as an app developer at an alumni startup that used a reels-style experience for discovering and ordering local food.',
    'Conducted Startup Saga and Innerve in a gap of 2 weeks':
        'I helped run Startup Saga and Innerve within two weeks while handling three leadership roles and an exhausting end to my third year.',
    'Grabbed Second Internship':
        'I persuaded an alumni founder to take me on as an extra Django intern, learned from the work, and struggled with the distance of a remote unpaid role.',
    'Conducted First Edition of Startup Saga':
        'I helped conduct the first online Startup Saga, learned how sponsorship deals worked, and brought E Cell its first sponsor.',
    'Became Joint Secretary':
        'My work and college network led to joint secretary roles in GDSC, E Cell, and OSS, where I handled much of the groundwork behind their events.',
    'Joined the College (Offline)':
        'I left my lockdown development routine to experience college in person, a decision that slowed my technical work but widened my view of myself.',
    'Conducted Unnati for the First Time':
        'I helped conduct E Cell AIT’s first physical Unnati and learned how to organize an entrepreneurship event from planning through execution.',
    'Gave My First Pitch':
        'During Unnati, I gave an improvised one-minute pitch for an AI-powered fan and stepped well outside my comfort zone as a shy speaker.',
    'Internship at Neoperk Technologies':
        'I landed my first paid Android internship through Internshala, worked for a month, and returned an advance when a personal commitment made me leave.',
    'Organized Innerve 6':
        'As Joint Sponsorship Head for Innerve 6, I learned how to raise support, manage sponsor expectations, and protect trust through honest deliverables.',
    'Admission in AIT (15/10/2020)':
        'I chose Electronics and Telecommunication over an available mechanical seat because electronics and computers matched what I genuinely wanted to understand.',
    'Got Selected in Technical Clubs':
        'I joined the Robotics Club and Technical Board because I wanted more opportunities to learn technology and work with other curious students.',
    'First Internship in the First Year of College':
        'My first internship was a paid market research project on Automation Anywhere, where I coordinated the team and earned my first professional income.',
    'Got Selected in E Cell (est. Jan 2021)':
        'I joined E Cell in its first intake of first-year students because I wanted to understand entrepreneurship and learn how startups were built.',
    'Made My First App (Dice Roller)':
        'Android Study Jams helped me build my first app, a dice roller, and turned a childhood curiosity about mobile apps into a serious interest.',
    'Top Performer in DSA (Aug 2021)':
        'I studied data structures and algorithms in Python day and night for two months and became a top performer in the Coding Ninjas course.',
    'Secured 10 CGPA in 10th':
        'I earned a 10 CGPA in class 10 after working hard for it, and at the time it felt like one of my biggest academic wins.',
    'Took Computer Science in 11th':
        'I chose Computer Science in class 11 and worked hard on the fundamentals because I wanted to understand how software worked.',
    '2019 - Secured 98 in CS':
        'Computer Science became my strongest class 12 subject, where I scored 98 even though my overall result and PCM scores were much lower.',
    '2019-2020 - Kota <> Allen':
        'After an 80 percentile JEE Main attempt, I moved to Kota and prepared at Allen with AIT as the minimum college result I wanted to reach.',
    '2020 Jan - Cleared JEE Mains in First Attempt':
        'I raised my JEE Main score from around 80 to 92.69 percentile, enough to feel confident that I could secure admission to AIT.',
};

export function getMilestoneSummary(event: TimelineEvent) {
    return milestoneSummaries[event.title] ?? event.description.replace(/^[-\s]+/, '').split('\n')[0];
}
