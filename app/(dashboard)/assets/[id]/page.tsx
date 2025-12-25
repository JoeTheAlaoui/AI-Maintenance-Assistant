'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    ArrowLeft,
    Building,
    Tag,
    Calendar,
    FileText,
    MessageSquare,
    Package,
    QrCode,
    RefreshCw,
    ExternalLink,
    Sparkles,
    Link2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RAGChat, RAGChatRef } from '@/components/chat/rag-chat'
import { QRCodeGenerator } from '@/components/qr-code-generator'
import { DependencyManager } from '@/components/assets/dependency-manager'
import DocumentsTab from '@/components/assets/DocumentsTab'
import AliasManager from '@/components/assets/AliasManager' // 🆕 Alias management

interface Asset {
    id: string
    name: string
    code: string
    location: string | null
    status: string | null
    manufacturer: string | null
    model_number: string | null
    serial_number: string | null
    category: string | null
    created_at: string | null
}

interface AssetDocument {
    id: string
    file_name: string
    file_size: number | null
    processing_status: string | null
    total_chunks?: number | null
    created_at: string | null
    metadata?: {
        extraction_method?: 'native' | 'ocr'
        ocr_confidence?: number
        page_count?: number
    }
}

function StatusBadge({ status }: { status: string | null }) {
    const config: Record<string, { bg: string; text: string; label: string }> = {
        operational: { bg: 'bg-green-100', text: 'text-green-700', label: 'Opérationnel' },
        active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
        maintenance: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Maintenance' },
        broken: { bg: 'bg-red-100', text: 'text-red-700', label: 'Hors service' },
    }

    const c = config[status || ''] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status || 'Actif' }

    return (
        <Badge variant="secondary" className={`${c.bg} ${c.text}`}>
            {c.label}
        </Badge>
    )
}

export default function AssetDetailPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const assetId = params.id as string
    const defaultTab = searchParams.get('tab') || 'overview'

    const [asset, setAsset] = useState<Asset | null>(null)
    const [documents, setDocuments] = useState<AssetDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [organizationId, setOrganizationId] = useState<string>('')
    const chatRef = useRef<RAGChatRef>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const supabase = createClient()

                const { data: assetData, error: assetError } = await supabase
                    .from('assets')
                    .select('*')
                    .eq('id', assetId)
                    .single()

                if (assetError) throw assetError
                setAsset(assetData)

                const { data: docsData, error: docsError } = await supabase
                    .from('asset_documents')
                    .select('*')
                    .eq('asset_id', assetId)
                    .order('created_at', { ascending: false })

                console.log('Documents query result:', { docsData, docsError, assetId })
                setDocuments(docsData || [])

                // Get organization_id from user session
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.id) {
                    // Try to get organization_id from user metadata or set a default
                    const orgId = user.user_metadata?.organization_id || user.id
                    setOrganizationId(orgId)
                }
            } catch (err) {
                console.error('Error:', err)
                setError('Équipement non trouvé')
            } finally {
                setLoading(false)
            }
        }

        if (assetId) fetchData()
    }, [assetId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error || !asset) {
        return (
            <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">{error || 'Équipement non trouvé'}</h2>
                <Button onClick={() => router.push('/assets')} variant="outline">
                    Retour aux équipements
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link
                    href="/assets"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Équipements
                </Link>
                <StatusBadge status={asset.status} />
            </div>

            {/* Title */}
            <div>
                <h1 className="text-2xl font-bold">{asset.name}</h1>
            </div>

            {/* 2-Column Layout */}
            <div className="grid lg:grid-cols-5 gap-6">
                {/* Left Column (60%) */}
                <div className="lg:col-span-3 space-y-6">
                    <Tabs defaultValue={defaultTab}>
                        <TabsList>
                            <TabsTrigger value="overview">
                                <Package className="h-4 w-4 mr-1" />
                                Aperçu
                            </TabsTrigger>
                            <TabsTrigger value="documents">
                                <FileText className="h-4 w-4 mr-1" />
                                Documents
                                {documents.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{documents.length}</Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="qr">
                                <QrCode className="h-4 w-4 mr-1" />
                                QR Code
                            </TabsTrigger>
                            <TabsTrigger value="dependencies">
                                <Link2 className="h-4 w-4 mr-1" />
                                Dépendances
                            </TabsTrigger>
                            <TabsTrigger value="aliases">
                                <Tag className="h-4 w-4 mr-1" />
                                Alias
                            </TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="mt-4 space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                {asset.manufacturer && (
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <Building className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Fabricant</p>
                                                <p className="font-medium">{asset.manufacturer}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {asset.model_number && (
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <Tag className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Modèle</p>
                                                <p className="font-medium font-mono">{asset.model_number}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {asset.category && (
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Catégorie</p>
                                                <p className="font-medium">{asset.category}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {asset.serial_number && (
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <Tag className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">N° Série</p>
                                                <p className="font-medium font-mono">{asset.serial_number}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Créé le</p>
                                            <p className="font-medium">
                                                {asset.created_at
                                                    ? new Date(asset.created_at).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Documents Tab */}
                        <TabsContent value="documents" className="mt-4">
                            <DocumentsTab assetId={assetId} organizationId={organizationId} />
                        </TabsContent>

                        {/* QR Tab */}
                        <TabsContent value="qr" className="mt-4">
                            <Card>
                                <CardContent className="p-6 flex flex-col items-center">
                                    <QRCodeGenerator assetId={asset.id} assetName={asset.name} />
                                    <p className="text-sm text-gray-500 mt-4 text-center">
                                        Scannez ce code pour accéder rapidement à cet équipement
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Dependencies Tab */}
                        <TabsContent value="dependencies" className="mt-4">
                            <Card>
                                <CardContent className="p-6">
                                    <DependencyManager assetId={asset.id} assetName={asset.name} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 🆕 Aliases Tab */}
                        <TabsContent value="aliases" className="mt-4">
                            <AliasManager assetId={asset.id} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column - Chat (40%) */}
                <div className="lg:col-span-2">
                    <Card className="border-2 border-blue-100">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Assistant IA</CardTitle>
                                    <p className="text-xs text-gray-500">Posez vos questions</p>
                                </div>
                                <Badge className="ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs">
                                    RAG
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[400px]">
                                <RAGChat ref={chatRef} assetId={asset.id} assetName={asset.name} />
                            </div>

                            {/* Suggested Questions - Inside Card */}
                            <div className="p-4 border-t bg-gray-50 space-y-2">
                                <p className="text-xs font-medium text-gray-500">Questions suggérées :</p>
                                {[
                                    'Quels sont les intervalles de maintenance ?',
                                    'Comment résoudre un défaut ?',
                                    'Liste des pièces de rechange'
                                ].map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => chatRef.current?.sendMessage(q)}
                                        className="w-full text-left text-sm p-2 rounded-lg bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors border hover:border-blue-200 cursor-pointer"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
