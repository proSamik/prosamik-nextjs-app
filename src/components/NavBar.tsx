'use client';

import Link from 'next/link';

const NavBar = () => {
    return (
        <nav className="flex items-center justify-between p-4 bg-gray-800 text-white">
            <div className="text-lg font-bold">My Blog</div>
            <div className="flex space-x-4">
                <Link href="/" className="hover:text-gray-400">Home</Link>
                <Link href="/about" className="hover:text-gray-400">About Me</Link>
            </div>
        </nav>
    );
};

export default NavBar;
