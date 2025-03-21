import {FaGithub} from "react-icons/fa";
import Image from "next/image";
import { FaXTwitter } from "react-icons/fa6";

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
            <div className="text-center space-y-4 dark:animate-pulse">
                <h1 className="text-4xl sm:text-5xl font-bold dark:text-white relative">
                    Whatever I do,{'  '}
                    <span className="relative inline-block">
            I do it
                        {/* Accent line overlay */}
                        <span
                            className="absolute -inset-x-2 -inset-y-4 dark:bg-white/30 -rotate-3 transform bg-black/30"
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
                        className="text-blue-600 hover:underline"
                    >
                        Proactively
                    </a>
                </h1>

            </div>

            {/* Contact and Social Links */}
            <div className="flex flex-col items-center space-y-4 mt-5">

                <div className="flex ">
                    <div className="bg-gray-800 text-white px-4 py-2 rounded-md flex items-center space-x-4">
                        <span>Reach @prosamik: </span>
                        <a
                            href="https://www.twitter.com/prosamik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 flex flex-col items-center"
                        >
                            <FaXTwitter size={30}/>
                        </a>
                        <a
                            href="https://www.github.com/prosamik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gray-300 flex flex-col items-center"
                        >
                            <FaGithub size={30}/>
                        </a>
                        {/* <a
                            href="https://www.linkedin.com/in/prosamik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 flex flex-col items-center"
                        >
                            <FaLinkedin size={30}/>
                        </a> */}
                    </div>
                </div>
            </div>

        </div>
        </>
    );
}