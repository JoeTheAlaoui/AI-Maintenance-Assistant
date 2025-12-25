'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Upload,
    FileText,
    CheckCircle,
    Loader2,
    Sparkles,
    FileSearch,
    Brain,
    Package,
    ArrowRight,
    AlertCircle,
    X,
    Clock,
    Database,
    Scissors
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// SSE Progress Interface
interface ImportProgress {
    stage: string
    progress: number
    message: string
    currentStep?: string
    currentPage?: number
    totalPages?: number
    currentChunk?: number
    totalChunks?: number
    estimatedTimeRemaining?: number
    result?: {
        asset_id: string
        asset: {
            name: string
            manufacturer: string
            model: string
            category: string
        }
        extraction: {
            method: string
            pages: number
            confidence?: number
        }
        chunks_created: number
        processing_time_ms: number
    }
}

export default function ImportPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [abortController, setAbortController] = useState<AbortController | null>(null)

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf') {
            setError('Seuls les fichiers PDF sont acceptés')
            return
        }
        if (selectedFile.size > 50 * 1024 * 1024) {
            setError('Fichier trop volumineux (max 50 MB)')
            return
        }
        setFile(selectedFile)
        setError(null)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) handleFileSelect(droppedFile)
    }, [handleFileSelect])

    const handleUpload = async () => {
        if (!file) return

        setIsImporting(true)
        setError(null)
        setImportProgress({
            stage: 'uploading',
            progress: 0,
            message: 'Démarrage...',
        })

        try {
            const controller = new AbortController()
            setAbortController(controller)

            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            })

            if (!response.ok && !response.body) {
                throw new Error('Import request failed')
            }

            // Read SSE stream
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error('No response body')
            }

            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6)) as ImportProgress
                            setImportProgress(data)

                            if (data.stage === 'complete') {
                                // Success!
                                setTimeout(() => {
                                    if (data.result?.asset_id) {
                                        router.push(`/assets/${data.result.asset_id}`)
                                    }
                                }, 2000)
                            } else if (data.stage === 'error') {
                                setError(data.message)
                                setIsImporting(false)
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Import cancelled by user')
                handleReset()
                return
            }
            console.error('Upload error:', err)
            setError(err.message || 'Erreur lors de l\'import')
            setIsImporting(false)
        } finally {
            setAbortController(null)
        }
    }

    const handleCancel = () => {
        if (abortController) {
            abortController.abort()
        }
    }

    const handleReset = () => {
        setFile(null)
        setIsImporting(false)
        setImportProgress(null)
        setError(null)
    }

    // Get stage icon
    const getStageIcon = (stage: string) => {
        const iconClass = "h-5 w-5"
        switch (stage) {
            case 'uploading': return <Upload className={iconClass} />
            case 'loading': return <FileText className={iconClass} />
            case 'ocr': return <FileSearch className={`${iconClass} animate-pulse`} />
            case 'metadata': return <Brain className={iconClass} />
            case 'chunking': return <Scissors className={iconClass} />
            case 'embedding': return <Sparkles className={`${iconClass} text-purple-500`} />
            case 'storing': return <Database className={iconClass} />
            case 'complete': return <CheckCircle className={`${iconClass} text-green-500`} />
            case 'error': return <AlertCircle className={`${iconClass} text-red-500`} />
            default: return <Loader2 className={`${iconClass} animate-spin`} />
        }
    }

    // Get stage label
    const getStageLabel = (stage: string): string => {
        switch (stage) {
            case 'uploading': return 'Téléchargement'
            case 'loading': return 'Chargement'
            case 'ocr': return 'OCR (scan)'
            case 'metadata': return 'Métadonnées'
            case 'chunking': return 'Découpage'
            case 'embedding': return 'Vectorisation'
            case 'storing': return 'Sauvegarde'
            case 'complete': return 'Terminé'
            case 'error': return 'Erreur'
            default: return stage
        }
    }

    // Format time
    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}m ${remainingSeconds}s`
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link
                    href="/assets"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour aux équipements
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importer un manuel</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Uploadez un PDF pour créer un équipement et activer l'assistant IA
                </p>
            </div>

            {/* Main Card */}
            <Card className="border-2">
                <CardContent className="p-8">
                    {/* Idle State - File Selection */}
                    {!isImporting && !importProgress?.result && (
                        <>
                            {/* Dropzone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer",
                                    isDragging
                                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                                        : file
                                            ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                                            : "border-gray-300 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    className="hidden"
                                />

                                <div className="text-center space-y-4">
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-all",
                                        file
                                            ? "bg-green-500"
                                            : isDragging
                                                ? "bg-blue-500 scale-110"
                                                : "bg-gradient-to-br from-blue-500 to-purple-600"
                                    )}>
                                        {file ? (
                                            <CheckCircle className="h-8 w-8 text-white" />
                                        ) : (
                                            <Upload className="h-8 w-8 text-white" />
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {file ? file.name : 'Glissez votre PDF ici'}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {file
                                                ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                                                : 'ou cliquez pour parcourir'
                                            }
                                        </p>
                                    </div>

                                    {!file && (
                                        <p className="text-xs text-gray-400">
                                            PDF uniquement • Max 50 MB
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Upload Button */}
                            {file && (
                                <div className="mt-6 flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleReset}
                                        className="flex-1"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Importer
                                    </Button>
                                </div>
                            )}

                            {/* Time warning */}
                            {file && (
                                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        L'import peut prendre <strong>1-3 minutes</strong> selon la taille du document.
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Progress State */}
                    {isImporting && importProgress && importProgress.stage !== 'complete' && importProgress.stage !== 'error' && (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mx-auto flex items-center justify-center mb-4">
                                    {getStageIcon(importProgress.stage)}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {importProgress.message}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{file?.name}</p>
                            </div>

                            {/* Current Stage Badge */}
                            <div className="flex justify-center">
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {getStageIcon(importProgress.stage)}
                                    <span className="ml-2">{getStageLabel(importProgress.stage)}</span>
                                </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {importProgress.currentStep || importProgress.message}
                                    </span>
                                    <span className="text-gray-500 font-mono">{importProgress.progress}%</span>
                                </div>
                                <Progress value={importProgress.progress} className="h-3" />
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {importProgress.totalPages && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pages</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {importProgress.currentPage || 0}
                                            <span className="text-lg text-gray-400"> / {importProgress.totalPages}</span>
                                        </p>
                                    </div>
                                )}

                                {importProgress.totalChunks && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sections</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {importProgress.currentChunk || 0}
                                            <span className="text-lg text-gray-400"> / {importProgress.totalChunks}</span>
                                        </p>
                                    </div>
                                )}

                                {importProgress.estimatedTimeRemaining && importProgress.estimatedTimeRemaining > 0 && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Temps restant estimé
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {formatTime(importProgress.estimatedTimeRemaining)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Cancel Button */}
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Annuler l'import
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {importProgress?.stage === 'complete' && importProgress.result && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-green-500 mx-auto flex items-center justify-center mb-4">
                                    <CheckCircle className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import réussi !</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Terminé en {(importProgress.result.processing_time_ms / 1000).toFixed(0)}s
                                </p>
                            </div>

                            {/* Result Card */}
                            <Card className="bg-gray-50 dark:bg-gray-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                            <Package className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                {importProgress.result.asset.name}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {importProgress.result.asset.manufacturer} • {importProgress.result.asset.model}
                                            </p>
                                        </div>
                                        <Badge>{importProgress.result.asset.category || 'Équipement'}</Badge>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {importProgress.result.extraction.pages}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Pages</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {importProgress.result.chunks_created}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Sections</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white uppercase">
                                                {importProgress.result.extraction.method}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Méthode</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    className="flex-1"
                                >
                                    Importer un autre
                                </Button>
                                <Button
                                    onClick={() => router.push(`/assets/${importProgress.result?.asset_id}`)}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
                                >
                                    Voir l'équipement
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {importProgress?.stage === 'error' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500 mx-auto flex items-center justify-center mb-4">
                                    <AlertCircle className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Échec de l'import</h3>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    {importProgress.message}
                                </p>
                            </div>

                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="w-full"
                            >
                                Réessayer
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Feature Cards */}
            {!isImporting && !importProgress?.result && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                        <FileSearch className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">PDF & Scannés</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">OCR automatique</p>
                    </div>
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                        <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">Embeddings IA</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recherche sémantique</p>
                    </div>
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">Chat intelligent</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Q&A sur le manuel</p>
                    </div>
                </div>
            )}
        </div>
    )
}
