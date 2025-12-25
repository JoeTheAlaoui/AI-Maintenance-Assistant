'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    Trash2,
    Plus,
    Calendar,
    Database,
    RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AddDocumentDialog from './AddDocumentDialog';

interface Document {
    id: string;
    file_name: string;
    document_type: string; // Legacy single type
    document_types?: string[]; // 🆕 New multi-type array
    file_size: number;
    total_chunks: number;
    created_at: string;
    processing_status: string;
}

interface DocumentsTabProps {
    assetId: string;
    organizationId: string;
}

export default function DocumentsTab({ assetId, organizationId }: DocumentsTabProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);

    // Fetch documents on mount
    useEffect(() => {
        fetchDocuments();
    }, [assetId]);

    async function fetchDocuments() {
        try {
            setLoading(true);
            const response = await fetch(`/api/assets/${assetId}/documents`);
            const data = await response.json();

            // Diagnostic logging
            console.log('📊 Documents API Response:', data);
            console.log('📊 Number of documents:', data.documents?.length);
            console.log('📊 Asset ID:', assetId);

            setDocuments(data.documents || []);
        } catch (error) {
            toast.error('Failed to load documents');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(documentId: string, fileName: string) {
        // Confirm deletion
        if (!confirm(`Delete "${fileName}"? This will remove all indexed content.`)) {
            return;
        }

        try {
            setDeleting(documentId);
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Delete failed');

            toast.success('Document deleted successfully');

            // Remove from local state
            setDocuments(docs => docs.filter(d => d.id !== documentId));
        } catch (error) {
            toast.error('Failed to delete document');
            console.error(error);
        } finally {
            setDeleting(null);
        }
    }

    function getDocumentTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            manual: 'General Manual',
            installation: 'Installation Guide',
            maintenance: 'Maintenance Manual',
            troubleshooting: 'Troubleshooting',
            parts: 'Parts Catalog',
            electrical: 'Electrical Schematics',
            mechanical: 'Mechanical Drawings',
            safety: 'Safety Procedures',
            other: 'Other',
        };
        return labels[type] || type;
    }

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

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Documents ({documents.length})</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage equipment manuals and documentation
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchDocuments}
                        disabled={loading}
                        size="sm"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>

                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document
                    </Button>
                </div>
            </div>

            {/* Documents List */}
            {documents.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Document
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {documents.map((doc) => (
                        <Card key={doc.id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    {/* Left: Document Info */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="p-3 rounded-lg bg-muted">
                                            <FileText className="h-6 w-6" />
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            {/* File Name */}
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium">{doc.file_name}</h4>
                                                {doc.processing_status === 'processing' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Processing...
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Document Type Badges */}
                                            <div className="flex flex-wrap gap-1">
                                                {(doc.document_types || [doc.document_type]).map((type) => (
                                                    <Badge
                                                        key={type}
                                                        className={`${getDocumentTypeColor(type)} text-white text-xs`}
                                                    >
                                                        {getDocumentTypeLabel(type)}
                                                    </Badge>
                                                ))}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Database className="h-3 w-3" />
                                                    {doc.total_chunks} chunks
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    {formatFileSize(doc.file_size)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(doc.id, doc.file_name)}
                                            disabled={deleting === doc.id}
                                        >
                                            {deleting === doc.id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                                            ) : (
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Document Dialog */}
            <AddDocumentDialog
                open={showAddDialog}
                onOpenChange={(open: boolean) => {
                    setShowAddDialog(open);
                    // Refresh list when dialog closes (regardless of reason)
                    if (!open) {
                        console.log('🔄 Dialog closed - refreshing documents list');
                        fetchDocuments();
                    }
                }}
                assetId={assetId}
                organizationId={organizationId}
                onSuccess={() => {
                    console.log('✅ Upload success - refreshing documents list');
                    fetchDocuments();
                }}
            />
        </div>
    );
}
