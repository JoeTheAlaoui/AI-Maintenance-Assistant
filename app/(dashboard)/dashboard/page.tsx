import {
    QrCode,
    MessageSquare,
    Sparkles,
    Package,
    ArrowRight,
    Zap,
    Brain,
    Scan,
    BookOpen,
    Clock,
    Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
    return (
        <div className="min-h-screen -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
            {/* ===== HERO SECTION ===== */}
            <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-b">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-grid opacity-30" />

                {/* Floating Orbs */}
                <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float-delayed" />

                <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24">
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="feature-badge">
                            <Zap className="h-4 w-4" />
                            <span>AI-Powered Maintenance Assistant</span>
                            <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg text-[10px]">
                                v1.0
                            </Badge>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="text-center space-y-6 mb-12">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                            <span className="gradient-text-animated block">
                                Maintenance Made
                            </span>
                            <span className="text-gray-900">Intelligent</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto text-balance leading-relaxed">
                            Scan equipment, ask questions, get instant AI-powered guidance.
                            No manual searching. Just solutions.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Button asChild size="lg" className="btn-gradient text-lg px-8 py-6 rounded-xl w-full sm:w-auto">
                            <Link href="/scan">
                                <QrCode className="mr-2 h-5 w-5" />
                                Scan Equipment Now
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>

                        <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-white w-full sm:w-auto">
                            <Link href="/assistant">
                                <MessageSquare className="mr-2 h-5 w-5" />
                                Open AI Assistant
                            </Link>
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
                        {[
                            { value: '100%', label: 'AI Accurate', icon: Brain },
                            { value: '<30s', label: 'Avg Response', icon: Clock },
                            { value: '24/7', label: 'Available', icon: Shield },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <stat.icon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                                <div className="text-xs text-gray-600 font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== FEATURES SECTION ===== */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                    <Badge className="mb-4 text-sm px-4 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200">
                        Features
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Powerful AI-driven tools designed for maintenance technicians
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QR Scanner */}
                    <Card className="card-hover border-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-bl-[100px] -z-10 group-hover:scale-150 transition-transform duration-500" />

                        <CardHeader>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
                                <Scan className="h-7 w-7 text-white" />
                            </div>
                            <CardTitle className="text-xl">QR Code Scanner</CardTitle>
                            <CardDescription>Instant equipment identification</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Point your camera at any equipment QR code to instantly access full documentation and AI assistance.
                            </p>

                            <ul className="space-y-1.5">
                                {['No manual lookup', 'Works offline', 'Auto-loads context'].map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-sm">
                                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button asChild className="w-full btn-gradient-green rounded-xl">
                                <Link href="/scan">
                                    Open Scanner
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* AI Assistant */}
                    <Card className="card-hover border-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-bl-[100px] -z-10 group-hover:scale-150 transition-transform duration-500" />

                        <CardHeader>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                                <Brain className="h-7 w-7 text-white" />
                            </div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                AI Assistant
                                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">AI</Badge>
                            </CardTitle>
                            <CardDescription>Expert maintenance guidance</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Chat with an AI expert that knows your equipment. Get step-by-step troubleshooting and procedures.
                            </p>

                            <ul className="space-y-1.5">
                                {['Natural language', 'Equipment-specific', 'Available 24/7'].map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-sm">
                                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button asChild className="w-full btn-gradient rounded-xl">
                                <Link href="/assistant">
                                    Open Assistant
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* AI Import */}
                    <Card className="card-hover border-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-bl-[100px] -z-10 group-hover:scale-150 transition-transform duration-500" />

                        <CardHeader>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
                                <Sparkles className="h-7 w-7 text-white" />
                            </div>
                            <CardTitle className="text-xl">AI Manual Import</CardTitle>
                            <CardDescription>Automatic data extraction</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Upload equipment manuals (PDF) and let AI extract diagnostics, components, and maintenance schedules.
                            </p>

                            <Button asChild variant="outline" className="w-full rounded-xl">
                                <Link href="/assets/import">
                                    Import Manual
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Equipment Database */}
                    <Card className="card-hover border-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-bl-[100px] -z-10 group-hover:scale-150 transition-transform duration-500" />

                        <CardHeader>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-lg">
                                <BookOpen className="h-7 w-7 text-white" />
                            </div>
                            <CardTitle className="text-xl">Equipment Database</CardTitle>
                            <CardDescription>Centralized documentation</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Access complete equipment database with diagnostics codes, component lists, and specifications.
                            </p>

                            <Button asChild variant="outline" className="w-full rounded-xl">
                                <Link href="/assets">
                                    Browse Equipment
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* ===== HOW IT WORKS ===== */}
            <section className="bg-gray-50 border-y">
                <div className="max-w-6xl mx-auto px-6 py-16">
                    <div className="text-center mb-12">
                        <Badge className="mb-4 text-sm px-4 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200">
                            Simple Process
                        </Badge>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                        <p className="text-gray-600">Get maintenance help in 3 simple steps</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200" />

                        {[
                            { num: '1', title: 'Scan QR Code', desc: 'Point camera at equipment', gradient: 'from-blue-500 to-cyan-500', icon: QrCode },
                            { num: '2', title: 'Ask AI', desc: 'Describe the problem', gradient: 'from-purple-500 to-pink-500', icon: MessageSquare },
                            { num: '3', title: 'Get Solutions', desc: 'Receive instant guidance', gradient: 'from-orange-500 to-red-500', icon: Zap }
                        ].map((step) => (
                            <div key={step.num} className="text-center relative">
                                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white shadow-xl bg-gradient-to-br ${step.gradient} relative z-10`}>
                                    {step.num}
                                </div>
                                <step.icon className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                                <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                                <p className="text-sm text-gray-600">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CTA SECTION ===== */}
            <section className="max-w-4xl mx-auto px-6 py-16">
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl overflow-hidden">
                    <CardContent className="p-8 md:p-12 text-center relative">
                        <div className="absolute inset-0 bg-grid opacity-20" />

                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                                Experience the future of maintenance. No setup required. Just scan and ask.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button asChild size="lg" className="btn-gradient text-lg px-8 py-6 rounded-xl w-full sm:w-auto">
                                    <Link href="/scan">
                                        <QrCode className="mr-2 h-5 w-5" />
                                        Start Scanning
                                    </Link>
                                </Button>

                                <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 w-full sm:w-auto">
                                    <Link href="/assets/import">
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Import First Manual
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
