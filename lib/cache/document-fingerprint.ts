// lib/cache/document-fingerprint.ts
// Detect duplicate document uploads BEFORE processing

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingDocument?: {
        id: string;
        file_name: string;
        asset_id: string;
        asset_name: string;
        uploaded_at: string;
    };
}

/**
 * Generate SHA-256 fingerprint of entire PDF file
 */
export function generateDocumentFingerprint(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if document was already uploaded in this organization
 */
export async function checkDuplicateDocument(
    supabase: SupabaseClient,
    fingerprint: string,
    organizationId: string
): Promise<DuplicateCheckResult> {
    console.log('🔍 Checking for duplicate upload...');

    // Use the RPC function we created
    const { data, error } = await supabase
        .rpc('check_duplicate_document', {
            p_fingerprint: fingerprint,
            p_organization_id: organizationId
        });

    if (error) {
        console.error('Error checking duplicate:', error);
        // Fallback: try direct query
        return await checkDuplicateDirect(supabase, fingerprint, organizationId);
    }

    if (data && data.length > 0 && data[0].is_duplicate) {
        const row = data[0];
        console.log(`⚠️ DUPLICATE DETECTED!`);
        console.log(`   Already uploaded: ${row.existing_file_name}`);
        console.log(`   For equipment: ${row.existing_asset_name}`);
        console.log(`   On: ${new Date(row.uploaded_at).toLocaleDateString()}`);

        return {
            isDuplicate: true,
            existingDocument: {
                id: row.existing_doc_id,
                file_name: row.existing_file_name,
                asset_id: row.existing_asset_id,
                asset_name: row.existing_asset_name,
                uploaded_at: row.uploaded_at,
            },
        };
    }

    console.log('✅ Not a duplicate');
    return { isDuplicate: false };
}

/**
 * Direct query fallback if RPC fails
 */
async function checkDuplicateDirect(
    supabase: SupabaseClient,
    fingerprint: string,
    organizationId: string
): Promise<DuplicateCheckResult> {
    const { data, error } = await supabase
        .from('asset_documents')
        .select(`
      id,
      file_name,
      created_at,
      assets!inner(id, name, organization_id)
    `)
        .eq('file_fingerprint', fingerprint)
        .eq('assets.organization_id', organizationId)
        .limit(1)
        .single();

    if (error || !data) {
        return { isDuplicate: false };
    }

    const asset = data.assets as any;

    return {
        isDuplicate: true,
        existingDocument: {
            id: data.id,
            file_name: data.file_name,
            asset_id: asset.id,
            asset_name: asset.name,
            uploaded_at: data.created_at,
        },
    };
}

/**
 * Store fingerprint with document record
 */
export async function storeDocumentFingerprint(
    supabase: SupabaseClient,
    documentId: string,
    fingerprint: string
): Promise<void> {
    await supabase
        .from('asset_documents')
        .update({ file_fingerprint: fingerprint })
        .eq('id', documentId);

    console.log('🔐 Document fingerprint stored');
}
