'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isFeatureEnabled, type FeatureFlag } from '@/config/features'
import {
    Home,
    QrCode,
    MessageSquare,
    Package,
    Sparkles,
    Settings,
    LogOut,
    Zap,
    ChevronRight,
    TrendingUp
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface NavItemConfig {
    href: string
    icon: React.ElementType
    label: string
    feature: FeatureFlag | null
    badge?: string
    badgeVariant?: 'default' | 'success'
    description?: string
    highlight?: boolean
}

const navigationItems: NavItemConfig[] = [
    {
        href: '/dashboard',
        icon: Home,
        label: 'Home',
        feature: null,
        description: 'Dashboard'
    },
    {
        href: '/scan',
        icon: QrCode,
        label: 'Scan QR',
        feature: 'QR_SCANNING',
        badge: 'Start',
        badgeVariant: 'success',
        description: 'Scan equipment'
    },
    {
        href: '/assistant',
        icon: MessageSquare,
        label: 'AI Assistant',
        feature: 'AI_ASSISTANT',
        badge: 'AI',
        badgeVariant: 'default',
        description: 'Chat with expert',
        highlight: true
    },
    {
        href: '/assets',
        icon: Package,
        label: 'Equipment',
        feature: 'ASSET_LIST',
        description: 'Browse assets'
    },
    {
        href: '/assets/import',
        icon: Sparkles,
        label: 'Import Manual',
        feature: 'AI_IMPORT',
        description: 'Upload PDF'
    },
]

export function Sidebar() {
    const pathname = usePathname()

    const handleLogout = async () => {
        window.location.href = '/login'
    }

    // Filter navigation items based on feature flags
    const enabledItems = navigationItems.filter(item =>
        item.feature === null || isFeatureEnabled(item.feature)
    )

    return (
        <aside className="w-[260px] h-screen bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col">
            {/* ===== LOGO ===== */}
            <div className="p-6 border-b border-gray-200">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    {/* Logo Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-blue-500 bg-[length:200%_auto] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        <Zap className="h-6 w-6 text-white" />
                    </div>

                    {/* Brand Text */}
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">OpenGMAO</h1>
                        <p className="text-xs text-gray-500">AI Maintenance</p>
                    </div>
                </Link>
            </div>

            {/* ===== NAVIGATION ===== */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
                {enabledItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                                    : item.highlight
                                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100"
                                        : "text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            {/* Icon Container */}
                            <div className={cn(
                                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                isActive
                                    ? "bg-white/20"
                                    : item.highlight
                                        ? "bg-white shadow-sm"
                                        : "bg-transparent group-hover:bg-gray-200"
                            )}>
                                <Icon className={cn(
                                    "h-5 w-5 transition-transform group-hover:scale-110",
                                    isActive
                                        ? "text-white"
                                        : item.highlight
                                            ? "text-blue-600"
                                            : "text-gray-600"
                                )} />
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm truncate">
                                        {item.label}
                                    </span>

                                    {item.badge && (
                                        <Badge
                                            className={cn(
                                                "text-[10px] px-1.5 py-0 h-5 font-bold border-0",
                                                item.badgeVariant === 'success'
                                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                                    : "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                            )}
                                        >
                                            {item.badge}
                                        </Badge>
                                    )}
                                </div>

                                {item.description && (
                                    <p className={cn(
                                        "text-xs truncate",
                                        isActive ? "text-white/80" : "text-gray-500"
                                    )}>
                                        {item.description}
                                    </p>
                                )}
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                                <ChevronRight className="h-4 w-4 text-white flex-shrink-0" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* ===== COMING SOON CARD ===== */}
            <div className="p-4">
                <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-xl">
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 animate-shimmer" />

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-grid opacity-10" />

                    {/* Content */}
                    <div className="relative space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-sm font-bold text-white">Coming Soon</p>
                        </div>

                        <p className="text-xs text-white/90 leading-relaxed">
                            Work Orders, Inventory, Preventive Maintenance
                        </p>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-white/80">
                                <span>Development</span>
                                <span>30%</span>
                            </div>
                            <Progress value={30} className="h-1.5 bg-white/20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== FOOTER ===== */}
            <div className="border-t border-gray-200 p-3 space-y-2">
                {/* User Profile */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
                    <Avatar className="h-9 w-9 border-2 border-blue-200 group-hover:border-blue-300 transition-colors">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                            EY
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">Engineer Youssef</p>
                        <p className="text-xs text-gray-500 truncate">OFPPT</p>
                    </div>
                </div>

                {/* Settings & Logout */}
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        href="/settings"
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-sm font-medium"
                    >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors text-sm font-medium"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    )
}
