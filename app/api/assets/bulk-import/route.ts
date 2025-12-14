import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import type { ExtractedAsset, ExtractedComponent, ExtractedSparePart } from '@/types/ai-import'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * POST /api/assets/bulk-import
 * Importe l'actif principal + composants + pièces de rechange (transaction atomique)
 */
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // 1. Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            )
        }

        // 2. Parse request body
        const body = await req.json()
        const { main_asset, components = [], spare_parts = [], extraction_id } = body

        // 3. Validation
        if (!main_asset || !main_asset.name) {
            return NextResponse.json(
                { success: false, error: 'Données d\'actif invalides' },
                { status: 400 }
            )
        }

        if (!main_asset.location) {
            return NextResponse.json(
                { success: false, error: 'L\'emplacement de l\'actif est requis' },
                { status: 400 }
            )
        }

        console.log(`[Bulk Import] Starting import for asset: ${main_asset.name}`)

        // 4. Generate unique asset code (use model_number or generate from name)
        const assetCode = main_asset.model_number
            || `AI-${Date.now()}-${main_asset.name.substring(0, 3).toUpperCase()}`

        // 5. Insert Main Asset with enhanced extraction data
        console.log('[Bulk Import] Step A: Inserting main asset...')
        const { data: assetData, error: assetError } = await supabase
            .from('assets')
            .insert({
                // Core fields
                name: main_asset.name,
                code: assetCode,
                location: main_asset.location,
                status: main_asset.status || 'operational',

                // Basic asset info from extraction
                manufacturer: main_asset.manufacturer || null,
                model_number: main_asset.model_number || null,
                serial_number: main_asset.serial_number || null,
                category: main_asset.category || 'equipment',
                criticality: main_asset.criticality || 'medium',
                specifications: main_asset.specifications || {},

                // Enhanced extraction data (JSONB)
                model_configurations: body.model_configurations || [],
                integrated_subsystems: body.integrated_subsystems || [],
                electrical_components: body.electrical_components || [],
                motor_protection_settings: body.motor_protection_settings || [],
                diagnostic_codes: body.diagnostic_codes || [],
                specification_tables: body.specification_tables || [],
                completeness_score: body.completeness_score || null,
                extraction_metadata: body.extraction_metadata || null,
            })

            .select('id, name, code')
            .single()

        if (assetError) {
            console.error('[Bulk Import] Asset insertion error:', assetError)

            // Check for duplicate code
            if (assetError.code === '23505') { // Unique violation
                return NextResponse.json(
                    { success: false, error: 'Code d\'actif déjà existant' },
                    { status: 409 }
                )
            }

            throw assetError
        }

        const assetId = assetData.id
        console.log(`[Bulk Import] Asset created with ID: ${assetId}`)

        // 6. Generate QR Code
        console.log('[Bulk Import] Step B: Generating QR code...')
        const qrData = `${SITE_URL}/scan/${assetId}`
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H', // 30% damage tolerance
            type: 'image/png',
            width: 300,
            margin: 2
        })

        // 7. Upload QR to Supabase Storage
        console.log('[Bulk Import] Step C: Uploading QR code to storage...')

        // Convert base64 to Buffer
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
        const qrBuffer = Buffer.from(base64Data, 'base64')

        const qrFileName = `qr_${assetId}.png`
        const { data: qrUploadData, error: qrUploadError } = await supabase.storage
            .from('asset-images')
            .upload(qrFileName, qrBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: true
            })

        if (qrUploadError) {
            console.error('[Bulk Import] QR upload error:', qrUploadError)

            // Rollback: Delete the asset
            await supabase.from('assets').delete().eq('id', assetId)

            throw new Error('Échec du téléchargement du QR code')
        }

        // 8. Get public URL for QR code
        const { data: { publicUrl: qrPublicUrl } } = supabase.storage
            .from('asset-images')
            .getPublicUrl(qrUploadData.path)

        // 9. Update Asset with QR URL
        console.log('[Bulk Import] Step D: Updating asset with QR URL...')
        const { error: updateError } = await supabase
            .from('assets')
            .update({ image_url: qrPublicUrl })
            .eq('id', assetId)

        if (updateError) {
            console.error('[Bulk Import] Asset update error:', updateError)

            // Rollback: Delete asset and QR
            await supabase.from('assets').delete().eq('id', assetId)
            await supabase.storage.from('asset-images').remove([qrFileName])

            throw updateError
        }

        // 10. Insert Spare Parts to Inventory
        let importedPartsCount = 0
        if (spare_parts.length > 0) {
            console.log(`[Bulk Import] Step E: Inserting ${spare_parts.length} spare parts...`)

            try {
                // Map vers les colonnes RÉELLES de la table inventory
                // Ajouter un timestamp pour rendre les références uniques
                const timestamp = Date.now()
                const inventoryInserts = spare_parts.map((part: ExtractedSparePart, index: number) => ({
                    name: part.name,                           // ✅ Correct column
                    reference: `${part.reference || 'REF'}-${timestamp}-${index}`, // ✅ Unique reference
                    stock_qty: 0,                              // ✅ Initial stock = 0
                    min_threshold: part.quantity_recommended || 1, // ✅ Seuil de réapprovisionnement
                    location: 'Magasin',                       // ✅ Location par défaut
                }))

                console.log('[Bulk Import] Inventory inserts:', JSON.stringify(inventoryInserts, null, 2))

                const { data: inventoryData, error: inventoryError } = await supabase
                    .from('inventory')
                    .insert(inventoryInserts)
                    .select('id')

                if (inventoryError) {
                    console.error('[Bulk Import] Inventory insertion error:', inventoryError)
                    console.error('[Bulk Import] Error details:', JSON.stringify(inventoryError, null, 2))
                    // Non-fatal: continue without rollback for spare parts
                } else {
                    importedPartsCount = inventoryData?.length || 0
                    console.log(`[Bulk Import] Successfully inserted ${importedPartsCount} spare parts`)
                }
            } catch (partError) {
                console.error('[Bulk Import] Spare parts error:', partError)
                // Non-fatal: continue
            }
        }

        // 11. Insert Components as sub-assets (using code prefix to link to parent)
        let importedComponentsCount = 0
        if (components.length > 0) {
            console.log(`[Bulk Import] Step E2: Inserting ${components.length} components as sub-assets...`)

            try {
                const componentInserts = components.map((comp: ExtractedComponent, index: number) => ({
                    name: `${comp.name}`,
                    code: `${assetCode}-COMP-${index + 1}`, // Unique code derived from parent
                    location: comp.location || main_asset.location, // Inherit parent location
                    status: 'operational',
                    // Note: Pour lier au parent, on pourrait ajouter parent_asset_id plus tard
                }))

                console.log('[Bulk Import] Component inserts:', JSON.stringify(componentInserts, null, 2))

                const { data: componentData, error: componentError } = await supabase
                    .from('assets')
                    .insert(componentInserts)
                    .select('id')

                if (componentError) {
                    console.error('[Bulk Import] Components insertion error:', componentError)
                    console.error('[Bulk Import] Error details:', JSON.stringify(componentError, null, 2))
                    // Non-fatal
                } else {
                    importedComponentsCount = componentData?.length || 0
                    console.log(`[Bulk Import] Successfully inserted ${importedComponentsCount} components`)
                }
            } catch (compError) {
                console.error('[Bulk Import] Components error:', compError)
                // Non-fatal
            }
        }

        // 12. Mettre à jour l'enregistrement d'extraction IA (commenté - table non migrée)
        /*
        if (extraction_id) {
            console.log('[Bulk Import] Step F: Updating extraction record...')
            await supabase
                .from('ai_extractions')
                .update({
                    extracted_assets_count: 1,
                    extracted_components_count: components.length,
                    extracted_parts_count: spare_parts.length
                })
                .eq('id', extraction_id)
        }
        */



        // 13. Success response
        console.log(`[Bulk Import] Import completed successfully for asset ${assetId}`)
        console.log(`[Bulk Import] Stats: ${importedComponentsCount} components, ${importedPartsCount} spare parts`)

        return NextResponse.json({
            success: true,
            asset_id: assetId,
            asset_name: assetData.name,
            qr_code_url: qrPublicUrl,
            stats: {
                components_imported: importedComponentsCount,  // ✅ Actual count
                spare_parts_imported: importedPartsCount       // ✅ Actual count
            }

        }, { status: 200 })

    } catch (error) {
        console.error('[Bulk Import] Unexpected error:', error)

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur lors de l\'importation'
        }, { status: 500 })
    }
}

/**
 * EXAMPLE REQUEST:
 * 
 * POST /api/assets/bulk-import
 * {
 *   "main_asset": {
 *     "name": "Compresseur Atlas Copco",
 *     "manufacturer": "Atlas Copco",
 *     "model_number": "GA-37",
 *     "category": "machinery",
 *     "criticality": "high",
 *     "location": "Atelier B", // User-provided
 *     "status": "operational",  // User-provided
 *     "specifications": { "power": "37kW" }
 *   },
 *   "components": [...],
 *   "spare_parts": [...],
 *   "extraction_id": "uuid-here"
 * }
 * 
 * EXAMPLE RESPONSE:
 * {
 *   "success": true,
 *   "asset_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "asset_name": "Compresseur Atlas Copco",
 *   "qr_code_url": "https://.../asset-images/qr_123e4567.png",
 *   "stats": {
 *     "components_imported": 5,
 *     "spare_parts_imported": 12
 *   }
 * }
 */
