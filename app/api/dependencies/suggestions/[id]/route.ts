// app/api/dependencies/suggestions/[id]/route.ts
// API endpoints for individual suggestion actions (approve/reject)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/dependencies/suggestions/:id
 * Approve a suggestion
 */
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Use the approve function from database
        const { error } = await supabase
            .rpc('approve_dependency_suggestion', {
                suggestion_id: id
            });

        if (error) {
            console.error('Error approving suggestion:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Dependency created' });

    } catch (error: any) {
        console.error('Error approving suggestion:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/dependencies/suggestions/:id
 * Reject a suggestion
 */
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { error } = await supabase
            .from('dependency_suggestions')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error rejecting suggestion:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Suggestion rejected' });

    } catch (error: any) {
        console.error('Error rejecting suggestion:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/dependencies/suggestions/:id
 * Delete a suggestion
 */
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { error } = await supabase
            .from('dependency_suggestions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting suggestion:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Suggestion deleted' });

    } catch (error: any) {
        console.error('Error deleting suggestion:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
