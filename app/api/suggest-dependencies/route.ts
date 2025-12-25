// app/api/suggest-dependencies/route.ts
// API endpoint for AI-powered dependency suggestions

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { suggestDependencies } from '@/lib/rag/dependency-suggester';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { asset_id } = await request.json();

        if (!asset_id) {
            return NextResponse.json({ error: 'asset_id required' }, { status: 400 });
        }

        // Get asset info
        const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select('name, category, model_number')
            .eq('id', asset_id)
            .single();

        if (assetError || !asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        console.log(`🔗 Suggesting dependencies for: ${asset.name}`);

        // Get document text for context
        const { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('asset_id', asset_id)
            .order('chunk_index')
            .limit(20);

        const documentText = chunks?.map(c => c.content).join('\n\n') || '';

        // Get all other assets for matching
        const { data: allAssets } = await supabase
            .from('assets')
            .select('id, name, level')
            .neq('id', asset_id)
            .order('name');

        // Get AI suggestions
        const suggestions = await suggestDependencies(
            asset.name,
            asset.category || 'equipment',
            documentText,
            allAssets || []
        );

        console.log(`🔗 Found ${suggestions.upstream.length} upstream, ${suggestions.downstream.length} downstream suggestions`);

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error('Dependency suggestion error:', error);
        return NextResponse.json({
            error: 'Failed to suggest dependencies',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
