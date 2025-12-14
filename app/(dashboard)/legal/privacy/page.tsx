import { Shield, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Back Link */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="text-center space-y-4 py-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Legal Document
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: December 14, 2025</p>
            </div>

            {/* Content */}
            <Card className="border-2">
                <CardContent className="p-8 prose prose-gray max-w-none">
                    <h2 className="text-2xl font-bold mt-0">1. Introduction</h2>
                    <p>
                        OpenGMAO (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                        This Privacy Policy explains how we collect, use, disclose, and safeguard
                        your information when you use our AI-powered maintenance assistant platform.
                    </p>

                    <h2 className="text-2xl font-bold">2. Information We Collect</h2>

                    <h3 className="text-lg font-semibold">2.1 Personal Information</h3>
                    <p>We collect information that you provide directly to us, including:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Name and contact information (email address, phone number)</li>
                        <li>Company/organization details</li>
                        <li>Account credentials</li>
                        <li>Profile information</li>
                    </ul>

                    <h3 className="text-lg font-semibold">2.2 Equipment and Maintenance Data</h3>
                    <p>When you use our platform, we collect:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Equipment specifications and documentation</li>
                        <li>Maintenance records and schedules</li>
                        <li>AI assistant interactions and queries</li>
                        <li>QR code scan data</li>
                        <li>Uploaded PDF manuals and technical documents</li>
                    </ul>

                    <h2 className="text-2xl font-bold">3. How We Use Your Information</h2>
                    <p>We use the collected information to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Provide and maintain our AI maintenance assistant services</li>
                        <li>Improve and personalize your experience</li>
                        <li>Process AI-powered equipment documentation extraction</li>
                        <li>Generate maintenance insights and recommendations</li>
                        <li>Ensure platform security and prevent fraud</li>
                    </ul>

                    <h2 className="text-2xl font-bold">4. AI and Machine Learning</h2>
                    <p>Our platform uses artificial intelligence to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Extract information from equipment manuals</li>
                        <li>Provide diagnostic assistance</li>
                        <li>Generate maintenance recommendations</li>
                    </ul>
                    <p className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm">
                        <strong>Note:</strong> All AI processing is performed with strict data privacy controls.
                        Your equipment data is not used to train public AI models without your explicit consent.
                    </p>

                    <h2 className="text-2xl font-bold">5. Data Security</h2>
                    <p>We implement industry-standard security measures:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Encryption in transit (TLS/SSL) and at rest</li>
                        <li>Regular security audits and vulnerability assessments</li>
                        <li>Access controls and authentication</li>
                        <li>Secure cloud infrastructure</li>
                    </ul>

                    <h2 className="text-2xl font-bold">6. Your Rights</h2>
                    <p>You have the following rights:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Access:</strong> Request a copy of your personal data</li>
                        <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                        <li><strong>Deletion:</strong> Request deletion of your data</li>
                        <li><strong>Portability:</strong> Receive your data in a portable format</li>
                    </ul>

                    <h2 className="text-2xl font-bold">7. Contact Us</h2>
                    <p>For questions about this Privacy Policy, contact us at:</p>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <p className="mb-1"><strong>Email:</strong> privacy@opengmao.com</p>
                        <p className="mb-0"><strong>Address:</strong> OFPPT, Morocco</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
