import { Zap, Users, Target, Award, Heart, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6 py-12 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                    <Heart className="h-3 w-3 mr-1" />
                    Our Story
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About OpenGMAO</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                    Revolutionizing industrial maintenance with AI-powered intelligence
                </p>
            </div>

            {/* Mission */}
            <Card className="border-2 overflow-hidden">
                <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Target className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                OpenGMAO was created to bridge the gap between complex industrial equipment
                                and the technicians who maintain them. We believe that every maintenance
                                professional deserves instant access to the knowledge they need, when they need it.
                                Our AI-powered platform transforms scattered documentation into
                                actionable, accessible intelligence.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Values */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-center">Our Values</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Zap,
                            title: 'Innovation',
                            description: 'Pushing boundaries with cutting-edge AI technology',
                            color: 'from-yellow-500 to-orange-600'
                        },
                        {
                            icon: Users,
                            title: 'User-Centric',
                            description: 'Designed by engineers, for engineers',
                            color: 'from-blue-500 to-cyan-600'
                        },
                        {
                            icon: Award,
                            title: 'Excellence',
                            description: 'Committed to 100% data accuracy and reliability',
                            color: 'from-purple-500 to-pink-600'
                        }
                    ].map((value) => (
                        <Card key={value.title} className="border-2 card-hover">
                            <CardContent className="p-6 text-center">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center mx-auto mb-4`}>
                                    <value.icon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                                <p className="text-sm text-muted-foreground">{value.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Team */}
            <Card className="border-2 bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Meet the Creator</h2>
                        <p className="text-muted-foreground">The mind behind OpenGMAO</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl">
                            <span className="text-3xl font-bold text-white">EY</span>
                        </div>
                        <h3 className="text-xl font-bold">Engineer Youssef</h3>
                        <p className="text-muted-foreground mb-2">Founder & Developer</p>
                        <Badge variant="outline" className="gap-1">
                            <Globe className="h-3 w-3" />
                            OFPPT, Morocco
                        </Badge>
                        <p className="mt-4 text-center text-muted-foreground max-w-lg">
                            Industrial maintenance engineer turned software developer, passionate about
                            using AI to solve real-world maintenance challenges.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { value: 'AI', label: 'Powered' },
                    { value: '100%', label: 'Accuracy' },
                    { value: '24/7', label: 'Available' },
                    { value: '∞', label: 'Potential' }
                ].map((stat) => (
                    <Card key={stat.label} className="border-2">
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
