'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, Camera, Lightbulb, Package } from 'lucide-react';

export default function ScanPage() {
    const [scanning, setScanning] = useState(true);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSimulateScan = () => {
        setScanning(false);
        setSuccess(true);
        setTimeout(() => {
            router.push('/assistant?asset=demo');
        }, 2000);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-4">
                    <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Camera Active
                    </Badge>
                </div>

                <h1 className="text-3xl font-bold tracking-tight">Scan Equipment QR Code</h1>
                <p className="text-muted-foreground mt-2">
                    Point your camera at the equipment QR code to get started
                </p>
            </div>

            {/* Scanner Card */}
            <Card className="border-2 overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">QR Scanner</CardTitle>
                    </div>
                    <CardDescription>
                        Position the QR code within the frame
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Scanner View */}
                    <div className="relative aspect-square bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
                        {/* Camera Simulation */}
                        {scanning && !success && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                {/* QR Frame Corners */}
                                <div className="relative w-64 h-64">
                                    {/* Top-left corner */}
                                    <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-white rounded-tl-lg" />
                                    {/* Top-right corner */}
                                    <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-white rounded-tr-lg" />
                                    {/* Bottom-left corner */}
                                    <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-white rounded-bl-lg" />
                                    {/* Bottom-right corner */}
                                    <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-white rounded-br-lg" />

                                    {/* Scan Line Animation */}
                                    <div className="absolute inset-0 overflow-hidden">
                                        <div
                                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"
                                            style={{
                                                animation: 'scan 2s ease-in-out infinite',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 text-center">
                                    <Camera className="h-8 w-8 text-white/50 mx-auto mb-3" />
                                    <p className="text-white/70 text-sm">Waiting for QR code...</p>
                                </div>

                                <Button
                                    onClick={handleSimulateScan}
                                    className="mt-6 btn-gradient rounded-xl"
                                >
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Simulate Scan
                                </Button>
                            </div>
                        )}

                        {/* Success Overlay */}
                        {success && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/90">
                                <div className="text-center text-white">
                                    <CheckCircle className="h-20 w-20 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold">QR Code Scanned!</h3>
                                    <p className="text-white/80 mt-2">Redirecting to AI Assistant...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tips Section */}
                    <div className="p-6 bg-gray-50 border-t">
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            <span className="font-semibold text-sm">Scanning Tips</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                'Hold device steady',
                                'Ensure good lighting',
                                'Keep QR centered',
                                'Avoid reflections'
                            ].map((tip) => (
                                <div key={tip} className="flex items-center gap-2 text-muted-foreground">
                                    <span className="text-green-500">✓</span>
                                    <span>{tip}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Browse Alternative */}
                    <div className="p-4 border-t">
                        <Button
                            variant="outline"
                            className="w-full rounded-xl border-2"
                            onClick={() => router.push('/assets')}
                        >
                            <Package className="mr-2 h-4 w-4" />
                            Skip Scan & Browse Equipment
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* CSS for scan animation */}
            <style jsx global>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: calc(100% - 4px); }
                    100% { top: 0; }
                }
            `}</style>
        </div>
    );
}
