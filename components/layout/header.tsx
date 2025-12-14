'use client';

import { Search, Bell, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Header() {
    const pathname = usePathname();

    // Generate breadcrumb from pathname
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
        { name: 'Home', href: '/dashboard' },
        ...pathSegments.filter(s => s !== 'dashboard').map((segment, index) => ({
            name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
            href: '/' + pathSegments.slice(0, index + 1).join('/'),
        })),
    ];

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-6">
                {/* Left: Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.href} className="flex items-center gap-2">
                            {index > 0 && (
                                <span className="text-gray-400">›</span>
                            )}
                            <Link
                                href={crumb.href}
                                className={
                                    index === breadcrumbs.length - 1
                                        ? "font-semibold text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }
                            >
                                {crumb.name}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Mobile: Logo */}
                <div className="md:hidden">
                    <span className="font-bold text-lg">OpenGMAO</span>
                </div>

                {/* Center: Search */}
                <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search equipment, diagnostics..."
                            className="pl-10 pr-20 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors rounded-xl"
                        />
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 bg-white px-1.5 font-mono text-[10px] font-medium text-gray-600">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Search (Mobile) */}
                    <Button variant="ghost" size="icon" className="lg:hidden rounded-full">
                        <Search className="h-5 w-5" />
                    </Button>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="rounded-full relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 px-2">
                                <Avatar className="h-8 w-8 border-2 border-blue-200">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                        EY
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden xl:block text-left">
                                    <p className="text-sm font-semibold">Engineer Youssef</p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">Engineer Youssef</p>
                                    <p className="text-xs text-gray-500">youssef@ofppt.ma</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>Settings</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
