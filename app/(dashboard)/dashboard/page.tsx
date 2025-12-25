import {
    QrCode,
    MessageSquare,
    Upload,
    Package,
    ArrowRight,
    Sparkles,
    Scan,
    BarChart3,
    Clock,
    Factory,
    GitBranch,
    Layers
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Time-based greeting
function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
}

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Fetch recent assets (equipment only for display)
    const { data: recentAssets } = await supabase
        .from('assets')
        .select('id, name, manufacturer, status, created_at, level')
        .or('level.is.null,level.eq.equipment')
        .order('created_at', { ascending: false })
        .limit(5)

    // Fetch hierarchical stats
    const { count: totalSites } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'site')

    const { count: totalLines } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'line')

    const { count: totalEquipment } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .or('level.is.null,level.eq.equipment')

    const { count: totalDocuments } = await supabase
        .from('asset_documents')
        .select('*', { count: 'exact', head: true })

    // Get user for greeting
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

    const greeting = getGreeting()

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-violet-600 p-8 text-white">
                <div className="absolute inset-0 bg-grid-white/10" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative">
                    <Badge className="bg-white/20 text-white border-0 mb-4">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI-Powered CMMS
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        {greeting}{userName ? `, ${userName}` : ''} ! 👋
                    </h1>
                    <p className="text-white/80 text-lg max-w-lg">
                        Gérez vos équipements et obtenez des réponses instantanées grâce à l'IA.
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Scan QR */}
                    <Link href="/scan">
                        <Card className="group cursor-pointer border-2 hover:border-green-300 hover:shadow-lg transition-all duration-200">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <QrCode className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Scanner QR</h3>
                                <p className="text-sm text-gray-500">Identifier un équipement instantanément</p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Ask AI */}
                    <Link href="/assistant">
                        <Card className="group cursor-pointer border-2 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <MessageSquare className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg">Assistant IA</h3>
                                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs">AI</Badge>
                                </div>
                                <p className="text-sm text-gray-500">Posez vos questions techniques</p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Import Manual */}
                    <Link href="/assets/import">
                        <Card className="group cursor-pointer border-2 hover:border-purple-300 hover:shadow-lg transition-all duration-200">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Importer Manuel</h3>
                                <p className="text-sm text-gray-500">Uploadez un PDF pour activer l'IA</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Hierarchy Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Sites */}
                <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-900 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Factory className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalSites || 0}</p>
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Sites</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lines */}
                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <GitBranch className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalLines || 0}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Lignes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Equipment */}
                <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-900 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                <Package className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totalEquipment || 0}</p>
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Équipements</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Documents */}
                <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-900 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                                <Scan className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalDocuments || 0}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Manuels</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Conversations */}
                <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-gray-900 border-pink-200 dark:border-pink-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                                <MessageSquare className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">0</p>
                                <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">Conversations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Assets */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Équipements récents</h2>
                    <Link href="/assets">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                            Voir tout
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {recentAssets && recentAssets.length > 0 ? (
                    <div className="space-y-2">
                        {recentAssets.map((asset) => (
                            <Link key={asset.id} href={`/assets/${asset.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{asset.name}</p>
                                                <p className="text-sm text-gray-500">{asset.manufacturer || 'Fabricant inconnu'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    asset.status === 'operational' || asset.status === 'active'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                        : asset.status === 'maintenance'
                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                                                }
                                            >
                                                {asset.status || 'Actif'}
                                            </Badge>
                                            <ArrowRight className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <Package className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="font-semibold mb-1">Aucun équipement</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Importez votre premier manuel PDF pour commencer
                            </p>
                            <Link href="/assets/import">
                                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Importer un manuel
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
