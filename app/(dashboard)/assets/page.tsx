'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    Package,
    Search,
    Upload,
    MessageSquare,
    Grid3X3,
    List,
    Building,
    ArrowRight,
    Filter,
    Trash2,
    Settings2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { OrganizeMode } from '@/components/assets/organize-mode'

interface Asset {
    id: string
    name: string
    manufacturer: string | null
    model_number: string | null
    category: string | null
    status: string | null
    created_at: string | null
    level: string | null
    parent_id: string | null
    // Computed hierarchy path
    site_name?: string
    line_name?: string
    subsystem_name?: string
}

function StatusBadge({ status }: { status: string | null }) {
    const statusConfig = {
        operational: { bg: 'bg-green-100', text: 'text-green-700', label: 'Opérationnel' },
        active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
        maintenance: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Maintenance' },
        broken: { bg: 'bg-red-100', text: 'text-red-700', label: 'Hors service' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: status || 'Inconnu'
    }

    return (
        <Badge variant="secondary" className={`${config.bg} ${config.text} hover:${config.bg}`}>
            {config.label}
        </Badge>
    )
}

function AssetCard({ asset }: { asset: Asset }) {
    return (
        <Link href={`/assets/${asset.id}`}>
            <Card className="group cursor-pointer border-2 hover:border-blue-300 hover:shadow-lg transition-all duration-200 h-full">
                <CardContent className="p-5">
                    {/* Image placeholder */}
                    <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 group-hover:from-blue-50 group-hover:to-purple-50 transition-colors">
                        <Package className="h-12 w-12 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {asset.name}
                            </h3>
                            <StatusBadge status={asset.status} />
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Building className="h-3.5 w-3.5" />
                            <span className="truncate">{asset.manufacturer || 'Fabricant inconnu'}</span>
                        </div>

                        {asset.model_number && (
                            <p className="text-xs text-gray-400 font-mono truncate">
                                {asset.model_number}
                            </p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={(e) => {
                                e.preventDefault()
                                window.location.href = `/assets/${asset.id}`
                            }}
                        >
                            Voir détails
                            <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            onClick={(e) => {
                                e.preventDefault()
                                window.location.href = `/assets/${asset.id}?tab=chat`
                            }}
                        >
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Chat
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [organizeMode, setOrganizeMode] = useState(false)

    useEffect(() => {
        async function fetchAssets() {
            try {
                const supabase = createClient()
                // Fetch all assets
                const { data: allAssets, error: fetchError } = await supabase
                    .from('assets')
                    .select('id, name, manufacturer, model_number, category, status, created_at, level, parent_id')
                    .order('created_at', { ascending: false })

                if (fetchError) {
                    console.error('Assets fetch error:', fetchError)
                    setError(fetchError.message)
                } else if (allAssets) {
                    console.log('Raw assets:', allAssets.map(a => ({ id: a.id, name: a.name, level: a.level, parent_id: a.parent_id })))

                    // Build a map for quick lookup
                    const assetMap = new Map(allAssets.map(a => [a.id, a]))

                    // Compute hierarchy path for each asset
                    const enrichedAssets = allAssets.map(asset => {
                        let site_name = '', line_name = '', subsystem_name = ''

                        // Walk up the hierarchy
                        let current = asset
                        const path: string[] = []
                        let iterations = 0
                        while (current.parent_id && assetMap.has(current.parent_id) && iterations < 10) {
                            iterations++
                            current = assetMap.get(current.parent_id)!
                            path.unshift(current.name)
                            console.log(`Walking up: ${asset.name} -> parent ${current.name} (level: ${current.level})`)
                            if (current.level === 'site') site_name = current.name
                            if (current.level === 'line') line_name = current.name
                            if (current.level === 'subsystem') subsystem_name = current.name
                        }

                        if (asset.level === 'equipment' || !asset.level) {
                            console.log(`Equipment ${asset.name}: site=${site_name}, line=${line_name}, subsystem=${subsystem_name}`)
                        }

                        return {
                            ...asset,
                            site_name,
                            line_name,
                            subsystem_name,
                        } as Asset
                    })

                    // Only show equipment-level assets (not sites/lines/subsystems)
                    const equipmentAssets = enrichedAssets.filter(
                        a => !a.level || a.level === 'equipment' || a.level === 'component'
                    )

                    console.log('Equipment assets with hierarchy:', equipmentAssets.map(a => ({ name: a.name, site: a.site_name, line: a.line_name })))
                    setAssets(equipmentAssets)
                }
            } catch (err: any) {
                console.error('Assets fetch exception:', err)
                setError(err.message || 'Erreur de chargement')
            } finally {
                setLoading(false)
            }
        }

        fetchAssets()
    }, [])

    // Filter assets
    const filteredAssets = assets.filter(asset => {
        const matchesSearch = search === '' ||
            asset.name.toLowerCase().includes(search.toLowerCase()) ||
            asset.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
            asset.model_number?.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter

        return matchesSearch && matchesStatus
    })

    // Toggle asset selection
    const toggleAssetSelection = (assetId: string) => {
        setSelectedAssets(prev => {
            const newSet = new Set(prev)
            if (newSet.has(assetId)) {
                newSet.delete(assetId)
            } else {
                newSet.add(assetId)
            }
            return newSet
        })
    }

    // Toggle all visible assets
    const toggleSelectAll = () => {
        if (selectedAssets.size === filteredAssets.length) {
            setSelectedAssets(new Set())
        } else {
            setSelectedAssets(new Set(filteredAssets.map(a => a.id)))
        }
    }

    // Delete selected assets
    const deleteSelectedAssets = async () => {
        if (selectedAssets.size === 0) return

        if (!confirm(`Supprimer ${selectedAssets.size} équipement(s) ?`)) return

        setIsDeleting(true)
        try {
            const supabase = createClient()

            // Delete related document_chunks first
            await supabase
                .from('document_chunks')
                .delete()
                .in('asset_id', Array.from(selectedAssets))

            // Delete related asset_documents
            await supabase
                .from('asset_documents')
                .delete()
                .in('asset_id', Array.from(selectedAssets))

            // Delete assets
            const { error } = await supabase
                .from('assets')
                .delete()
                .in('id', Array.from(selectedAssets))

            if (error) throw error

            // Update local state
            setAssets(prev => prev.filter(a => !selectedAssets.has(a.id)))
            setSelectedAssets(new Set())
            toast.success(`${selectedAssets.size} équipement(s) supprimé(s)`)
        } catch (err: any) {
            console.error('Delete error:', err)
            toast.error('Erreur lors de la suppression')
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Erreur de chargement</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Réessayer</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Équipements</h1>
                    <p className="text-gray-500 text-sm">{assets.length} équipement(s) importé(s)</p>
                </div>

                <div className="flex gap-2">
                    {selectedAssets.size > 0 && (
                        <Button
                            onClick={deleteSelectedAssets}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer ({selectedAssets.size})
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setOrganizeMode(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Organiser
                    </Button>
                    <Link href="/assets/import">
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                            <Upload className="mr-2 h-4 w-4" />
                            Importer un manuel
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Rechercher par nom, fabricant, modèle..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="operational">Opérationnel</SelectItem>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="broken">Hors service</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* View toggle */}
                    <div className="flex border rounded-lg p-1">
                        <Button
                            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('cards')}
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('table')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {filteredAssets.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Package className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                            {search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucun équipement'}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            {search || statusFilter !== 'all'
                                ? 'Essayez de modifier vos critères de recherche'
                                : 'Importez votre premier manuel PDF pour créer un équipement et activer l\'assistant IA.'
                            }
                        </p>
                        {!search && statusFilter === 'all' && (
                            <Link href="/assets/import">
                                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Importer votre premier manuel
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAssets.map(asset => (
                        <AssetCard key={asset.id} asset={asset} />
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                    <th className="w-10 p-3 md:p-4">
                                        <Checkbox
                                            checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="hidden md:table-cell text-left p-3 md:p-4 font-medium text-gray-600 dark:text-gray-300 text-sm">Site</th>
                                    <th className="hidden lg:table-cell text-left p-3 md:p-4 font-medium text-gray-600 dark:text-gray-300 text-sm">Ligne</th>
                                    <th className="text-left p-3 md:p-4 font-medium text-gray-600 dark:text-gray-300 text-sm">Nom</th>
                                    <th className="hidden sm:table-cell text-left p-3 md:p-4 font-medium text-gray-600 dark:text-gray-300 text-sm">Modèle</th>
                                    <th className="text-left p-3 md:p-4 font-medium text-gray-600 dark:text-gray-300 text-sm">Statut</th>
                                    <th className="text-right p-3 md:p-4 font-medium text-gray-600 dark:text-gray-300 text-sm">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssets.map(asset => (
                                    <tr
                                        key={asset.id}
                                        className={`border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedAssets.has(asset.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                    >
                                        <td className="p-3 md:p-4">
                                            <Checkbox
                                                checked={selectedAssets.has(asset.id)}
                                                onCheckedChange={() => toggleAssetSelection(asset.id)}
                                            />
                                        </td>
                                        <td className="hidden md:table-cell p-3 md:p-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {asset.site_name || '-'}
                                        </td>
                                        <td className="hidden lg:table-cell p-3 md:p-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {asset.line_name || '-'}
                                        </td>
                                        <td className="p-3 md:p-4">
                                            <Link href={`/assets/${asset.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 text-sm md:text-base">
                                                {asset.name}
                                            </Link>
                                            {/* Show Site/Line on mobile below name */}
                                            <div className="md:hidden text-xs text-gray-400 mt-0.5">
                                                {asset.site_name && <span>{asset.site_name}</span>}
                                                {asset.line_name && <span> › {asset.line_name}</span>}
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell p-3 md:p-4 text-gray-500 dark:text-gray-400 font-mono text-xs md:text-sm">{asset.model_number || '-'}</td>
                                        <td className="p-3 md:p-4">
                                            <StatusBadge status={asset.status} />
                                        </td>
                                        <td className="p-3 md:p-4 text-right">
                                            <Link href={`/assets/${asset.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 px-2 md:px-3">
                                                    <MessageSquare className="h-4 w-4 md:mr-1" />
                                                    <span className="hidden md:inline">Chat</span>
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Organize Mode Dialog */}
            <OrganizeMode
                isOpen={organizeMode}
                onClose={() => setOrganizeMode(false)}
                onComplete={() => {
                    // Refresh assets after organizing
                    window.location.reload()
                }}
            />
        </div>
    )
}
