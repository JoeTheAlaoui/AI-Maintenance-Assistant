'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Header() {
    const pathname = usePathname();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = resolvedTheme === 'dark';

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
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between h-16 px-6">
                {/* Left: Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.href} className="flex items-center gap-2">
                            {index > 0 && (
                                <span className="text-gray-400 dark:text-gray-500">›</span>
                            )}
                            <Link
                                href={crumb.href}
                                className={
                                    index === breadcrumbs.length - 1
                                        ? "font-semibold text-gray-900 dark:text-gray-50"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }
                            >
                                {crumb.name}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Mobile: Logo */}
                <div className="md:hidden">
                    <span className="font-bold text-lg text-gray-900 dark:text-gray-50">OpenGMAO</span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Dark Mode Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    >
                        {mounted && isDark ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>
        </header>
    );
}
