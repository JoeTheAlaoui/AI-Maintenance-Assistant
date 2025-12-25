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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Loader2 } from 'lucide-react';
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
    const [documentType, setDocumentType] = useState<string>('manual');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState('');

    // 🆕 Type confirmation states
    const [showTypeConfirmation, setShowTypeConfirmation] = useState(false);
    const [detectedTypes, setDetectedTypes] = useState<string[]>([]);
    const [documentId, setDocumentId] = useState<string>('');

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
            formData.append('documentType', documentType);

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
                                const docId = data.result?.asset_id || ''; // Document ID

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
        setDocumentType('manual');
        setProgress(0);
        setCurrentStage('');
    }

    async function handleConfirmTypes() {
        try {
            // Save confirmed types to database
            const cookieStore = await fetch('/api/documents/' + documentId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_types: detectedTypes })
            });

            toast.success('Document types confirmed!');

            // Close both dialogs
            setShowTypeConfirmation(false);
            onOpenChange(false);
            onSuccess();
            resetForm();
        } catch (error) {
            console.error('Error saving types:', error);
            toast.error('Failed to save document types');
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Document</DialogTitle>
                        <DialogDescription>
                            Upload a new document for this equipment
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Document Type Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="document-type">Document Type</Label>
                            <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
                                <SelectTrigger id="document-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* File Input */}
                        <div className="space-y-2">
                            <Label htmlFor="file">PDF File</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                {file ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <FileText className="h-8 w-8 text-blue-500" />
                                        <div className="text-left">
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Click to select PDF file
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Max 50MB
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => document.getElementById('file')?.click()}
                                    disabled={uploading}
                                >
                                    {file ? 'Change File' : 'Select File'}
                                </Button>
                            </div>
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

            {/* 🆕 Type Confirmation Dialog */}
            <Dialog open={showTypeConfirmation} onOpenChange={setShowTypeConfirmation}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Document Types</DialogTitle>
                        <DialogDescription>
                            AI detected these content types. You can modify them if needed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-4">
                        {DOCUMENT_TYPES.map((type) => (
                            <div key={type.value} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`type-${type.value}`}
                                    checked={detectedTypes.includes(type.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setDetectedTypes([...detectedTypes, type.value]);
                                        } else {
                                            setDetectedTypes(detectedTypes.filter(t => t !== type.value));
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <label
                                    htmlFor={`type-${type.value}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {type.label}
                                </label>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
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
                            disabled={detectedTypes.length === 0}
                        >
                            Confirm Types
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
