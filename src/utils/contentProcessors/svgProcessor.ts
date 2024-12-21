export const processSVGs = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const svgs = tempDiv.querySelectorAll('svg');
    svgs.forEach((svg) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'my-4 flex justify-center';
        svg.parentNode?.insertBefore(wrapper, svg);
        wrapper.appendChild(svg);
        svg.classList.add('max-w-full');
    });

    return tempDiv.innerHTML;
};