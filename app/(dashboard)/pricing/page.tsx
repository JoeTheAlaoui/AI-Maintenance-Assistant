import { Check, Sparkles, Zap, Building2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PricingPage() {
    const plans = [
        {
            name: 'Free',
            description: 'Perfect for getting started',
            price: '0',
            period: 'forever',
            features: [
                'Up to 5 equipment assets',
                'AI Assistant (basic)',
                'QR Code scanning',
                'PDF import (1 per day)',
                'Community support'
            ],
            cta: 'Get Started',
            ctaVariant: 'outline' as const,
            popular: false,
            gradient: 'from-gray-500 to-gray-600'
        },
        {
            name: 'Pro',
            description: 'For maintenance professionals',
            price: '29',
            period: 'month',
            features: [
                'Unlimited equipment assets',
                'AI Assistant (advanced)',
                'Priority QR scanning',
                'Unlimited PDF imports',
                'Work order management',
                'Inventory tracking',
                'Priority support',
                'Export to PDF/Excel'
            ],
            cta: 'Start Free Trial',
            ctaVariant: 'default' as const,
            popular: true,
            gradient: 'from-blue-500 to-purple-600'
        },
        {
            name: 'Enterprise',
            description: 'For large organizations',
            price: 'Custom',
            period: '',
            features: [
                'Everything in Pro',
                'Multi-site support',
                'Team management',
                'Custom integrations',
                'API access',
                'Dedicated account manager',
                'SLA guarantee',
                'On-premise deployment'
            ],
            cta: 'Contact Sales',
            ctaVariant: 'outline' as const,
            popular: false,
            gradient: 'from-purple-500 to-pink-600'
        }
    ]

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4 py-8">
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Simple Pricing
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Choose Your Plan
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Start free and scale as you grow. No hidden fees, cancel anytime.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card
                        key={plan.name}
                        className={`border-2 relative overflow-hidden ${plan.popular ? 'border-blue-500 shadow-xl scale-105' : ''
                            }`}
                    >
                        {/* Popular Badge */}
                        {plan.popular && (
                            <div className="absolute top-0 right-0">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">
                                    MOST POPULAR
                                </div>
                            </div>
                        )}

                        <CardHeader className="pb-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                                {plan.name === 'Free' && <Zap className="h-6 w-6 text-white" />}
                                {plan.name === 'Pro' && <Sparkles className="h-6 w-6 text-white" />}
                                {plan.name === 'Enterprise' && <Building2 className="h-6 w-6 text-white" />}
                            </div>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Price */}
                            <div className="flex items-baseline gap-1">
                                {plan.price !== 'Custom' && (
                                    <span className="text-muted-foreground">$</span>
                                )}
                                <span className="text-4xl font-bold">{plan.price}</span>
                                {plan.period && (
                                    <span className="text-muted-foreground">/{plan.period}</span>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="space-y-3">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-sm">
                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="h-3 w-3 text-green-600" />
                                        </div>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Button
                                asChild
                                className={`w-full rounded-xl h-12 ${plan.popular ? 'btn-gradient' : ''
                                    }`}
                                variant={plan.ctaVariant}
                            >
                                <Link href={plan.name === 'Enterprise' ? '/contact' : '/signup'}>
                                    {plan.cta}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* FAQ Preview */}
            <Card className="border-2 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">Have Questions?</h2>
                    <p className="text-muted-foreground mb-4">
                        Our team is here to help. Reach out anytime.
                    </p>
                    <Button asChild variant="outline" className="rounded-xl border-2">
                        <Link href="/contact">
                            Contact Support
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Trust Badges */}
            <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">Trusted by maintenance teams worldwide</p>
                <div className="flex flex-wrap justify-center gap-6">
                    {['No credit card required', '14-day free trial', 'Cancel anytime', 'GDPR compliant'].map((badge) => (
                        <div key={badge} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-green-500" />
                            {badge}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
