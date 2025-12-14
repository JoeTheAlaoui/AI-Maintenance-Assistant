'use client'

import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Package,
    Wrench,
    Zap,
    Wind,
    Eye,
    ChevronRight,
    Settings2,
    ChevronDown
} from 'lucide-react'
import { Database } from '@/types/database.types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'

type Asset = Database['public']['Tables']['assets']['Row'] & {
    linkedComponents?: { id: string; name: string; code: string }[]
}

interface ElectricalComponent {
    id?: string
    name: string
    type?: string
    reference?: string
}

interface Subsystem {
    name: string
    type?: string
    components?: { name: string; type?: string }[]
}

interface AssetsTableWithSubAssetsProps {
    assets: Asset[]
}

const getStatusColor = (status: string | null) => {
    switch (status) {
        case 'operational': return 'bg-green-500'
        case 'maintenance':
        case 'under_maintenance': return 'bg-yellow-500'
        case 'down':
        case 'broken': return 'bg-red-500'
        default: return 'bg-gray-500'
    }
}

export function AssetsTableWithSubAssets({ assets }: AssetsTableWithSubAssetsProps) {
    const router = useRouter()
    const [expandedSubsystems, setExpandedSubsystems] = useState<Set<string>>(new Set())

    const toggleSubsystem = (key: string) => {
        const newSet = new Set(expandedSubsystems)
        if (newSet.has(key)) {
            newSet.delete(key)
        } else {
            newSet.add(key)
        }
        setExpandedSubsystems(newSet)
    }

    return (
        <div className="rounded-lg border bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[30%]">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Asset
                            </div>
                        </TableHead>
                        <TableHead className="w-[70%]">
                            <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Composants / Sub-Assets
                            </div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center py-12 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Aucun asset trouvé</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        assets.map((asset) => {
                            // Parse JSONB data
                            const linkedComponents = asset.linkedComponents || []
                            const electricalComponents = Array.isArray(asset.electrical_components)
                                ? (asset.electrical_components as unknown as ElectricalComponent[])
                                : []
                            const subsystems = Array.isArray(asset.integrated_subsystems)
                                ? (asset.integrated_subsystems as unknown as Subsystem[])
                                : []

                            const totalCount = linkedComponents.length + electricalComponents.length + subsystems.length

                            return (
                                <TableRow key={asset.id} className="align-top hover:bg-muted/30">
                                    {/* Column 1: Asset Info - COMPACT */}
                                    <TableCell className="py-3 border-r">
                                        <div className="space-y-1.5">
                                            <h3 className="font-semibold text-sm leading-tight">
                                                {asset.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {asset.code}
                                            </p>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge className={`${getStatusColor(asset.status)} text-white text-[10px] px-1.5 py-0`}>
                                                    {asset.status || 'N/A'}
                                                </Badge>
                                                {asset.completeness_score && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                        {asset.completeness_score}%
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-[10px] text-muted-foreground">
                                                📍 {asset.location}
                                            </p>

                                            <Button
                                                onClick={() => router.push(`/assets/${asset.id}`)}
                                                size="sm"
                                                className="w-full h-7 text-xs"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Détails
                                                <ChevronRight className="h-3 w-3 ml-auto" />
                                            </Button>
                                        </div>
                                    </TableCell>

                                    {/* Column 2: All Components */}
                                    <TableCell className="py-3">
                                        {totalCount === 0 ? (
                                            <div className="flex items-center gap-2 text-muted-foreground py-4">
                                                <Settings2 className="h-4 w-4" />
                                                <span className="text-xs">Aucun composant</span>
                                            </div>
                                        ) : (
                                            <ScrollArea className="h-[220px]">
                                                <div className="space-y-2 pr-3">

                                                    {/* 1. LINKED MECHANICAL COMPONENTS */}
                                                    {linkedComponents.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                                                                <Wrench className="h-3 w-3" />
                                                                Composants ({linkedComponents.length})
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {linkedComponents.map((comp, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-700"
                                                                    >
                                                                        <Wrench className="h-2.5 w-2.5 text-gray-400" />
                                                                        {comp.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 2. ELECTRICAL COMPONENTS */}
                                                    {electricalComponents.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-1">
                                                                <Zap className="h-3 w-3" />
                                                                Électrique ({electricalComponents.length})
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {electricalComponents.map((comp, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-orange-50 rounded text-orange-700"
                                                                        title={comp.reference || comp.type || ''}
                                                                    >
                                                                        <Zap className="h-2.5 w-2.5 text-orange-400" />
                                                                        {comp.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 3. SUBSYSTEMS - EXPANDABLE */}
                                                    {subsystems.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">
                                                                <Wind className="h-3 w-3" />
                                                                Sous-Systèmes ({subsystems.length})
                                                            </div>
                                                            <div className="space-y-1">
                                                                {subsystems.map((sub, idx) => {
                                                                    const subKey = `${asset.id}-sub-${idx}`
                                                                    const isExpanded = expandedSubsystems.has(subKey)
                                                                    const subComponents = sub.components || []

                                                                    return (
                                                                        <div key={idx} className="bg-blue-50 rounded">
                                                                            <button
                                                                                onClick={() => toggleSubsystem(subKey)}
                                                                                className="w-full flex items-center gap-1.5 p-1.5 hover:bg-blue-100 transition-colors text-left"
                                                                            >
                                                                                <Wind className="h-3 w-3 text-blue-500 shrink-0" />
                                                                                <span className="text-xs font-medium text-blue-800 flex-1 truncate">
                                                                                    {sub.name}
                                                                                </span>
                                                                                {subComponents.length > 0 && (
                                                                                    <span className="text-[10px] text-blue-500">
                                                                                        {subComponents.length} comp.
                                                                                    </span>
                                                                                )}
                                                                                <ChevronDown className={`h-3 w-3 text-blue-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                            </button>

                                                                            {isExpanded && subComponents.length > 0 && (
                                                                                <div className="px-1.5 pb-1.5 border-t border-blue-100">
                                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                                        {subComponents.map((comp, cIdx) => (
                                                                                            <span
                                                                                                key={cIdx}
                                                                                                className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 bg-white rounded text-blue-700"
                                                                                            >
                                                                                                <Wrench className="h-2 w-2 text-blue-400" />
                                                                                                {comp.name}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
