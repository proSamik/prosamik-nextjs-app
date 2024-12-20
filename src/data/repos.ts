// Define the structure of our repo map
export const repoMap = {
    "Smart Parking System": "proSamik/Smart-Parking-System-using-8051-MCU",
    "AI Receipt": "proSamik/AiReceipt",
    "About me": "proSamik/proSamik",
    "ProSamik Frontend App": "proSamik/prosamik-frontend-app",
    "ProSamik Server": "proSamik/prosamik-server",
    "Airbnb Analytics": "proSamik/airbnb-analytics",
    "Grocery App backend": "proSamik/grocery-backend",
    "To Do List API with caching(using SpringBoot)": "proSamik/Spring-Boot-Todo-List-API-with-Caching",
    "Task Management API(using Go)": "proSamik/go-task-management-api",
} as const;  // Make it a const assertion

// Create a type from our repo map keys
export type RepoSlug = keyof typeof repoMap;