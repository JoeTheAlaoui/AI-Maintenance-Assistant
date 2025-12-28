// lib/documents/version-manager.ts
// Document Version Management Library

import { SupabaseClient } from '@supabase/supabase-js';

export interface DocumentVersion {
    id: string;
    version: string;
    created_at: string;
    is_latest: boolean;
    file_name: string;
    file_size: number;
    version_notes?: string;
    archived_at?: string;
    chain_order?: number;
}

export interface VersionChain {
    current: DocumentVersion;
    newer: DocumentVersion[];  // Versions after current
    older: DocumentVersion[];  // Versions before current
    total: number;
}

/**
 * Get full version chain for a document
 */
export async function getVersionChain(
    supabase: SupabaseClient,
    documentId: string
): Promise<VersionChain | null> {
    const { data, error } = await supabase
        .rpc('get_document_version_chain', { doc_id: documentId });

    if (error) {
        console.error('Error fetching version chain:', error);
        return null;
    }

    if (!data || data.length === 0) {
        return null;
    }

    // Find current document in chain by ID
    const currentIndex = data.findIndex((v: any) => v.id === documentId);
    if (currentIndex === -1) return null;

    const current = data[currentIndex];

    // Versions after current (newer) - chain_order > 0
    const newer = data.filter((v: any) =>
        v.chain_order !== undefined && v.chain_order > 0
    );

    // Versions before current (older) - chain_order < 0
    const older = data.filter((v: any) =>
        v.chain_order !== undefined && v.chain_order < 0
    );

    return {
        current,
        newer,
        older,
        total: data.length,
    };
}

/**
 * Get latest version of a document by file name
 */
export async function getLatestVersion(
    supabase: SupabaseClient,
    assetId: string,
    fileName?: string
): Promise<DocumentVersion | null> {
    let query = supabase
        .from('asset_documents')
        .select('*')
        .eq('asset_id', assetId)
        .eq('is_latest', true)
        .is('archived_at', null);

    if (fileName) {
        query = query.eq('file_name', fileName);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
        console.error('Error fetching latest version:', error);
        return null;
    }

    return data;
}

/**
 * Mark a document as superseded by a new version
 */
export async function supersede(
    supabase: SupabaseClient,
    oldDocumentId: string,
    newDocumentId: string
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .rpc('mark_document_superseded', {
            old_doc_id: oldDocumentId,
            new_doc_id: newDocumentId,
        });

    if (error) {
        console.error('Error marking document as superseded:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Archive a document (hide from search)
 */
export async function archiveDocument(
    supabase: SupabaseClient,
    documentId: string
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .rpc('archive_document', { doc_id: documentId });

    if (error) {
        console.error('Error archiving document:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Unarchive a document
 */
export async function unarchiveDocument(
    supabase: SupabaseClient,
    documentId: string
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('asset_documents')
        .update({ archived_at: null })
        .eq('id', documentId);

    if (error) {
        console.error('Error unarchiving document:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Auto-increment version number
 */
export function incrementVersion(currentVersion: string): string {
    // Try to parse as semantic version (1.0, 1.1, 2.0)
    const semverMatch = currentVersion.match(/^(\d+)\.(\d+)$/);
    if (semverMatch) {
        const major = parseInt(semverMatch[1]);
        const minor = parseInt(semverMatch[2]);
        return `${major}.${minor + 1}`;
    }

    // Try to parse as simple number (1, 2, 3)
    const simpleMatch = currentVersion.match(/^(\d+)$/);
    if (simpleMatch) {
        return `${parseInt(simpleMatch[1]) + 1}`;
    }

    // Try date format (2024-01)
    const dateMatch = currentVersion.match(/^(\d{4})-(\d{2})$/);
    if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        if (month < 12) {
            return `${year}-${String(month + 1).padStart(2, '0')}`;
        }
        return `${year + 1}-01`;
    }

    // Default: append .1
    return `${currentVersion}.1`;
}

/**
 * Suggest version number for replacement
 */
export async function suggestNextVersion(
    supabase: SupabaseClient,
    assetId: string,
    fileName: string
): Promise<string> {
    const latest = await getLatestVersion(supabase, assetId, fileName);

    if (!latest || !latest.version) {
        return '1.0';
    }

    return incrementVersion(latest.version);
}

/**
 * Get all documents including version metadata for an asset
 */
export async function getDocumentsWithVersionInfo(
    supabase: SupabaseClient,
    assetId: string,
    includeArchived: boolean = false
): Promise<DocumentVersion[]> {
    let query = supabase
        .from('asset_documents')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

    if (!includeArchived) {
        query = query.is('archived_at', null);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching documents:', error);
        return [];
    }

    return data || [];
}
