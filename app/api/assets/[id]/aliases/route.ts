import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeText, detectLanguage } from '@/lib/utils/normalize-text';

/**
 * GET /api/assets/[id]/aliases
 * Fetch all aliases for a specific asset
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

    try {
        const { data: aliases, error } = await supabase
            .from('asset_aliases')
            .select('*')
            .eq('asset_id', assetId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching aliases:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ aliases: aliases || [] });

    } catch (error) {
        console.error('Alias fetch error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/assets/[id]/aliases
 * Create a new alias for an asset
 */
export async function POST(
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

    try {
        const body = await request.json();
        const { alias, language } = body;

        // Validation
        if (!alias || alias.trim().length < 2) {
            return NextResponse.json(
                { error: 'Alias must be at least 2 characters' },
                { status: 400 }
            );
        }

        if (alias.length > 100) {
            return NextResponse.json(
                { error: 'Alias must be less than 100 characters' },
                { status: 400 }
            );
        }

        // Auto-detect language if not provided
        const detectedLanguage = language || detectLanguage(alias);
        const aliasNormalized = normalizeText(alias);

        // Check for duplicates
        const { data: existingAlias } = await supabase
            .from('asset_aliases')
            .select('id')
            .eq('asset_id', assetId)
            .eq('alias_normalized', aliasNormalized)
            .single();

        if (existingAlias) {
            return NextResponse.json(
                { error: 'This alias already exists for this asset' },
                { status: 409 }
            );
        }

        // Create alias
        const { data: newAlias, error } = await supabase
            .from('asset_aliases')
            .insert({
                asset_id: assetId,
                alias: alias.trim(),
                alias_normalized: aliasNormalized,
                language: detectedLanguage
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating alias:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            alias: newAlias,
            message: 'Alias créé avec succès'
        }, { status: 201 });

    } catch (error) {
        console.error('Alias creation error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/assets/[id]/aliases/[aliasId]
 * Delete a specific alias
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

    const { id: assetId } = await params;

    // Get aliasId from URL search params
    const url = new URL(request.url);
    const aliasId = url.searchParams.get('aliasId');

    if (!aliasId) {
        return NextResponse.json(
            { error: 'Alias ID required' },
            { status: 400 }
        );
    }

    try {
        const { error } = await supabase
            .from('asset_aliases')
            .delete()
            .eq('id', aliasId)
            .eq('asset_id', assetId); // Ensure alias belongs to this asset

        if (error) {
            console.error('Error deleting alias:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Alias supprimé avec succès'
        });

    } catch (error) {
        console.error('Alias deletion error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
