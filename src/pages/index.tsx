import { ArticleData } from '@/types/article';
import Article from '@/components/Article';

const articleData: ArticleData = {
    "metadata": {
        "title": "Smart-Parking-System-using-8051-MCU",
        "repo": "licofiS/Smart-Parking-System-using-8051-MCU",
        "lastUpdated": "2023-07-28T09:31:46Z"
    },
    "content": {
        "sections": [
            {
                "type": "heading",
                "level": 1,
                "content": "Smart-Parking-System-using-8051-MCU"
            },
            {
                "type": "paragraph",
                "content": "A hardware prototype which precisely measures vehicle dimensions and after inferring the type of vehicle, suggests optimal parking spots. The system was simulated on Proteus software, and a well-designed PCB was developed for robust and efficient parking area management."
            },
            {
                "type": "paragraph",
                "content": "The simulation was done in Proteus-"
            },
            {
                "type": "image",
                "alt": "simulaion",
                "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/e9fc6799-4a51-41cb-905b-99aed435a0ce",
                "dimensions": null  // Original markdown image doesn't specify dimensions
            },
            {
                "type": "paragraph",
                "content": "The PCB Design in proteus-"
            },
            {
                "type": "image",
                "alt": "Screenshot 2023-07-28 at 09 25 01",
                "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/64c7b26b-9b71-429d-b129-a4a32538d06f",
                "dimensions": {
                    "width": 793,
                    "height": null
                }
            },
            {
                "type": "paragraph",
                "content": "PCB in 3D visualiser-"
            },
            {
                "type": "image",
                "alt": "Screenshot 2023-07-28 at 09 24 48",
                "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/d0a4efd6-c888-419d-85e9-8e9be5431df5",
                "dimensions": {
                    "width": 1218,
                    "height": null
                }
            },
            {
                "type": "paragraph",
                "content": "Printed PCB-"
            },
            {
                "type": "image",
                "alt": "WhatsApp Image 2023-07-28 at 09 31 46",
                "url": "https://github.com/licofiS/Smart-Parking-System-using-8051-MCU/assets/73891260/6e981011-fbc6-4a0b-8303-96342efe6c6a",
                "dimensions": null
            },
            {
                "type": "paragraph",
                "content": "Product Demo in Trainer Kit-"
            },
            {
                "type": "video",
                "platform": "youtube",
                "url": "https://youtu.be/cn8MsmLzOQQ",
                "embedUrl": "https://www.youtube.com/embed/cn8MsmLzOQQ"
            }
        ]
    }
};

export default function Home() {
    return (
        <main className="min-h-screen bg-background">
            <Article data={articleData} />
        </main>
    );
}