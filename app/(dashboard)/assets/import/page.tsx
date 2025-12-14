'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Upload, FileText, Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Status = 'idle' | 'uploading' | 'processing' | 'complete';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<Status>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setStatus('idle');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            setFile(droppedFile);
            setStatus('idle');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setStatus('uploading');
        setProgress(0);

        // Simulate upload progress
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setStatus('processing');
                    setTimeout(() => {
                        setStatus('complete');
                        setUploading(false);
                    }, 3000);
                    return 100;
                }
                return prev + 10;
            });
        }, 300);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Back Button */}
            <Link href="/assets" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Equipment
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Manual Import</h1>
                <p className="text-muted-foreground mt-1">
                    Upload equipment manuals and let AI extract all data automatically
                </p>
            </div>

            {/* Upload Card */}
            <Card className="border-2">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle>Upload Document</CardTitle>
                            <CardDescription>
                                Equipment manual (PDF) or nameplate photo
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {status === 'idle' || status === 'uploading' ? (
                        <>
                            {/* Drop Zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => fileInputRef.current?.click()}
                                className="relative border-2 border-dashed border-gray-300 rounded-2xl p-12 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                        <FileText className="h-8 w-8 text-blue-600" />
                                    </div>

                                    <div>
                                        <p className="text-lg font-semibold">
                                            {file ? file.name : 'Drop your PDF manual here'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            or click to browse files
                                        </p>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        Formats: PDF, JPG, PNG • Max: 50 MB
                                    </p>
                                </div>
                            </div>

                            {/* Upload Progress */}
                            {status === 'uploading' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Uploading...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} />
                                </div>
                            )}

                            {/* Upload Button */}
                            {file && status === 'idle' && (
                                <Button
                                    onClick={handleUpload}
                                    className="w-full btn-gradient rounded-xl h-12 text-base"
                                >
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Start AI Extraction
                                </Button>
                            )}
                        </>
                    ) : status === 'processing' ? (
                        <div className="text-center py-12 space-y-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto animate-pulse">
                                <Sparkles className="h-10 w-10 text-white" />
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold">AI Processing...</h3>
                                <p className="text-muted-foreground mt-1">
                                    Extracting diagnostics, components, and specifications
                                </p>
                            </div>

                            <div className="max-w-xs mx-auto">
                                <Progress value={66} className="h-2" />
                            </div>
                        </div>
                    ) : status === 'complete' ? (
                        <div className="text-center py-12 space-y-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto">
                                <CheckCircle className="h-10 w-10 text-white" />
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold">Import Complete!</h3>
                                <p className="text-muted-foreground mt-1">
                                    Equipment successfully imported with 100% data completeness
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Button
                                    variant="outline"
                                    className="rounded-xl border-2"
                                    onClick={() => {
                                        setFile(null);
                                        setStatus('idle');
                                        setProgress(0);
                                    }}
                                >
                                    Import Another
                                </Button>

                                <Link href="/assets">
                                    <Button className="btn-gradient rounded-xl">
                                        View Equipment
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        icon: Sparkles,
                        title: 'AI-Powered',
                        description: 'Multi-pass extraction for 100% completeness',
                        color: 'from-purple-500 to-pink-600'
                    },
                    {
                        icon: FileText,
                        title: 'Structured Data',
                        description: 'Diagnostics, components, specs organized',
                        color: 'from-blue-500 to-cyan-600'
                    },
                    {
                        icon: CheckCircle,
                        title: 'Ready to Use',
                        description: 'Immediately available in AI Assistant',
                        color: 'from-green-500 to-emerald-600'
                    }
                ].map((item) => (
                    <Card key={item.title} className="border-2 hover:shadow-md transition-shadow">
                        <CardContent className="p-4 text-center">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3`}>
                                <item.icon className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
