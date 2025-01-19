import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Slug generation function (matching your useSlug logic)
function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')    // Remove special characters
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-')          // Remove consecutive hyphens
        .trim();
}

// Function to fetch content data from API
async function getContentData() {
    try {
        // Fetch blogs and projects from your API
        const [blogsResponse, projectsResponse] = await Promise.all([
            fetch('https://backend.prosamik.com/blogs'),
            fetch('https://backend.prosamik.com/projects')
        ]);

        const blogsData = await blogsResponse.json();
        const projectsData = await projectsResponse.json();

        return {
            blogs: blogsData.repos.filter(item => item.type === 'blog'),
            projects: projectsData.repos.filter(item => item.type === 'project')
        };
    } catch (error) {
        console.error('Error fetching content:', error);
        throw error;
    }
}

async function generateSitemap() {
    const baseUrl = 'https://prosamik.com';
    const currentDate = new Date().toISOString();

    // Get content data from API
    const { blogs, projects } = await getContentData();

    // Generate URLs for blogs and projects
    const blogUrls = blogs.map(blog => `
   <url>
      <loc>${baseUrl}/blogs/${createSlug(blog.title)}</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.7</priority>
   </url>`).join('');

    const projectUrls = projects.map(project => `
   <url>
      <loc>${baseUrl}/projects/${createSlug(project.title)}</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.7</priority>
   </url>`).join('');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
      <loc>${baseUrl}/</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>1.0</priority>
   </url>
   <url>
      <loc>${baseUrl}/about</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
   </url>
   <url>
      <loc>${baseUrl}/blogs</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
   </url>
   <url>
      <loc>${baseUrl}/projects</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
   </url>
   ${blogUrls}
   ${projectUrls}
</urlset>`;

    // Get the project root directory
    const projectRoot = path.resolve(__dirname, '..');
    const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');

    // Ensure the public directory exists
    const publicDir = path.join(projectRoot, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write the sitemap
    fs.writeFileSync(sitemapPath, xmlContent);
    console.log('Sitemap generated successfully at:', sitemapPath);
}

// Execute with error handling
(async () => {
    try {
        await generateSitemap();
    } catch (error) {
        console.error('Error generating sitemap:', error);
        process.exit(1);
    }
})();