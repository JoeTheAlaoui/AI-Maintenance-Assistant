import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Wrench,
    ArrowRight,
    CheckCircle2,
    Package,
    BarChart3,
    Users,
    Clock,
    Target,
    Zap,
    Shield,
    TrendingUp,
    Factory,
    Building2,
    Plane
} from "lucide-react";

export default function LandingPage() {
    const features = [
        {
            icon: <Wrench className="h-6 w-6 text-white" />,
            title: "Asset Tracking",
            description: "Complete digital register of all equipment and machinery with status tracking, location management, and maintenance history."
        },
        {
            icon: <CheckCircle2 className="h-6 w-6 text-white" />,
            title: "Work Order Management",
            description: "Create, assign, and track maintenance tasks in real-time. Set priorities, track progress, and manage technician assignments."
        },
        {
            icon: <Package className="h-6 w-6 text-white" />,
            title: "Inventory Control",
            description: "Smart parts management with auto-decrement, low-stock alerts, and supplier tracking. Never run out of critical components."
        },
        {
            icon: <BarChart3 className="h-6 w-6 text-white" />,
            title: "Analytics & Reports",
            description: "Real-time dashboards and comprehensive reports. Track KPIs, downtime, costs, and equipment performance metrics."
        },
        {
            icon: <Users className="h-6 w-6 text-white" />,
            title: "Team Collaboration",
            description: "Assign tasks, track technician workload, and communicate effectively. Built-in notifications keep everyone informed."
        },
        {
            icon: <Clock className="h-6 w-6 text-white" />,
            title: "Preventive Maintenance",
            description: "Schedule recurring maintenance tasks, set up automated reminders, and prevent equipment failures before they happen."
        }
    ];

    const benefits = [
        {
            icon: <TrendingUp className="h-5 w-5" />,
            title: "Reduce Downtime",
            value: "30%",
            description: "Average reduction in unplanned equipment downtime"
        },
        {
            icon: <Target className="h-5 w-5" />,
            title: "Increase Efficiency",
            value: "40%",
            description: "Faster work order completion rates"
        },
        {
            icon: <Shield className="h-5 w-5" />,
            title: "Lower Costs",
            value: "25%",
            description: "Reduction in maintenance-related expenses"
        }
    ];

    const useCases = [
        {
            icon: <Factory className="h-8 w-8 text-blue-600" />,
            title: "Manufacturing",
            description: "Production line equipment, CNC machines, conveyor systems"
        },
        {
            icon: <Building2 className="h-8 w-8 text-blue-600" />,
            title: "Facilities",
            description: "HVAC systems, elevators, building infrastructure"
        },
        {
            icon: <Plane className="h-8 w-8 text-blue-600" />,
            title: "Transportation",
            description: "Fleet vehicles, aircraft, heavy machinery"
        }
    ];

    const steps = [
        {
            number: "1",
            title: "Register Assets",
            description: "Add your equipment with details, location, and specifications"
        },
        {
            number: "2",
            title: "Schedule Maintenance",
            description: "Set up preventive maintenance schedules and create work orders"
        },
        {
            number: "3",
            title: "Track & Optimize",
            description: "Monitor performance, analyze data, and optimize your operations"
        }
    ];

    return (
        <div className="flex min-h-screen flex-col bg-white">
            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
                        <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
                            <Wrench className="h-5 w-5" />
                        </div>
                        <span>OpenGMAO</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How It Works</a>
                        <a href="#use-cases" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Use Cases</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="font-medium hover:text-blue-600">
                                Log in
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* --- HERO SECTION --- */}
                <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 lg:py-32">
                    <div className="container mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left: Content */}
                            <div className="space-y-8">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                    🚀 Version 1.0 is Live
                                </Badge>

                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
                                    Maintenance Management{" "}
                                    <span className="text-blue-600">Made Simple</span>
                                </h1>

                                <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
                                    OpenGMAO is the modern, open-source CMMS designed for industrial teams.
                                    Track assets, manage work orders, and control inventory—all without the
                                    complexity of enterprise software.
                                </p>

                                <div className="flex flex-wrap gap-4">
                                    <Link href="/dashboard">
                                        <Button size="lg" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg hover:shadow-xl transition-all">
                                            Start Managing <ArrowRight className="h-5 w-5" />
                                        </Button>
                                    </Link>
                                    <Link href="https://github.com/Grashjs/cmms" target="_blank">
                                        <Button variant="outline" size="lg" className="h-12 px-8 border-slate-300">
                                            View on GitHub
                                        </Button>
                                    </Link>
                                </div>

                                {/* Stats */}
                                <div className="flex flex-wrap gap-8 pt-4">
                                    <div>
                                        <div className="text-3xl font-bold text-slate-900">10,000+</div>
                                        <div className="text-sm text-slate-600">Assets Tracked</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-900">500+</div>
                                        <div className="text-sm text-slate-600">Work Orders/Month</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-900">50+</div>
                                        <div className="text-sm text-slate-600">Facilities</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Dashboard Mockup */}
                            <div className="relative hidden lg:block">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-slate-100 p-12 flex items-center justify-center min-h-[400px]">
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                                            <Wrench className="h-8 w-8 text-white" />
                                        </div>
                                        <p className="text-slate-600 font-medium">Dashboard Preview</p>
                                        <p className="text-sm text-slate-500">Sidebar • KPI Cards • Charts • Activity Feed</p>
                                    </div>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute -z-10 -top-10 -right-10 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
                                <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FEATURES SECTION --- */}
                <section id="features" className="py-20 lg:py-32 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                                Everything You Need
                            </h2>
                            <p className="text-xl text-slate-600">
                                Comprehensive CMMS features to streamline your maintenance operations
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="group relative p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-xl transition-all hover:-translate-y-1"
                                >
                                    <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- HOW IT WORKS --- */}
                <section id="how-it-works" className="py-20 lg:py-32 bg-slate-50">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                                Get Started in Minutes
                            </h2>
                            <p className="text-xl text-slate-600">
                                Simple three-step process to transform your maintenance operations
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {steps.map((step, index) => (
                                <div key={index} className="relative">
                                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 text-center">
                                        <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg">
                                            {step.number}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-3">
                                            {step.title}
                                        </h3>
                                        <p className="text-slate-600">
                                            {step.description}
                                        </p>
                                    </div>
                                    {/* Arrow connector (not on last item) */}
                                    {index < steps.length - 1 && (
                                        <ArrowRight className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-blue-300 h-8 w-8" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- BENEFITS SECTION --- */}
                <section className="py-20 lg:py-32 bg-blue-600 text-white">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                                Proven Results
                            </h2>
                            <p className="text-xl text-blue-100">
                                Real impact on your maintenance operations and bottom line
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                                    <div className="bg-white/20 p-3 rounded-lg inline-block mb-4">
                                        {benefit.icon}
                                    </div>
                                    <div className="text-5xl font-bold mb-2">{benefit.value}</div>
                                    <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                                    <p className="text-blue-100">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- USE CASES --- */}
                <section id="use-cases" className="py-20 lg:py-32 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                                Built for Your Industry
                            </h2>
                            <p className="text-xl text-slate-600">
                                Trusted by maintenance teams across diverse sectors
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {useCases.map((useCase, index) => (
                                <div key={index} className="bg-slate-50 rounded-2xl p-8 hover:bg-blue-50 transition-colors border border-slate-200">
                                    <div className="mb-4">{useCase.icon}</div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                                        {useCase.title}
                                    </h3>
                                    <p className="text-slate-600">
                                        {useCase.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- CTA SECTION --- */}
                <section className="py-20 lg:py-32 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                    <div className="container mx-auto px-6 text-center">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                            Ready to Optimize Your Maintenance?
                        </h2>
                        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                            Join teams managing thousands of assets with OpenGMAO.
                            Start tracking, managing, and optimizing today.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link href="/dashboard">
                                <Button size="lg" variant="secondary" className="h-12 px-8 bg-white text-blue-600 hover:bg-blue-50 gap-2 text-lg">
                                    Get Started Free <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="https://github.com/Grashjs/cmms" target="_blank">
                                <Button size="lg" variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10 text-lg">
                                    View Documentation
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* --- ENHANCED FOOTER --- */}
            <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        {/* Brand Column */}
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
                                <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <span>OpenGMAO</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                Modern, open-source maintenance management for industrial teams.
                            </p>
                            <div className="flex gap-2 items-center">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm text-slate-400">System Operational</span>
                            </div>
                        </div>

                        {/* Product Column */}
                        <div>
                            <h3 className="font-semibold text-white mb-4">Product</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                                <li><a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a></li>
                                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                            </ul>
                        </div>

                        {/* Resources Column */}
                        <div>
                            <h3 className="font-semibold text-white mb-4">Resources</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="https://github.com/Grashjs/cmms" target="_blank" className="hover:text-white transition-colors">Documentation</a></li>
                                <li><a href="https://github.com/Grashjs/cmms" target="_blank" className="hover:text-white transition-colors">GitHub</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                            </ul>
                        </div>

                        {/* Company Column */}
                        <div>
                            <h3 className="font-semibold text-white mb-4">Company</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-slate-800 pt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-slate-400">
                                © 2025 OpenGMAO. Built by <span className="font-semibold text-white">Engineer Youssef</span>. Open source project.
                            </p>
                            <div className="flex gap-6 text-sm">
                                <a href="#" className="hover:text-white transition-colors">Twitter</a>
                                <a href="https://github.com/Grashjs/cmms" target="_blank" className="hover:text-white transition-colors">GitHub</a>
                                <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
