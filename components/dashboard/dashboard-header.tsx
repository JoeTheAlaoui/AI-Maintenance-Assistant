'use client'

import { usePathname } from 'next/navigation'
import { Moon, Sun, User, ChevronRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function DashboardHeader() {
    const pathname = usePathname()
    const { theme, setTheme } = useTheme()

    const getBreadcrumbs = () => {
        const segments = pathname.split('/').filter(Boolean)
        const breadcrumbs = segments.map((segment, index) => {
            const href = '/' + segments.slice(0, index + 1).join('/')
            const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
            return { href, label }
        })
        return breadcrumbs
    }

    const breadcrumbs = getBreadcrumbs()

    return (
        <header className="h-16 border-b bg-background sticky top-0 z-40">
            <div className="flex h-full items-center justify-between px-6">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Home</span>
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.href} className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className={index === breadcrumbs.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                                {crumb.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Right Section: Theme Toggle + User Menu */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="h-9 w-9"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 gap-2 px-2">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        EY
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium hidden md:inline">Engineer Youssef</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Engineer Youssef</span>
                                    <span className="text-xs text-muted-foreground">technician@opengmao.com</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.location.href = '/login'}>
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
