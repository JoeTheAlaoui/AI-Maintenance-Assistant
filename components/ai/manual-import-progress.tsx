// components/ai/manual-import-progress.tsx
// Real-time progress display for AI manual import

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Upload,
    FileText,
    Scissors,
    Sparkles,
    Database,
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
    X
} from 'lucide-react';

interface ImportProgress {
    stage: string;
    progress: number;
    message: string;
    currentStep?: string;
    currentChunk?: number;
    totalChunks?: number;
    estimatedTimeRemaining?: number;
}

interface ManualImportProgressProps {
    file: File;
    assetId: string;
    onComplete: (data?: { totalChunks: number }) => void;
    onError: (error: string) => void;
    onCancel: () => void;
}

export default function ManualImportProgress({
    file,
    assetId,
    onComplete,
    onError,
    onCancel
}: ManualImportProgressProps) {
    const [progress, setProgress] = useState<ImportProgress>({
        stage: 'uploading',
        progress: 0,
        message: 'Preparing upload...',
    });
    const [isImporting, setIsImporting] = useState(true);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // Start import on mount
    useEffect(() => {
        const controller = new AbortController();
        setAbortController(controller);
        startImport(controller.signal);

        return () => {
            controller.abort();
        };
    }, []);

    async function startImport(signal: AbortSignal) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('assetId', assetId);

            const response = await fetch('/api/ai-import', {
                method: 'POST',
                body: formData,
                signal,
            });

            if (!response.ok) {
                throw new Error('Import request failed');
            }

            // Read SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            setProgress(data);

                            if (data.stage === 'complete') {
                                setIsImporting(false);
                                setTimeout(() => onComplete({ totalChunks: data.totalChunks || 0 }), 1000);
                            } else if (data.stage === 'error') {
                                setIsImporting(false);
                                onError(data.message);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return; // Cancelled by user
            }
            setIsImporting(false);
            onError(error.message);
        }
    }

    // Handle cancel
    const handleCancel = () => {
        if (abortController) {
            abortController.abort();
        }
        setIsImporting(false);
        onCancel();
    };

    // Stage icons
    const getStageIcon = (stage: string) => {
        const iconClass = "h-5 w-5";
        switch (stage) {
            case 'uploading': return <Upload className={iconClass} />;
            case 'loading': return <FileText className={iconClass} />;
            case 'chunking': return <Scissors className={iconClass} />;
            case 'embedding': return <Sparkles className={`${iconClass} text-purple-500`} />;
            case 'storing': return <Database className={iconClass} />;
            case 'complete': return <CheckCircle2 className={`${iconClass} text-green-500`} />;
            case 'error': return <AlertCircle className={`${iconClass} text-red-500`} />;
            default: return <Loader2 className={`${iconClass} animate-spin`} />;
        }
    };

    // Stage colors for badge
    const getStageVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (stage) {
            case 'complete': return 'default';
            case 'error': return 'destructive';
            default: return 'secondary';
        }
    };

    // Stage labels in French
    const getStageLabel = (stage: string): string => {
        switch (stage) {
            case 'uploading': return 'Téléchargement';
            case 'loading': return 'Chargement';
            case 'chunking': return 'Découpage';
            case 'embedding': return 'Vectorisation';
            case 'storing': return 'Stockage';
            case 'complete': return 'Terminé';
            case 'error': return 'Erreur';
            default: return stage;
        }
    };

    // Format time
    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    // Progress bar color
    const getProgressColor = (stage: string): string => {
        switch (stage) {
            case 'complete': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            case 'embedding': return 'bg-purple-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-2 shadow-lg">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                        {getStageIcon(progress.stage)}
                        <span>Importation du manuel</span>
                    </CardTitle>

                    <Badge
                        variant={getStageVariant(progress.stage)}
                        className={progress.stage === 'complete' ? 'bg-green-500 text-white' : ''}
                    >
                        {getStageLabel(progress.stage)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Main Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{progress.message}</span>
                        <span className="text-gray-500 font-mono">{progress.progress}%</span>
                    </div>

                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ease-out ${getProgressColor(progress.stage)}`}
                            style={{ width: `${progress.progress}%` }}
                        />
                    </div>
                </div>

                {/* Current Step */}
                {progress.currentStep && progress.stage !== 'complete' && progress.stage !== 'error' && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Loader2 className="h-4 w-4 animate-spin mt-0.5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Étape en cours:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{progress.currentStep}</p>
                        </div>
                    </div>
                )}

                {/* Chunk Progress & ETA */}
                {progress.totalChunks && progress.totalChunks > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                <Scissors className="h-3 w-3" />
                                Chunks traités
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {progress.currentChunk || 0}
                                <span className="text-lg text-gray-400"> / {progress.totalChunks}</span>
                            </p>
                        </div>

                        {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && progress.stage === 'embedding' && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Temps restant estimé
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatTime(progress.estimatedTimeRemaining)}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* File Info */}
                <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • PDF
                        </p>
                    </div>
                </div>

                {/* Success Message */}
                {progress.stage === 'complete' && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-green-700 dark:text-green-400">Import réussi!</p>
                            <p className="text-sm text-green-600 dark:text-green-500">
                                Le manuel est maintenant indexé pour la recherche IA
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {progress.stage === 'error' && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-400">Échec de l'import</p>
                            <p className="text-sm text-red-600 dark:text-red-500">{progress.message}</p>
                        </div>
                    </div>
                )}

                {/* Cancel Button (only show while importing) */}
                {isImporting && progress.stage !== 'complete' && progress.stage !== 'error' && (
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="w-full border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 hover:text-red-600"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Annuler l'import
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
