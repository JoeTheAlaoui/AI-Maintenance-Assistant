// components/assets/DocumentVersionHistory.tsx
// Dialog showing version history of a document with archive/restore actions

'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Clock,
    FileText,
    CheckCircle2,
    Archive,
    ArchiveRestore,
    Loader2,
    GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
    getVersionChain,
    archiveDocument,
    unarchiveDocument,
    DocumentVersion,
} from '@/lib/documents/version-manager';

interface DocumentVersionHistoryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string | null;
    onRefresh: () => void;
}

export default function DocumentVersionHistory({
    open,
    onOpenChange,
    documentId,
    onRefresh,
}: DocumentVersionHistoryProps) {
    const [loading, setLoading] = useState(true);
    const [chain, setChain] = useState<any>(null);

    useEffect(() => {
        if (open && documentId) {
            fetchVersionChain();
        }
    }, [open, documentId]);

    async function fetchVersionChain() {
        if (!documentId) return;

        setLoading(true);
        const supabase = createClient();
        const data = await getVersionChain(supabase, documentId);
        setChain(data);
        setLoading(false);
    }

    async function handleArchive(docId: string) {
        const supabase = createClient();
        const result = await archiveDocument(supabase, docId);
        if (result.success) {
            toast.success('Version archived');
            fetchVersionChain();
            onRefresh();
        } else {
            toast.error(result.error || 'Failed to archive');
        }
    }

    async function handleUnarchive(docId: string) {
        const supabase = createClient();
        const result = await unarchiveDocument(supabase, docId);
        if (result.success) {
            toast.success('Version restored');
            fetchVersionChain();
            onRefresh();
        } else {
            toast.error(result.error || 'Failed to restore');
        }
    }

    function formatRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks < 4) return `${diffWeeks} weeks ago`;

        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths} months ago`;

        return `${Math.floor(diffMonths / 12)} years ago`;
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    if (!documentId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-purple-500" />
                        Version History
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !chain ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No version history available</p>
                    </div>
                ) : (
                    <>
                        <div className="text-sm text-muted-foreground mb-2">
                            {chain.total} version{chain.total !== 1 ? 's' : ''} in this chain
                        </div>

                        <ScrollArea className="max-h-[400px] pr-4">
                            <div className="space-y-1">
                                {/* All versions in order (newest first) */}
                                {[...chain.newer, chain.current, ...chain.older].map((version: DocumentVersion, index: number) => {
                                    const isLatest = version.is_latest;
                                    const isArchived = !!version.archived_at;
                                    const isCurrent = version.id === documentId;

                                    return (
                                        <div key={version.id}>
                                            <div
                                                className={`
                                                    border rounded-lg p-4 transition-all
                                                    ${isCurrent ? 'border-purple-400 bg-purple-50/50 ring-1 ring-purple-200' : 'border-gray-200'}
                                                    ${isArchived ? 'opacity-60 bg-gray-50' : ''}
                                                `}
                                            >
                                                {/* Header Row */}
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">
                                                            Version {version.version || '1.0'}
                                                        </span>

                                                        {isLatest && (
                                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Latest
                                                            </Badge>
                                                        )}

                                                        {!isLatest && !isArchived && (
                                                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                                                                Outdated
                                                            </Badge>
                                                        )}

                                                        {isArchived && (
                                                            <Badge variant="secondary">
                                                                <Archive className="h-3 w-3 mr-1" />
                                                                Archived
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    {!isLatest && (
                                                        <div className="flex gap-1">
                                                            {isArchived ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleUnarchive(version.id)}
                                                                    title="Restore from archive"
                                                                >
                                                                    <ArchiveRestore className="h-4 w-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleArchive(version.id)}
                                                                    title="Archive this version"
                                                                >
                                                                    <Archive className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Metadata Row */}
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatRelativeTime(version.created_at)}
                                                    </div>
                                                    <span className="text-xs">
                                                        {formatFileSize(version.file_size || 0)}
                                                    </span>
                                                </div>

                                                {/* Version Notes */}
                                                {version.version_notes && (
                                                    <div className="mt-2 p-2 bg-white border rounded text-sm">
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                                            Changes:
                                                        </p>
                                                        <p className="text-gray-700">{version.version_notes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Connection Line */}
                                            {index < [...chain.newer, chain.current, ...chain.older].length - 1 && (
                                                <div className="flex justify-center py-1">
                                                    <div className="w-px h-4 bg-gray-300" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
