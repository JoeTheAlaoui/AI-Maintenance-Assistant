'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AddDocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId: string;
    organizationId: string;
    onSuccess: () => void;
}

const DOCUMENT_TYPES = [
    { value: 'manual', label: 'General Manual' },
    { value: 'installation', label: 'Installation Guide' },
    { value: 'maintenance', label: 'Maintenance Manual' },
    { value: 'troubleshooting', label: 'Troubleshooting Guide' },
    { value: 'parts', label: 'Parts Catalog' },
    { value: 'electrical', label: 'Electrical Schematics' },
    { value: 'mechanical', label: 'Mechanical Drawings' },
    { value: 'safety', label: 'Safety Procedures' },
    { value: 'other', label: 'Other' },
];

export default function AddDocumentDialog({
    open,
    onOpenChange,
    assetId,
    organizationId,
    onSuccess,
}: AddDocumentDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState('');

    // 🆕 Type confirmation states
    const [showTypeConfirmation, setShowTypeConfirmation] = useState(false);
    const [detectedTypes, setDetectedTypes] = useState<string[]>([]);
    const [documentId, setDocumentId] = useState<string>('');
    const [confirmingTypes, setConfirmingTypes] = useState(false); // 🆕 Loading state for confirm button

    async function handleUpload() {
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        try {
            setUploading(true);
            setProgress(0);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('assetId', assetId);
            formData.append('organizationId', organizationId);
            formData.append('documentType', 'manual'); // Default type - AI will detect actual types

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            // Read SSE progress
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = JSON.parse(line.slice(6));
                            setProgress(data.progress || 0);
                            setCurrentStage(data.message || '');

                            if (data.stage === 'complete') {
                                console.log('✅ Upload completed successfully');

                                // 🆕 Extract AI-detected types from response
                                const aiTypes = data.result?.document_types || ['manual'];
                                const docId = data.result?.document_id || ''; // 🔧 Fixed: document_id, not asset_id

                                console.log('🏷️ AI detected types:', aiTypes);

                                // Show confirmation dialog
                                setDetectedTypes(aiTypes);
                                setDocumentId(docId);
                                setShowTypeConfirmation(true);

                                // Don't close upload dialog yet - wait for user confirmation
                                setUploading(false);
                            } else if (data.stage === 'error') {
                                console.error('❌ Upload error:', data.message);
                                throw new Error(data.message);
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`);
            console.error(error);
        } finally {
            setUploading(false);
            setProgress(0);
            setCurrentStage('');
        }
    }

    function resetForm() {
        setFile(null);
        setProgress(0);
        setCurrentStage('');
    }

    async function handleConfirmTypes() {
        try {
            setConfirmingTypes(true);

            // Save confirmed types to database
            const response = await fetch('/api/documents/' + documentId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_types: detectedTypes })
            });

            if (!response.ok) throw new Error('Failed to save types');

            toast.success('Document types confirmed!');

            // Close both dialogs
            setShowTypeConfirmation(false);
            onOpenChange(false);
            onSuccess();
            resetForm();
        } catch (error) {
            console.error('Error saving types:', error);
            toast.error('Failed to save document types');
        } finally {
            setConfirmingTypes(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                toast.error('Please select a PDF file');
                return;
            }
            if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
                toast.error('File size must be less than 50MB');
                return;
            }
            setFile(selectedFile);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                                <Upload className="h-5 w-5 text-blue-600" />
                            </div>
                            Add Document
                        </DialogTitle>
                        <DialogDescription>
                            Upload a PDF and AI will automatically classify the document type for you.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* AI Detection Info Banner */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
                            <div className="text-2xl">🤖</div>
                            <div>
                                <p className="font-medium text-purple-900">AI-Powered Classification</p>
                                <p className="text-sm text-purple-700">
                                    Document types will be automatically detected after upload. You can review and adjust them.
                                </p>
                            </div>
                        </div>

                        {/* File Input - Enhanced */}
                        <div className="space-y-2">
                            <Label htmlFor="file">PDF File</Label>
                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                    ${file
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                                    }
                                `}
                                onClick={() => !uploading && document.getElementById('file')?.click()}
                            >
                                {file ? (
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <FileText className="h-8 w-8 text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                                            <Upload className="h-8 w-8 text-blue-500" />
                                        </div>
                                        <p className="font-medium text-gray-700 mb-1">
                                            Drop your PDF here or click to browse
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Maximum file size: 50MB
                                        </p>
                                    </div>
                                )}
                                <input
                                    id="file"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </div>
                            {file && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-red-500"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                    }}
                                    disabled={uploading}
                                >
                                    Remove file
                                </Button>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{currentStage}</span>
                                    <span className="font-medium">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                                resetForm();
                            }}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 🆕 Type Confirmation Dialog - Enhanced */}
            <Dialog open={showTypeConfirmation} onOpenChange={setShowTypeConfirmation}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Confirm Document Types</DialogTitle>
                        <DialogDescription>
                            AI detected these content types. Review and adjust the selections to improve search accuracy.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
                        {DOCUMENT_TYPES.map((type) => {
                            const isSelected = detectedTypes.includes(type.value);
                            const typeColor = getDocumentTypeColor(type.value);

                            return (
                                <div
                                    key={type.value}
                                    onClick={() => {
                                        if (isSelected) {
                                            setDetectedTypes(detectedTypes.filter(t => t !== type.value));
                                        } else {
                                            setDetectedTypes([...detectedTypes, type.value]);
                                        }
                                    }}
                                    className={`
                                        relative p-4 rounded-lg border-2 cursor-pointer transition-all
                                        ${isSelected
                                            ? `${typeColor} border-transparent text-white shadow-md`
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className={`
                                                p-1.5 rounded-md
                                                ${isSelected ? 'bg-white/20' : 'bg-gray-100'}
                                            `}>
                                                <FileText className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                                            </div>
                                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                {type.label}
                                            </span>
                                        </div>

                                        <div className={`
                                            h-5 w-5 rounded border-2 flex items-center justify-center
                                            ${isSelected
                                                ? 'bg-white border-white'
                                                : 'border-gray-300 bg-white'
                                            }
                                        `}>
                                            {isSelected && (
                                                <svg className={`h-3 w-3 ${typeColor.replace('bg-', 'text-')}`} fill="currentColor" viewBox="0 0 12 12">
                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {detectedTypes.length === 0 && (
                        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                            ⚠️ Please select at least one document type
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
                        <div className="text-blue-600 mt-0.5">💡</div>
                        <div className="text-sm text-blue-700">
                            <strong>AI Classification:</strong> Types are automatically detected based on document content. You can add or remove types as needed.
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <div className="text-sm text-muted-foreground mr-auto">
                            {detectedTypes.length} type{detectedTypes.length !== 1 ? 's' : ''} selected
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowTypeConfirmation(false);
                                onOpenChange(false);
                                onSuccess();
                                resetForm();
                            }}
                        >
                            Skip
                        </Button>
                        <Button
                            onClick={handleConfirmTypes}
                            disabled={confirmingTypes || detectedTypes.length === 0}
                            className="min-w-32"
                        >
                            {confirmingTypes ? 'Saving...' : 'Confirm Types'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Helper function for document type colors
function getDocumentTypeColor(type: string): string {
    const colors: Record<string, string> = {
        manual: 'bg-blue-500',
        installation: 'bg-green-500',
        maintenance: 'bg-orange-500',
        troubleshooting: 'bg-red-500',
        parts: 'bg-purple-500',
        electrical: 'bg-yellow-500',
        mechanical: 'bg-cyan-500',
        safety: 'bg-pink-500',
        other: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
}
