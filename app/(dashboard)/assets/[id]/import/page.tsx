// app/(dashboard)/assets/[id]/import/page.tsx
// Import manual for existing asset with real-time progress

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Upload, FileText, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ManualImportProgress from '@/components/ai/manual-import-progress';

interface Asset {
    id: string;
    name: string;
    manufacturer: string | null;
    model_number: string | null;
}

export default function ImportManualPage() {
    const router = useRouter();
    const params = useParams();
    const assetId = params.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [asset, setAsset] = useState<Asset | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load asset info
    useEffect(() => {
        async function loadAsset() {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('assets')
                .select('id, name, manufacturer, model_number')
                .eq('id', assetId)
                .single();

            if (error || !data) {
                toast.error('Équipement non trouvé');
                router.push('/assets');
                return;
            }

            setAsset(data);
            setLoading(false);
        }

        loadAsset();
    }, [assetId, router]);

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf') {
            toast.error('Seuls les fichiers PDF sont acceptés');
            return;
        }
        if (selectedFile.size > 50 * 1024 * 1024) {
            toast.error('Fichier trop volumineux (max 50 MB)');
            return;
        }
        setFile(selectedFile);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) handleFileSelect(droppedFile);
    }, [handleFileSelect]);

    const handleStartImport = () => {
        if (!file) return;
        setIsImporting(true);
    };

    const handleComplete = (data?: { totalChunks: number }) => {
        toast.success(`Manuel importé avec succès! ${data?.totalChunks || 0} sections indexées.`);
        router.push(`/assets/${assetId}?tab=documents`);
    };

    const handleError = (error: string) => {
        toast.error(`Erreur: ${error}`);
        setIsImporting(false);
        setFile(null);
    };

    const handleCancel = () => {
        toast.info('Import annulé');
        setIsImporting(false);
        setFile(null);
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 bg-gray-200 rounded" />
                    <div className="h-64 bg-gray-100 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-6">
            {/* Header */}
            <div>
                <Link
                    href={`/assets/${assetId}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à {asset?.name}
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Importer un manuel technique
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Ajoutez un manuel PDF pour {asset?.name}
                </p>
            </div>

            {/* Import Progress (when importing) */}
            {isImporting && file && (
                <ManualImportProgress
                    file={file}
                    assetId={assetId}
                    onComplete={handleComplete}
                    onError={handleError}
                    onCancel={handleCancel}
                />
            )}

            {/* File Upload (when not importing) */}
            {!isImporting && (
                <>
                    <Card className={cn(
                        "border-2 border-dashed transition-colors",
                        isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700",
                        file ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" : ""
                    )}>
                        <CardContent className="p-8">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className="flex flex-col items-center gap-4"
                            >
                                {!file ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                                Glissez-déposez votre fichier PDF
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                ou cliquez pour sélectionner
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Parcourir les fichiers
                                        </Button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const selectedFile = e.target.files?.[0];
                                                if (selectedFile) handleFileSelect(selectedFile);
                                            }}
                                        />
                                        <p className="text-xs text-gray-400">
                                            Formats acceptés: PDF • Taille max: 50 MB
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setFile(null)}
                                            >
                                                <X className="w-4 h-4 mr-1" />
                                                Supprimer
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Start Button */}
                    {file && (
                        <Button
                            onClick={handleStartImport}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                            size="lg"
                        >
                            <Upload className="w-5 h-5 mr-2" />
                            Lancer l'import IA
                        </Button>
                    )}

                    {/* Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                            Que va-t-il se passer ?
                        </h3>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>📄 Le PDF sera analysé et le texte extrait</li>
                            <li>✂️ Le contenu sera découpé en sections</li>
                            <li>🧠 Chaque section sera vectorisée pour la recherche IA</li>
                            <li>💬 Vous pourrez poser des questions via le chat</li>
                        </ul>
                    </div>

                    {/* Time warning */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⏱️</span>
                            <div>
                                <h3 className="font-medium text-amber-900 dark:text-amber-200">
                                    Durée de l'import
                                </h3>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    L'import peut prendre <strong>plusieurs minutes</strong> selon la taille du document.
                                    Un manuel de 100 pages prend environ 2-5 minutes.
                                    Vous pouvez suivre la progression en temps réel.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
