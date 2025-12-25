'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    MessageSquare,
    Search,
    QrCode,
    Package,
    Sparkles,
    ChevronRight,
    X,
    Factory,
    GitBranch,
    Layers
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RAGChat } from '@/components/chat/rag-chat'
import { cn } from '@/lib/utils'

interface Asset {
    id: string
    name: string
    manufacturer: string | null
    model_number: string | null
    level: string | null
}

export default function AIAssistantPage() {
    const [assets, setAssets] = useState<Asset[]>([])
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAssets() {
            const supabase = createClient()
            const { data } = await supabase
                .from('assets')
                .select('id, name, manufacturer, model_number, level')
                .order('created_at', { ascending: false })

            setAssets(data || [])
            setLoading(false)
        }
        fetchAssets()
    }, [])

    const filteredAssets = assets.filter(a =>
        search === '' ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.manufacturer?.toLowerCase().includes(search.toLowerCase())
    )

    // No asset selected - show selector
    if (!selectedAsset) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Assistant IA</h1>
                    <p className="text-gray-500 mt-1">
                        Sélectionnez un équipement, un site ou une ligne pour démarrer
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-center gap-3">
                    <Link href="/scan">
                        <Button variant="outline" className="gap-2">
                            <QrCode className="h-4 w-4" />
                            Scanner un QR
                        </Button>
                    </Link>
                    <Link href="/assets/import">
                        <Button variant="outline" className="gap-2">
                            <Package className="h-4 w-4" />
                            Importer un manuel
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Rechercher un équipement..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Asset List */}
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                            <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                                {search ? 'Aucun résultat' : 'Aucun équipement importé'}
                            </p>
                            {!search && (
                                <Link href="/assets/import" className="block mt-4">
                                    <Button size="sm">Importer un manuel</Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filteredAssets.map(asset => {
                            const isHierarchyNode = ['site', 'line', 'subsystem'].includes(asset.level || '')
                            const Icon = asset.level === 'site' ? Factory
                                : asset.level === 'line' ? GitBranch
                                    : asset.level === 'subsystem' ? Layers
                                        : Package
                            const iconBg = asset.level === 'site' ? 'bg-purple-100 group-hover:bg-purple-200'
                                : asset.level === 'line' ? 'bg-blue-100 group-hover:bg-blue-200'
                                    : asset.level === 'subsystem' ? 'bg-teal-100 group-hover:bg-teal-200'
                                        : 'bg-gray-100 group-hover:bg-blue-100'
                            const iconColor = asset.level === 'site' ? 'text-purple-600'
                                : asset.level === 'line' ? 'text-blue-600'
                                    : asset.level === 'subsystem' ? 'text-teal-600'
                                        : 'text-gray-500 group-hover:text-blue-600'
                            const typeLabel = asset.level === 'site' ? 'Site'
                                : asset.level === 'line' ? 'Ligne'
                                    : asset.level === 'subsystem' ? 'Sous-système'
                                        : null

                            return (
                                <button
                                    key={asset.id}
                                    onClick={() => setSelectedAsset(asset)}
                                    className="w-full text-left p-4 rounded-xl border-2 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-gray-800 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors", iconBg)}>
                                            <Icon className={cn("h-5 w-5", iconColor)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">{asset.name}</p>
                                                {typeLabel && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {typeLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {isHierarchyNode
                                                    ? 'Cliquez pour discuter de cette zone'
                                                    : (asset.manufacturer || 'Fabricant inconnu') + (asset.model_number ? ` • ${asset.model_number}` : '')
                                                }
                                            </p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    // Asset selected - show chat
    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Context Bar */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold">{selectedAsset.name}</p>
                        <p className="text-xs text-gray-500">
                            {selectedAsset.manufacturer || 'Fabricant inconnu'}
                        </p>
                    </div>
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                        RAG Activé
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Link href={`/assets/${selectedAsset.id}`}>
                        <Button variant="ghost" size="sm">
                            Voir détails
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedAsset(null)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col border rounded-b-xl overflow-hidden min-h-0">
                <RAGChat assetId={selectedAsset.id} assetName={selectedAsset.name} />
            </div>
        </div>
    )
}
