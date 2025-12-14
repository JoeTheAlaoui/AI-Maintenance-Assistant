import { FileText, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function TermsOfServicePage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Back Link */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="text-center space-y-4 py-8 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-2xl border-2">
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                    <FileText className="h-3 w-3 mr-1" />
                    Legal Document
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
                <p className="text-muted-foreground">Last updated: December 14, 2025</p>
            </div>

            {/* Content */}
            <Card className="border-2">
                <CardContent className="p-8 prose prose-gray max-w-none">
                    <h2 className="text-2xl font-bold mt-0">1. Agreement to Terms</h2>
                    <p>
                        By accessing or using OpenGMAO (&quot;Service&quot;), you agree to be bound by these
                        Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms,
                        you may not access the Service.
                    </p>

                    <h2 className="text-2xl font-bold">2. Description of Service</h2>
                    <p>OpenGMAO is an AI-powered maintenance management platform that provides:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Equipment documentation management</li>
                        <li>AI-assisted maintenance guidance</li>
                        <li>QR code-based equipment identification</li>
                        <li>PDF manual processing and data extraction</li>
                        <li>Diagnostic assistance and troubleshooting</li>
                    </ul>

                    <h2 className="text-2xl font-bold">3. User Accounts</h2>
                    <h3 className="text-lg font-semibold">3.1 Account Creation</h3>
                    <p>
                        You must provide accurate and complete information when creating an account.
                        You are responsible for maintaining the security of your account credentials.
                    </p>
                    <h3 className="text-lg font-semibold">3.2 Account Responsibilities</h3>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>You must be at least 18 years old to use this Service</li>
                        <li>You are responsible for all activities under your account</li>
                        <li>You must notify us immediately of any unauthorized access</li>
                    </ul>

                    <h2 className="text-2xl font-bold">4. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Use the Service for any illegal purpose</li>
                        <li>Upload malicious content or malware</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                        <li>Interfere with or disrupt the Service</li>
                        <li>Violate any applicable laws or regulations</li>
                    </ul>

                    <h2 className="text-2xl font-bold">5. AI Services</h2>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm">
                        <p className="mb-2"><strong>⚠️ Important Notice:</strong></p>
                        <ul className="list-disc pl-6 space-y-1 mb-0">
                            <li>AI recommendations are not a substitute for professional expertise</li>
                            <li>Always verify AI-generated information before acting on it</li>
                            <li>We do not guarantee the accuracy of AI outputs</li>
                            <li>You are responsible for decisions based on AI recommendations</li>
                        </ul>
                    </div>

                    <h2 className="text-2xl font-bold">6. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, OpenGMAO shall not be liable for
                        any indirect, incidental, special, consequential, or punitive damages, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Loss of profits or revenue</li>
                        <li>Loss of data</li>
                        <li>Equipment damage or downtime</li>
                        <li>Personal injury resulting from maintenance activities</li>
                    </ul>

                    <h2 className="text-2xl font-bold">7. Disclaimer of Warranties</h2>
                    <div className="bg-gray-50 p-4 rounded-lg border text-sm">
                        The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of
                        any kind, either express or implied, including but not limited to merchantability,
                        fitness for a particular purpose, and non-infringement.
                    </div>

                    <h2 className="text-2xl font-bold">8. Contact Information</h2>
                    <p>For questions about these Terms, contact us at:</p>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <p className="mb-1"><strong>Email:</strong> legal@opengmao.com</p>
                        <p className="mb-0"><strong>Address:</strong> OFPPT, Morocco</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
