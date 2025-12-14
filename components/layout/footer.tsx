import Link from 'next/link'
import { Zap, Github, Linkedin, Twitter } from 'lucide-react'

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-t pb-20 lg:pb-0">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-2">
                        <Link href="/" className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-xl text-gray-900">OpenGMAO</span>
                        </Link>
                        <p className="text-gray-600 text-sm mb-6 max-w-sm">
                            AI-powered maintenance assistant for industrial equipment.
                            Transform your maintenance workflow with intelligent automation.
                        </p>

                        {/* Social Links */}
                        <div className="flex items-center gap-3">
                            {/* Twitter/X */}
                            <Link
                                href="#"
                                className="w-10 h-10 rounded-xl bg-black hover:bg-gray-800 flex items-center justify-center transition-all hover:scale-105 shadow-md"
                                aria-label="Twitter"
                            >
                                <Twitter className="h-5 w-5 text-white" />
                            </Link>

                            {/* LinkedIn */}
                            <Link
                                href="#"
                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 shadow-md"
                                style={{ backgroundColor: '#0A66C2' }}
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="h-5 w-5 text-white" />
                            </Link>

                            {/* GitHub */}
                            <Link
                                href="#"
                                className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-black flex items-center justify-center transition-all hover:scale-105 shadow-md"
                                aria-label="GitHub"
                            >
                                <Github className="h-5 w-5 text-white" />
                            </Link>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li>
                                <Link href="/pricing" className="hover:text-blue-600 transition-colors">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li>
                                <Link href="/about" className="hover:text-blue-600 transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-blue-600 transition-colors">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li>
                                <Link href="/legal/privacy" className="hover:text-blue-600 transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/terms" className="hover:text-blue-600 transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
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
