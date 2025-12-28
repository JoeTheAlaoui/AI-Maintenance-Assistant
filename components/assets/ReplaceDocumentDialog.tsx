// components/assets/ReplaceDocumentDialog.tsx
// Dialog for uploading a new version of a document

'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReplaceDocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: {
        id: string;
        file_name: string;
        version?: string;  // Optional - may not exist initially
        asset_id: string;
    } | null;
    organizationId: string;
    onSuccess: () => void;
}

export default function ReplaceDocumentDialog({
    open,
    onOpenChange,
    document,
    organizationId,
    onSuccess,
}: ReplaceDocumentDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [version, setVersion] = useState('');
    const [versionNotes, setVersionNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Suggest next version when dialog opens
    useEffect(() => {
        if (open && document) {
            // Auto-suggest next version
            const currentVersion = document.version || '1.0';
            const match = currentVersion.match(/^(\d+)\.(\d+)$/);
            if (match) {
                const major = parseInt(match[1]);
                const minor = parseInt(match[2]);
                setVersion(`${major}.${minor + 1}`);
            } else {
                setVersion(`${currentVersion}.1`);
            }
        }
    }, [open, document]);

    async function handleReplace() {
        if (!file || !document) {
            toast.error('Please select a file');
            return;
        }

        if (!version.trim()) {
            toast.error('Please enter a version number');
            return;
        }

        try {
            setUploading(true);

            // Upload new document with version info
            const formData = new FormData();
            formData.append('file', file);
            formData.append('assetId', document.asset_id);
            formData.append('organizationId', organizationId);
            formData.append('version', version);
            formData.append('versionNotes', versionNotes);
            formData.append('replacingDocumentId', document.id);

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            toast.success(`Document updated to version ${version}`);
            onSuccess();
            onOpenChange(false);
            resetForm();

        } catch (error: any) {
            toast.error(`Failed to replace document: ${error.message}`);
            console.error(error);
        } finally {
            setUploading(false);
        }
    }

    function resetForm() {
        setFile(null);
        setVersion('');
        setVersionNotes('');
    }

    function handleDrag(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile);
            } else {
                toast.error('Only PDF files are supported');
            }
        }
    }

    if (!document) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Replace Document
                    </DialogTitle>
                    <DialogDescription>
                        Upload a new version of "{document.file_name}"
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Current Version Info */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-800">
                                Current version: {document.version || '1.0'}
                            </p>
                            <p className="text-amber-700">
                                This will be marked as outdated
                            </p>
                        </div>
                    </div>

                    {/* File Input */}
                    <div className="space-y-2">
                        <Label htmlFor="file">New PDF File</Label>
                        <div
                            className={`
                                border-2 border-dashed rounded-lg p-6 text-center transition-all
                                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                                ${file ? 'border-green-500 bg-green-50' : ''}
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {file ? (
                                <div className="flex items-center justify-center gap-2">
                                    <FileText className="h-6 w-6 text-green-500" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-green-700">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-green-600">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Drag and drop or click to select
                                    </p>
                                </div>
                            )}
                            <input
                                id="file"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                type="button"
                                onClick={() => {
                                    const input = window.document.getElementById('file') as HTMLInputElement;
                                    input?.click();
                                }}
                                disabled={uploading}
                            >
                                {file ? 'Change File' : 'Select File'}
                            </Button>
                        </div>
                    </div>

                    {/* Version Number */}
                    <div className="space-y-2">
                        <Label htmlFor="version">Version Number</Label>
                        <Input
                            id="version"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            placeholder="e.g., 2.0, 2024-03, Rev B"
                            disabled={uploading}
                        />
                    </div>

                    {/* Version Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">What Changed? (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={versionNotes}
                            onChange={(e) => setVersionNotes(e.target.value)}
                            placeholder="e.g., Updated safety procedures, added troubleshooting section..."
                            rows={3}
                            disabled={uploading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={uploading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReplace}
                        disabled={!file || !version.trim() || uploading}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            'Replace Document'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
