import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/documents/[id]
 * Deletes a specific document and its chunks (cascade)
 */
export async function DELETE(
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

    const { id: documentId } = await params;

    try {
        // Delete document (chunks will cascade delete automatically)
        const { error } = await supabase
            .from('asset_documents')
            .delete()
            .eq('id', documentId);

        if (error) {
            console.error('Error deleting document:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Document supprimé avec succès'
        });

    } catch (error) {
        console.error('Document deletion error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/documents/[id]
 * Get details of a specific document
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

    const { id: documentId } = await params;

    try {
        const { data: document, error } = await supabase
            .from('asset_documents')
            .select(`
                *,
                asset:assets(id, name, model_number, manufacturer)
            `)
            .eq('id', documentId)
            .single();

        if (error) {
            console.error('Error fetching document:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ document });

    } catch (error) {
        console.error('Document fetch error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/documents/[id]
 * Update document types after user confirmation
 */
export async function PATCH(
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

    const { id: documentId } = await params;

    try {
        const body = await request.json();
        const { document_types } = body;

        // Validate document_types is an array
        if (!Array.isArray(document_types) || document_types.length === 0) {
            return NextResponse.json(
                { error: 'document_types must be a non-empty array' },
                { status: 400 }
            );
        }

        // Update document types
        const { error } = await supabase
            .from('asset_documents')
            .update({
                document_types,
                user_confirmed: true, // User manually confirmed types
                classification_confidence: 1.0 // 100% confidence after user confirmation
            })
            .eq('id', documentId);

        if (error) {
            console.error('Error updating document types:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Types de document mis à jour',
            document_types
        });

    } catch (error) {
        console.error('Document update error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
