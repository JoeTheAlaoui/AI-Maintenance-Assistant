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
    Edit2,
    History,
    RefreshCcw,
    Archive,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AddDocumentDialog from './AddDocumentDialog';
import ReplaceDocumentDialog from './ReplaceDocumentDialog';
import DocumentVersionHistory from './DocumentVersionHistory';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Document types definition (matching AddDocumentDialog)
const DOCUMENT_TYPES = [
    { value: 'manual', label: 'General Manual' },
    { value: 'installation', label: 'Installation Guide' },
    { value: 'maintenance', label: 'Maintenance Manual' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'parts', label: 'Parts Catalog' },
    { value: 'electrical', label: 'Electrical Schematics' },
    { value: 'mechanical', label: 'Mechanical Drawings' },
    { value: 'safety', label: 'Safety Procedures' },
];

interface Document {
    id: string;
    asset_id: string;  // Required for version dialogs
    file_name: string;
    document_type: string;
    document_types?: string[];
    file_size: number;
    total_chunks: number;
    created_at: string;
    processing_status: string;
    // 🆕 Version tracking fields
    version?: string;
    is_latest?: boolean;
    supersedes?: string;
    superseded_by?: string;
    version_notes?: string;
    archived_at?: string;
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

    // Edit types state
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [savingTypes, setSavingTypes] = useState(false);

    // 🆕 Version dialogs state
    const [replaceDoc, setReplaceDoc] = useState<Document | null>(null);
    const [historyDocId, setHistoryDocId] = useState<string | null>(null);

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

    // 🆕 Handle edit types
    function handleEditTypes(doc: Document) {
        setEditingDoc(doc);
        setSelectedTypes(doc.document_types || [doc.document_type]);
    }

    // 🆕 Save edited types
    async function handleSaveTypes() {
        if (!editingDoc || selectedTypes.length === 0) {
            toast.error('Please select at least one type');
            return;
        }

        try {
            setSavingTypes(true);
            const response = await fetch(`/api/documents/${editingDoc.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_types: selectedTypes })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update types');
            }

            toast.success('Document types updated successfully!');

            // Update local state
            setDocuments(docs => docs.map(d =>
                d.id === editingDoc.id
                    ? { ...d, document_types: selectedTypes }
                    : d
            ));

            // Close dialog
            setEditingDoc(null);
            setSelectedTypes([]);

        } catch (error: any) {
            toast.error(error.message || 'Failed to update types');
            console.error(error);
        } finally {
            setSavingTypes(false);
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
                                            {/* File Name + Version Badges */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-medium">{doc.file_name}</h4>

                                                {/* Version Badge */}
                                                {doc.version && (
                                                    <Badge variant="outline" className="text-xs">
                                                        v{doc.version}
                                                    </Badge>
                                                )}

                                                {/* Latest Badge */}
                                                {doc.is_latest && (
                                                    <Badge className="bg-green-100 text-green-700 text-xs">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Latest
                                                    </Badge>
                                                )}

                                                {/* Outdated Badge */}
                                                {!doc.is_latest && !doc.archived_at && doc.superseded_by && (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        Outdated
                                                    </Badge>
                                                )}

                                                {/* Archived Badge */}
                                                {doc.archived_at && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Archive className="h-3 w-3 mr-1" />
                                                        Archived
                                                    </Badge>
                                                )}

                                                {/* Processing Badge */}
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
                                    <div className="flex items-center gap-1">
                                        {/* Version History Button */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setHistoryDocId(doc.id)}
                                            title="Version history"
                                        >
                                            <History className="h-4 w-4" />
                                        </Button>

                                        {/* Replace Document Button (only for latest) */}
                                        {doc.is_latest && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setReplaceDoc(doc)}
                                                title="Upload new version"
                                            >
                                                <RefreshCcw className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* Edit Types Button */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditTypes(doc)}
                                            title="Edit document types"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>

                                        {/* Delete Button */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(doc.id, doc.file_name)}
                                            disabled={deleting === doc.id}
                                            title="Delete document"
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

            {/* 🆕 Edit Types Dialog - Enhanced */}
            <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Edit Document Types</DialogTitle>
                        <DialogDescription>
                            Select all content types that describe this document. Multiple selections help improve search accuracy.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
                        {DOCUMENT_TYPES.map((type) => {
                            const isSelected = selectedTypes.includes(type.value);
                            return (
                                <div
                                    key={type.value}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedTypes(selectedTypes.filter(t => t !== type.value));
                                        } else {
                                            setSelectedTypes([...selectedTypes, type.value]);
                                        }
                                    }}
                                    className={`
                                        relative p-4 rounded-lg border-2 cursor-pointer transition-all
                                        ${isSelected
                                            ? `${getDocumentTypeColor(type.value)} border-transparent text-white shadow-md`
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
                                                <svg className={`h-3 w-3 ${getDocumentTypeColor(type.value).replace('bg-', 'text-')}`} fill="currentColor" viewBox="0 0 12 12">
                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedTypes.length === 0 && (
                        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                            ⚠️ Please select at least one document type
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <div className="text-sm text-muted-foreground mr-auto">
                            {selectedTypes.length} type{selectedTypes.length !== 1 ? 's' : ''} selected
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingDoc(null);
                                setSelectedTypes([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveTypes}
                            disabled={savingTypes || selectedTypes.length === 0}
                            className="min-w-32"
                        >
                            {savingTypes ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 🆕 Replace Document Dialog */}
            <ReplaceDocumentDialog
                open={!!replaceDoc}
                onOpenChange={(open) => !open && setReplaceDoc(null)}
                document={replaceDoc}
                organizationId={organizationId}
                onSuccess={fetchDocuments}
            />

            {/* 🆕 Version History Dialog */}
            <DocumentVersionHistory
                open={!!historyDocId}
                onOpenChange={(open) => !open && setHistoryDocId(null)}
                documentId={historyDocId}
                onRefresh={fetchDocuments}
            />
        </div>
    );
}
