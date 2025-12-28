import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/assets/[id]/documents
 * Returns all documents for a given equipment
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: assetId } = await params;

    // Diagnostic logging
    console.log('📊 Fetching documents for asset:', assetId);

    try {
        // Get all documents for this equipment
        const { data: documents, error } = await supabase
            .from('asset_documents')
            .select(`
                id,
                asset_id,
                file_name,
                file_size,
                document_type,
                document_types,
                document_type_confidence,
                classification_confidence,
                ai_classified,
                user_confirmed,
                processing_status,
                total_chunks,
                created_at,
                processed_at,
                version,
                is_latest,
                supersedes,
                superseded_by,
                version_notes,
                archived_at
            `)
            .eq('asset_id', assetId)
            .order('created_at', { ascending: false });

        // Diagnostic logging
        console.log('📊 Documents found:', documents?.length);
        console.log('📊 Documents:', documents);

        if (error) {
            console.error('Error fetching documents:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ documents });

    } catch (error) {
        console.error('Documents fetch error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
