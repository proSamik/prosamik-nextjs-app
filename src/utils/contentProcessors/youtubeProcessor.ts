export const processYouTubeLinks = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const paragraphs = tempDiv.getElementsByTagName('p');
    Array.from(paragraphs).forEach(p => {
        const youtubeLink = p.querySelector('a[href*="youtu"]');
        if (youtubeLink) {
            const url = youtubeLink.getAttribute('href');
            const videoId = url?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1];

            if (videoId) {
                const textBefore = p.childNodes[0].textContent || '';

                p.innerHTML = `
                    ${textBefore}
                    <div class="my-4">
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}"
                            title="YouTube video player"
                            style="border: 0;"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            class="w-full h-full rounded-lg"
                        ></iframe>
                    </div>
                `;
            }
        }
    });

    return tempDiv.innerHTML;
};