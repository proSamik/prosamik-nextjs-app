import { ArticleData } from '@/types/article';
import Article from '@/components/Article';

const articleData: ArticleData = {
    "metadata": {
        "title": "Hi 👋, I'm Samik",
        "repo": "proSamik/proSamik",
        "lastUpdated": "2024-12-17T00:00:00Z"
    },
    "content": {
        "sections": [
            {
                "type": "container",
                "align": "center",
                "elements": [
                    {
                        "type": "heading",
                        "level": 1,
                        "content": "Hi 👋, I'm Samik"
                    },
                    {
                        "type": "heading",
                        "level": 3,
                        "content": "I love to build and learn new technologies",
                        "style": "bold"
                    },
                    {
                        "type": "heading",
                        "level": 4,
                        "content": "Currently focusing on backend technologies, microservices architecture and deployment hacks",
                        "style": "italic"
                    },
                    {
                        "type": "paragraph",
                        "elements": [
                            {
                                "type": "link",
                                "href": "https://linkedin.com/in/proSamik",
                                "content": {
                                    "type": "image",
                                    "src": "https://img.shields.io/badge/If_you_need_any_help,_I_would_love_to_help_you_(at_no_cost,_ofc),_so_feel_free_to_reach_me!-black",
                                    "alt": "If you need any help, I would love to help you (at no cost, ofc), so feel free to reach me!"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "type": "container",
                "elements": [
                    {
                        "type": "paragraph",
                        "display": "flex",
                        "elements": [
                            {
                                "type": "link",
                                "href": "https://linkedin.com/in/proSamik",
                                "display": "inline",
                                "content": {
                                    "type": "image",
                                    "src": "https://img.shields.io/badge/Profile%20Since-red",
                                    "alt": "Profile Since"
                                }
                            },
                            {
                                "type": "link",
                                "href": "https://linkedin.com/in/proSamik",
                                "display": "inline",
                                "content": {
                                    "type": "image",
                                    "src": "https://img.shields.io/badge/01--Nov--2020-grey",
                                    "alt": "01/11/2020 - Present"
                                }
                            },
                            {
                                "type": "link",
                                "href": "https://linkedin.com/in/proSamik",
                                "display": "inline",
                                "content": {
                                    "type": "image",
                                    "src": "https://komarev.com/ghpvc/?username=proSamik&label=Profile%20views&color=2363F7&style=flat",
                                    "alt": "proSamik",
                                    "align": "right"
                                }
                            }
                        ]
                    },
                    {
                        "type": "paragraph",
                        "display": "flex",
                        "elements": [
                            {
                                "type": "text",
                                "content": "- ♻️ I'm restarting my development journey again!",
                                "display": "inline"
                            },
                            {
                                "type": "link",
                                "href": "https://linkedin.com/in/proSamik",
                                "content": {
                                    "type": "image",
                                    "src": "https://img.shields.io/badge/17--Dec--2024-Present-red",
                                    "alt": "17/12/2024 - Present",
                                    "align": "right"
                                }
                            }
                        ]
                    },
                    {
                        "type": "paragraph",
                        "display": "flex",
                        "elements": [
                            {
                                "type": "text",
                                "content": "- 📫 Reach me here for collaborations and help",
                                "display": "inline"
                            },
                            {
                                "type": "link",
                                "href": "mailto:dev.samikc@gmail.com",
                                "content": {
                                    "type": "image",
                                    "src": "https://img.shields.io/badge/dev.samikc@gmail.com-red",
                                    "alt": "Profile Since",
                                    "align": "right"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "type": "container",
                "align": "center",
                "elements": [
                    {
                        "type": "heading",
                        "level": 3,
                        "content": "Connect with me:"
                    },
                    {
                        "type": "link",
                        "href": "https://linkedin.com/in/proSamik",
                        "target": "blank",
                        "content": {
                            "type": "image",
                            "src": "https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg",
                            "alt": "proSamik",
                            "height": "30",
                            "width": "40"
                        }
                    }
                ]
            },
            {
                "type": "container",
                "align": "center",
                "elements": [
                    {
                        "type": "heading",
                        "level": 3,
                        "content": "Most Used languages"
                    },
                    {
                        "type": "image",
                        "src": "https://github-readme-stats.vercel.app/api/top-langs?username=proSamik&theme=react&show_icons=true&locale=en&layout=compact",
                        "alt": "proSamik",
                        "align": "center"
                    }
                ]
            },
            {
                "type": "container",
                "align": "center",
                "elements": [
                    {
                        "type": "heading",
                        "level": 3,
                        "content": "Profile Data"
                    }
                ]
            },
            {
                "type": "table",
                "align": "center",
                "cells": [
                    [
                        {
                            "type": "heading",
                            "level": 3,
                            "content": "Streak",
                            "align": "center"
                        },
                        {
                            "type": "heading",
                            "level": 3,
                            "content": "Github Statistics",
                            "align": "center"
                        }
                    ],
                    [
                        {
                            "type": "image",
                            "src": "https://git-hub-streak-stats.vercel.app?user=prosamik&theme=dark&border_radius=5&mode=weekly",
                            "alt": "GitHub Streak"
                        },
                        {
                            "type": "image",
                            "src": "https://github-readme-stats.vercel.app/api?username=prosamik&theme=dark&show_icons=true&hide_border=false&count_private=true",
                            "alt": "Github stats"
                        }
                    ]
                ]
            }
        ]
    }
};


// const articleData: ArticleData = {
//     "metadata": {
//         "title": "Smart-Parking-System-using-8051-MCU",
//         "repo": "licofiS/Smart-Parking-System-using-8051-MCU",
//         "lastUpdated": "2023-07-28T09:31:46Z"
//     },
//     "content": {
//         "sections": [
//             {
//                 "type": "heading",
//                 "level": 1,
//                 "content": "Smart-Parking-System-using-8051-MCU"
//             },
//             {
//                 "type": "paragraph",
//                 "content": "A hardware prototype which precisely measures vehicle dimensions and after inferring the type of vehicle, suggests optimal parking spots. The system was simulated on Proteus software, and a well-designed PCB was developed for robust and efficient parking area management."
//             },
//             {
//                 "type": "paragraph",
//                 "content": "The simulation was done in Proteus-"
//             },
//             {
//                 "type": "image",
//                 "alt": "simulation",
//                 "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/e9fc6799-4a51-41cb-905b-99aed435a0ce",
//                 "dimensions": null  // Original markdown image doesn't specify dimensions
//             },
//             {
//                 "type": "paragraph",
//                 "content": "The PCB Design in proteus-"
//             },
//             {
//                 "type": "image",
//                 "alt": "Screenshot 2023-07-28 at 09 25 01",
//                 "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/64c7b26b-9b71-429d-b129-a4a32538d06f",
//                 "dimensions": {
//                     "width": 793,
//                     "height": null
//                 }
//             },
//             {
//                 "type": "paragraph",
//                 "content": "PCB in 3D visualiser-"
//             },
//             {
//                 "type": "image",
//                 "alt": "Screenshot 2023-07-28 at 09 24 48",
//                 "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/d0a4efd6-c888-419d-85e9-8e9be5431df5",
//                 "dimensions": {
//                     "width": 1218,
//                     "height": null
//                 }
//             },
//             {
//                 "type": "paragraph",
//                 "content": "Printed PCB-"
//             },
//             {
//                 "type": "image",
//                 "alt": "WhatsApp Image 2023-07-28 at 09 31 46",
//                 "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/6e981011-fbc6-4a0b-8303-96342efe6c6a",
//                 "dimensions": null
//             },
//             {
//                 "type": "paragraph",
//                 "content": "Product Demo in Trainer Kit-"
//             },
//             {
//                 "type": "video",
//                 "platform": "youtube",
//                 "url": "https://youtu.be/cn8MsmLzOQQ",
//                 "embedUrl": "https://www.youtube.com/embed/cn8MsmLzOQQ"
//             }
//         ]
//     }
// };

export default function Home() {
    return (
        <main className="min-h-screen bg-background">
            <Article data={articleData} />
        </main>
    );
}