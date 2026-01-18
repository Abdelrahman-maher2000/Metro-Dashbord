import { Briefcase, Linkedin, Mail } from "lucide-react";

export default function Footer() {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-gray-50 px-4 lg:px-8 py-4 pdf-hide">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700">
                    Built by Abdelrahman Maher
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <a
                        href="https://abdelrahmanmaherportfolio.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 hover:underline hover:text-cyan-700 transition-colors"
                    >
                        <Briefcase className="h-4 w-4" aria-hidden="true" />
                        Portfolio
                    </a>
                    <a
                        href="http://mail.google.com/mail/?view=cm&fs=1&to=abdelrahmanmaher858@gmail.com"
                        className="inline-flex items-center gap-2 hover:underline hover:text-cyan-700 transition-colors"
                        target="_blank"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        abdelrahmanmaher858@gmail.com
                    </a>
                    <a
                        href="https://www.linkedin.com/in/abdelrahman-maher-098bb0383/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 hover:underline hover:text-cyan-700 transition-colors"
                    >
                        <Linkedin className="h-4 w-4" aria-hidden="true" />
                        LinkedIn
                    </a>
                </div>
            </div>
        </footer>
    );
}
