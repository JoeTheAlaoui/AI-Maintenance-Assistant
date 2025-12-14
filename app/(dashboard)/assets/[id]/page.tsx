'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    ArrowLeft,
    Download,
    QrCode,
    MapPin,
    Tag,
    Activity,
    Calendar,
    Wrench,
    Package,
    AlertTriangle,
    Settings,
    FileText,
    Zap
} from 'lucide-react'
import { DiagnosticsTab } from './components/tabs/diagnostics-tab'
import { SubsystemsTab } from './components/tabs/subsystems-tab'

interface Asset {
    id: string
    name: string
    code: string
    location: string
    status: string | null
    image_url: string | null
    created_at: string | null
    // Enhanced extraction fields
    manufacturer?: string | null
    model_number?: string | null
    serial_number?: string | null
    category?: string | null
    criticality?: string | null
    specifications?: Record<string, unknown> | null
    diagnostic_codes?: Array<{
        id?: string
        code: string
        description: string
        possible_causes?: string[]
        corrective_actions?: string[]
        severity?: string
        display?: string
        reset_procedure?: string
    }> | null
    integrated_subsystems?: Array<{
        id?: string
        name: string
        type: string
        function?: string
        components?: Array<{ name: string; type?: string; specifications?: Record<string, unknown> }>
        alarm_codes?: Array<{ code: string; description: string; action?: string; reset_condition?: string }>
        control_panel?: {
            type?: string
            buttons?: string[]
            displays?: string[]
            indicators?: string[]
            programmable_parameters?: Array<{
                code: string
                description: string
                range?: string
                default_value?: string | number
            }>
        }
        maintenance?: {
            daily?: string[]
            weekly?: string[]
            monthly?: string[]
            yearly?: string[]
        }
    }> | null
    electrical_components?: Array<{
        id?: string
        reference: string
        name: string
        type: string
        function?: string
        specifications?: Record<string, unknown>
    }> | null
    completeness_score?: number | null
}

interface RelatedAsset {
    id: string
    name: string
    code: string
    location: string
    status: string | null
}

export default function AssetDetailPage() {
    const params = useParams()
    const router = useRouter()
    const assetId = params.id as string

    const [asset, setAsset] = useState<Asset | null>(null)
    const [components, setComponents] = useState<RelatedAsset[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchAsset() {
            try {
                const supabase = createClient()

                // Récupérer l'asset principal avec tous les champs enrichis
                const { data: assetData, error: assetError } = await supabase
                    .from('assets')
                    .select('*')
                    .eq('id', assetId)
                    .single()

                if (assetError) throw assetError
                setAsset(assetData as Asset)

                // Récupérer les composants liés
                if (assetData?.code) {
                    const { data: compData } = await supabase
                        .from('assets')
                        .select('id, name, code, location, status')
                        .like('code', `${assetData.code}-COMP-%`)
                        .order('code')

                    setComponents(compData || [])
                }

            } catch (err) {
                console.error('Error fetching asset:', err)
                setError('Asset non trouvé')
            } finally {
                setLoading(false)
            }
        }

        if (assetId) {
            fetchAsset()
        }
    }, [assetId])

    // Télécharger le QR code
    const handleDownloadQR = async () => {
        if (!asset?.image_url) return

        try {
            const response = await fetch(asset.image_url)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `qr_${asset.code}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch {
            window.open(asset.image_url, '_blank')
        }
    }

    // Status badge color
    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'operational':
                return <Badge className="bg-green-500">Opérationnel</Badge>
            case 'maintenance':
            case 'under_maintenance':
                return <Badge className="bg-yellow-500">En maintenance</Badge>
            case 'broken':
            case 'critical':
                return <Badge className="bg-red-500">Hors service</Badge>
            default:
                return <Badge variant="secondary">{status || 'Inconnu'}</Badge>
        }
    }

    // Count data for tabs
    const diagnosticsCount = asset?.diagnostic_codes?.length || 0
    const subsystemsCount = asset?.integrated_subsystems?.length || 0
    const electricalCount = asset?.electrical_components?.length || 0

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error || !asset) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => router.push('/assets')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour aux assets
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground text-lg">{error || 'Asset non trouvé'}</p>
                        <Button className="mt-4" onClick={() => router.push('/assets')}>
                            Voir tous les assets
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header avec navigation */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push('/assets')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour aux assets
                </Button>
                {asset.completeness_score && asset.completeness_score > 0 && (
                    <Badge variant={asset.completeness_score >= 90 ? 'default' : 'secondary'}>
                        Extraction: {asset.completeness_score}%
                    </Badge>
                )}
            </div>

            {/* Carte principale */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Informations de l'asset */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl">{asset.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2">
                                    <Tag className="h-4 w-4" />
                                    Code: <span className="font-mono font-bold">{asset.code}</span>
                                </CardDescription>
                            </div>
                            {getStatusBadge(asset.status)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                    <MapPin className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Emplacement</p>
                                    <p className="font-medium">{asset.location}</p>
                                </div>
                            </div>
                            {asset.manufacturer && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fabricant</p>
                                        <p className="font-medium">{asset.manufacturer}</p>
                                    </div>
                                </div>
                            )}
                            {asset.model_number && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        <Tag className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Modèle</p>
                                        <p className="font-medium font-mono">{asset.model_number}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Activity className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Statut</p>
                                    <p className="font-medium capitalize">{asset.status || 'Non défini'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Créé le</p>
                                    <p className="font-medium">
                                        {asset.created_at
                                            ? new Date(asset.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })
                                            : 'Non disponible'
                                        }
                                    </p>
                                </div>
                            </div>
                            {asset.criticality && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Criticité</p>
                                        <Badge variant={
                                            asset.criticality === 'critical' ? 'destructive' :
                                                asset.criticality === 'high' ? 'default' : 'secondary'
                                        }>
                                            {asset.criticality}
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* QR Code */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            QR Code
                        </CardTitle>
                        <CardDescription>
                            Scannez pour accéder rapidement
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {asset.image_url ? (
                            <>
                                <div className="border rounded-lg p-4 bg-white">
                                    <img
                                        src={asset.image_url}
                                        alt={`QR Code pour ${asset.name}`}
                                        className="w-48 h-48 object-contain"
                                    />
                                </div>
                                <Button onClick={handleDownloadQR} className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    Télécharger le QR
                                </Button>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Aucun QR code disponible</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for detailed information */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                    <TabsTrigger value="overview">
                        <Package className="h-4 w-4 mr-1" />
                        Vue d'ensemble
                    </TabsTrigger>
                    {components.length > 0 && (
                        <TabsTrigger value="components">
                            <Wrench className="h-4 w-4 mr-1" />
                            Composants
                            <Badge variant="secondary" className="ml-1">{components.length}</Badge>
                        </TabsTrigger>
                    )}
                    {diagnosticsCount > 0 && (
                        <TabsTrigger value="diagnostics">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Diagnostics
                            <Badge variant="secondary" className="ml-1">{diagnosticsCount}</Badge>
                        </TabsTrigger>
                    )}
                    {subsystemsCount > 0 && (
                        <TabsTrigger value="subsystems">
                            <Settings className="h-4 w-4 mr-1" />
                            Sous-systèmes
                            <Badge variant="secondary" className="ml-1">{subsystemsCount}</Badge>
                        </TabsTrigger>
                    )}
                    {electricalCount > 0 && (
                        <TabsTrigger value="electrical">
                            <Zap className="h-4 w-4 mr-1" />
                            Électrique
                            <Badge variant="secondary" className="ml-1">{electricalCount}</Badge>
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Wrench className="h-4 w-4" />
                                    <span className="text-sm">Composants liés</span>
                                </div>
                                <p className="text-2xl font-bold">{components.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm">Codes diagnostics</span>
                                </div>
                                <p className="text-2xl font-bold">{diagnosticsCount}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Settings className="h-4 w-4" />
                                    <span className="text-sm">Sous-systèmes</span>
                                </div>
                                <p className="text-2xl font-bold">{subsystemsCount}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Zap className="h-4 w-4" />
                                    <span className="text-sm">Composants électriques</span>
                                </div>
                                <p className="text-2xl font-bold">{electricalCount}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Specifications */}
                    {asset.specifications && Object.keys(asset.specifications).length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="text-lg">Spécifications techniques</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(asset.specifications).map(([key, value]) => (
                                        <div key={key} className="flex justify-between p-2 bg-muted rounded">
                                            <span className="text-sm text-muted-foreground capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="font-medium">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Components Tab */}
                {components.length > 0 && (
                    <TabsContent value="components" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Composants ({components.length})
                                </CardTitle>
                                <CardDescription>
                                    Sous-équipements et pièces de cet actif
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {components.map((comp, index) => (
                                        <div key={comp.id}>
                                            {index > 0 && <Separator className="my-3" />}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{comp.name}</p>
                                                    <p className="text-sm text-muted-foreground font-mono">
                                                        {comp.code}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3 inline mr-1" />
                                                        {comp.location}
                                                    </span>
                                                    {getStatusBadge(comp.status)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Diagnostics Tab */}
                {diagnosticsCount > 0 && (
                    <TabsContent value="diagnostics" className="mt-6">
                        <DiagnosticsTab diagnosticCodes={asset.diagnostic_codes as any} />
                    </TabsContent>
                )}

                {/* Subsystems Tab */}
                {subsystemsCount > 0 && (
                    <TabsContent value="subsystems" className="mt-6">
                        <SubsystemsTab subsystems={asset.integrated_subsystems as any} />
                    </TabsContent>
                )}

                {/* Electrical Tab */}
                {electricalCount > 0 && (
                    <TabsContent value="electrical" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5" />
                                    Composants électriques ({electricalCount})
                                </CardTitle>
                                <CardDescription>
                                    Contacteurs, relais, fusibles et autres
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-3 font-medium">Réf.</th>
                                                <th className="text-left py-2 px-3 font-medium">Nom</th>
                                                <th className="text-left py-2 px-3 font-medium">Type</th>
                                                <th className="text-left py-2 px-3 font-medium">Fonction</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {asset.electrical_components?.map((comp, i) => (
                                                <tr key={comp.id || i} className="border-b last:border-0">
                                                    <td className="py-2 px-3 font-mono font-medium">{comp.reference}</td>
                                                    <td className="py-2 px-3">{comp.name}</td>
                                                    <td className="py-2 px-3">
                                                        <Badge variant="outline">{comp.type}</Badge>
                                                    </td>
                                                    <td className="py-2 px-3 text-muted-foreground">{comp.function || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Actions */}
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push('/assets')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la liste
                </Button>
            </div>
        </div>
    )
}
