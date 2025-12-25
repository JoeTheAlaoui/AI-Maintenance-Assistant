import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 border-t dark:border-gray-800 pb-20 lg:pb-0">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-gray-50">OpenGMAO</span>
                        </Link>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm text-center max-w-md">
                        AI-powered maintenance assistant for industrial equipment.
                    </p>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <p>
                            © {currentYear} OpenGMAO. All rights reserved.
                        </p>
                        <p>
                            Developed with <span className="text-red-500">❤️</span> by <span className="gradient-text font-semibold">Engineer Youssef</span> • OFPPT Morocco
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
