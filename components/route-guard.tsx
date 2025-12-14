'use client';

import { isFeatureEnabled, type FeatureFlag } from '@/config/features';
import { Lock, Home, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RouteGuardProps {
    feature: FeatureFlag;
    children: React.ReactNode;
}

/**
 * Guard pour protéger routes désactivées
 */
export function RouteGuard({ feature, children }: RouteGuardProps) {
    const isEnabled = isFeatureEnabled(feature);

    if (!isEnabled) {
        return (
            <div className="max-w-2xl mx-auto mt-12 px-4">
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Lock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-blue-900 mb-2">
                                Feature Not Available Yet
                            </h2>
                            <p className="text-blue-700 mb-4">
                                This feature is coming soon in a future version of OpenGMAO.
                            </p>

                            <div className="bg-white/50 rounded-md p-4 mb-4">
                                <p className="font-medium text-blue-900 mb-2">Currently available:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                    <li>AI Maintenance Assistant</li>
                                    <li>QR Code Scanning</li>
                                    <li>AI Manual Import</li>
                                    <li>Asset Viewing</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <Button asChild>
                                    <Link href="/">
                                        <Home className="h-4 w-4 mr-2" />
                                        Go to Home
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href="/assistant">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Open AI Assistant
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
