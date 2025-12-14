import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { AssetsTableWithSubAssets } from '@/components/assets/assets-table-with-subassets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Sparkles, Search, Filter, Package } from 'lucide-react'

interface ComponentAsset {
    id: string
    name: string
    code: string
}

export default async function AssetsPage() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Fetch only parent assets
    const { data: parentAssets, error: parentError } = await supabase
        .from('assets')
        .select('*')
        .not('code', 'like', '%-COMP-%')
        .order('created_at', { ascending: false })

    // Fetch component assets
    const { data: componentAssets } = await supabase
        .from('assets')
        .select('id, name, code')
        .like('code', '%-COMP-%')

    // Group components by parent
    const componentsByParent: Record<string, ComponentAsset[]> = {}
    if (componentAssets) {
        for (const comp of componentAssets) {
            const parentCode = comp.code.split('-COMP-')[0]
            if (!componentsByParent[parentCode]) {
                componentsByParent[parentCode] = []
            }
            componentsByParent[parentCode].push(comp)
        }
    }

    const assetsWithComponents = (parentAssets || []).map(asset => ({
        ...asset,
        linkedComponents: componentsByParent[asset.code] || []
    }))

    const totalAssets = assetsWithComponents.length

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your industrial equipment with hierarchical view
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/assets/import">
                        <Button variant="outline" className="rounded-xl border-2 gap-2">
                            <Sparkles className="h-4 w-4" />
                            AI Import
                        </Button>
                    </Link>

                    <Button className="btn-gradient rounded-xl gap-2">
                        <Plus className="h-4 w-4" />
                        Create Asset
                    </Button>
                </div>
            </div>

            {/* Stats & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                {/* Stats */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalAssets}</p>
                            <p className="text-xs text-muted-foreground">Total Assets</p>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search equipment..."
                            className="pl-10 h-10 rounded-xl border-2"
                        />
                    </div>

                    <Button variant="outline" className="rounded-xl border-2 gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Assets Table/Grid */}
            {totalAssets > 0 ? (
                <AssetsTableWithSubAssets assets={assetsWithComponents} />
            ) : (
                <Card className="border-2 border-dashed">
                    <CardContent className="py-16">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto">
                                <Package className="h-10 w-10 text-blue-600" />
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold">No Equipment Yet</h3>
                                <p className="text-muted-foreground mt-1">
                                    Import your first equipment manual using AI to get started
                                </p>
                            </div>

                            <Link href="/assets/import">
                                <Button className="btn-gradient rounded-xl gap-2 mt-4">
                                    <Sparkles className="h-4 w-4" />
                                    Import First Manual
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
