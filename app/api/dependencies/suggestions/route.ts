// app/api/dependencies/suggestions/route.ts
// API endpoints for dependency suggestions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * GET /api/dependencies/suggestions?assetId=xxx
 * Get pending suggestions for an asset
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const assetId = searchParams.get('assetId');

        if (!assetId) {
            return NextResponse.json(
                { error: 'assetId required' },
                { status: 400 }
            );
        }

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`📥 Fetching suggestions for asset: ${assetId}`);

        const { data, error } = await supabase
            .from('dependency_suggestions')
            .select(`
                *,
                target:assets!target_asset_id(id, name)
            `)
            .eq('source_asset_id', assetId)
            .eq('status', 'pending')
            .order('confidence', { ascending: false });

        if (error) {
            console.error('Error fetching suggestions:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        console.log(`📥 Found ${data?.length || 0} suggestions`);

        return NextResponse.json({ suggestions: data || [] });

    } catch (error: any) {
        console.error('Error in suggestions GET:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
