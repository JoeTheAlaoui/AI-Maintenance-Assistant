'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isFeatureEnabled, type FeatureFlag } from '@/config/features'
import { createClient } from '@/lib/supabase/client'
import {
    Home,
    QrCode,
    MessageSquare,
    Package,
    Upload,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    User,
    Loader2
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Sidebar context for collapse state
const SidebarContext = createContext<{
    collapsed: boolean
    setCollapsed: (value: boolean) => void
}>({
    collapsed: false,
    setCollapsed: () => { }
})

export const useSidebar = () => useContext(SidebarContext)

interface NavItemConfig {
    href: string
    icon: React.ElementType
    label: string
    feature: FeatureFlag | null
    badge?: string
    section: 'main' | 'tools' | 'settings'
}

const navigationItems: NavItemConfig[] = [
    // Main
    {
        href: '/dashboard',
        icon: Home,
        label: 'Accueil',
        feature: null,
        section: 'main'
    },
    {
        href: '/assets',
        icon: Package,
        label: 'Équipements',
        feature: 'ASSET_LIST',
        section: 'main'
    },
    // Tools
    {
        href: '/scan',
        icon: QrCode,
        label: 'Scanner QR',
        feature: 'QR_SCANNING',
        section: 'tools'
    },
    {
        href: '/assistant',
        icon: MessageSquare,
        label: 'Assistant IA',
        feature: 'AI_ASSISTANT',
        badge: 'AI',
        section: 'tools'
    },
    {
        href: '/assets/import',
        icon: Upload,
        label: 'Importer',
        feature: 'AI_IMPORT',
        section: 'tools'
    },
    // Settings
    {
        href: '/settings',
        icon: Settings,
        label: 'Paramètres',
        feature: null,
        section: 'settings'
    },
]

function NavItem({ item, collapsed }: { item: NavItemConfig; collapsed: boolean }) {
    const pathname = usePathname()
    const Icon = item.icon
    const isActive = pathname === item.href ||
        (item.href !== '/dashboard' && pathname.startsWith(item.href))

    const content = (
        <Link
            href={item.href}
            className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative",
                isActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
        >
            <div className={cn(
                "flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110",
                collapsed ? "w-6 h-6" : "w-5 h-5"
            )}>
                <Icon className="w-full h-full" />
            </div>

            {!collapsed && (
                <>
                    <span className="flex-1 font-medium text-sm truncate">
                        {item.label}
                    </span>
                    {item.badge && (
                        <Badge
                            className={cn(
                                "text-[10px] px-1.5 py-0 h-5 font-semibold border-0",
                                isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                            )}
                        >
                            {item.badge}
                        </Badge>
                    )}
                </>
            )}

            {/* Active indicator dot for collapsed mode */}
            {collapsed && isActive && (
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
        </Link>
    )

    if (collapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.badge && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                            {item.badge}
                        </Badge>
                    )}
                </TooltipContent>
            </Tooltip>
        )
    }

    return content
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
    if (collapsed) return null
    return (
        <div className="px-3 py-2 mt-4 first:mt-0">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {label}
            </span>
        </div>
    )
}

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [user, setUser] = useState<{ name: string; email: string; initials: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    // Fetch user on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser()
                if (authUser) {
                    const metadata = authUser.user_metadata || {}
                    const name = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'User'
                    const email = authUser.email || ''
                    const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'
                    setUser({ name, email, initials })
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchUser()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Filter navigation items based on feature flags
    const enabledItems = navigationItems.filter(item =>
        item.feature === null || isFeatureEnabled(item.feature)
    )

    const mainItems = enabledItems.filter(i => i.section === 'main')
    const toolItems = enabledItems.filter(i => i.section === 'tools')
    const settingsItems = enabledItems.filter(i => i.section === 'settings')

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
            <TooltipProvider>
                <aside className={cn(
                    "h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out",
                    collapsed ? "w-[72px]" : "w-[240px]"
                )}>
                    {/* Logo */}
                    <div className={cn(
                        "h-16 border-b border-gray-200 dark:border-gray-800 flex items-center px-4",
                        collapsed ? "justify-center" : "justify-between"
                    )}>
                        <Link href="/dashboard" className="flex items-center gap-3 group">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            {!collapsed && (
                                <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">OpenGMAO</span>
                            )}
                        </Link>

                        {!collapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                onClick={() => setCollapsed(true)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {/* Main Section */}
                        <SectionLabel label="Principal" collapsed={collapsed} />
                        {mainItems.map(item => (
                            <NavItem key={item.href} item={item} collapsed={collapsed} />
                        ))}

                        {/* Tools Section */}
                        <SectionLabel label="Outils" collapsed={collapsed} />
                        {toolItems.map(item => (
                            <NavItem key={item.href} item={item} collapsed={collapsed} />
                        ))}

                        {/* Settings Section */}
                        <SectionLabel label="Configuration" collapsed={collapsed} />
                        {settingsItems.map(item => (
                            <NavItem key={item.href} item={item} collapsed={collapsed} />
                        ))}
                    </nav>

                    {/* Expand button (collapsed mode) */}
                    {collapsed && (
                        <div className="px-3 py-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-full h-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => setCollapsed(false)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* User section */}
                    <div className="border-t border-gray-200 dark:border-gray-800 p-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                                    collapsed && "justify-center"
                                )}>
                                    <Avatar className="h-9 w-9 border-2 border-gray-200 dark:border-gray-700">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : user?.initials || 'U'}
                                        </AvatarFallback>
                                    </Avatar>

                                    {!collapsed && (
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-50">
                                                {loading ? '...' : user?.name || 'User'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {loading ? '' : user?.email?.split('@')[0] || ''}
                                            </p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={collapsed ? "center" : "start"} className="w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-lg">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-semibold">{user?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        Profil
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Déconnexion
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>
            </TooltipProvider>
        </SidebarContext.Provider>
    )
}
