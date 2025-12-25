// components/import/pdf-uploader.tsx

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadResult {
    success: boolean;
    asset_id?: string;
    asset?: {
        name: string;
        manufacturer: string;
        model: string;
        category: string;
    };
    extraction?: {
        method: 'native' | 'ocr';
        pages: number;
        confidence?: number;
    };
    chunks_created?: number;
    processing_time_ms?: number;
    message?: string;
    error?: string;
}

export function PDFUploader() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<UploadResult | null>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile?.type === 'application/pdf') {
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setStatus('uploading');
        setProgress(10);

        try {
            const formData = new FormData();
            formData.append('file', file);

            setProgress(30);
            setStatus('processing');

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            setProgress(90);

            const data: UploadResult = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setProgress(100);
            setStatus('success');
            setResult(data);

        } catch (error) {
            setStatus('error');
            setResult({
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            });
        }
    };

    const handleReset = () => {
        setFile(null);
        setStatus('idle');
        setProgress(0);
        setResult(null);
    };

    const navigateToAsset = () => {
        if (result?.asset_id) {
            router.push(`/assets/${result.asset_id}`);
        }
    };

    return (
        <Card className="w-full max-w-xl mx-auto">
            <CardContent className="p-6">
                {status === 'idle' && (
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                            isDragging
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300",
                            file && "border-green-500 bg-green-50"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <Button variant="outline" size="sm" onClick={handleReset}>
                                        Changer
                                    </Button>
                                    <Button size="sm" onClick={handleUpload}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Importer
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        Glissez votre manuel PDF ici
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        ou cliquez pour sélectionner
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Supporte les PDFs natifs et scannés (OCR)
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="pdf-upload"
                                />
                                <label htmlFor="pdf-upload">
                                    <Button variant="outline" size="sm" asChild>
                                        <span>Parcourir</span>
                                    </Button>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {(status === 'uploading' || status === 'processing') && (
                    <div className="space-y-6 text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">
                                {status === 'uploading' ? 'Téléchargement...' : 'Analyse en cours...'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {status === 'processing'
                                    ? 'Extraction du texte (OCR si nécessaire) et création des embeddings'
                                    : 'Envoi du fichier au serveur'}
                            </p>
                        </div>
                        <Progress value={progress} className="w-full" />
                    </div>
                )}

                {status === 'success' && result && (
                    <div className="space-y-6 text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 text-lg">
                                Import réussi!
                            </p>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left space-y-1">
                                <p className="text-sm"><strong>Asset:</strong> {result.asset?.name}</p>
                                <p className="text-sm"><strong>Fabricant:</strong> {result.asset?.manufacturer || '-'}</p>
                                <p className="text-sm"><strong>Modèle:</strong> {result.asset?.model || '-'}</p>
                                <p className="text-sm"><strong>Pages:</strong> {result.extraction?.pages || '-'}</p>
                                <p className="text-sm"><strong>Chunks:</strong> {result.chunks_created}</p>
                                <p className="text-sm"><strong>Temps:</strong> {((result.processing_time_ms || 0) / 1000).toFixed(1)}s</p>

                                {/* OCR Badge */}
                                {result.extraction?.method === 'ocr' && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                        <Eye className="w-3.5 h-3.5" />
                                        OCR ({result.extraction.confidence?.toFixed(0)}% confidence)
                                    </div>
                                )}

                                {/* Native Badge */}
                                {result.extraction?.method === 'native' && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        <FileText className="w-3.5 h-3.5" />
                                        Texte natif
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={handleReset}>
                                Importer un autre
                            </Button>
                            <Button onClick={navigateToAsset}>
                                Voir l'asset →
                            </Button>
                        </div>
                    </div>
                )}

                {status === 'error' && result && (
                    <div className="space-y-6 text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Erreur</p>
                            <p className="text-sm text-red-600 mt-1">{result.error}</p>
                        </div>
                        <Button variant="outline" onClick={handleReset}>
                            Réessayer
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
