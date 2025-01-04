import {FaGithub, FaLinkedin, FaTwitter} from "react-icons/fa";
import Image from "next/image";

export default function ProfileHeader() {

    // Final render
    return (
        <>
        <div className="flex flex-col items-center py-1 pt-2 w-full">


            <div className="flex flex-col items-center space-y-4 mb-2">
                <Image
                    src="/me-here.jpg"
                    alt="Samik"
                    width={250}
                    height={250}
                    className="rounded-full shadow-lg"
                    priority
                />
                <h2 className="text-2xl  mb-2">Hey, I&#39;m Samik</h2>
            </div>

            {/* Role Description */}
            <div className="text-center space-y-4 animate-pulse">
                <h1 className="text-4xl sm:text-5xl font-bold text-white relative">
                    I{'  '}
                    <span className="relative inline-block">
            build
                        {/* Accent line overlay */}
                        <span
                            className="absolute -inset-x-2 -inset-y-4 bg-white/30 -rotate-3 transform"
                            style={{
                                clipPath: 'polygon(0% 55%, 100% 30%, 40% 80%, -10% 65%)'
                            }}
                        />
          </span>{'  '}
                    {' '}
                    <a
                        href="https://prosamik.com/projects"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                    >
                        Products
                    </a>
                </h1>

            </div>

            {/* Contact and Social Links */}
            <div className="flex flex-col items-center space-y-4 mt-5">

                <div className="flex ">
                    <div className="bg-gray-800 text-white px-4 py-2 rounded-md flex items-center space-x-4">
                        <span>Reach me</span>
                        <a
                            href="https://www.twitter.com/prosamik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 flex flex-col items-center"
                        >
                            <FaTwitter size={30}/>
                        </a>
                        <a
                            href="https://www.github.com/prosamik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gray-300 flex flex-col items-center"
                        >
                            <FaGithub size={30}/>
                        </a>
                        <a
                            href="https://www.linkedin.com/in/prosamik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 flex flex-col items-center"
                        >
                            <FaLinkedin size={30}/>
                        </a>
                    </div>
                </div>
            </div>

        </div>
        </>
    );
}