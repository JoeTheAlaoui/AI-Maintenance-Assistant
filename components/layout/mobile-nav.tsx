'use client';

import { Home, QrCode, MessageSquare, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Scan', href: '/scan', icon: QrCode },
    { name: 'AI', href: '/assistant', icon: MessageSquare },
    { name: 'Assets', href: '/assets', icon: Package },
    { name: 'Profil', href: '/settings', icon: User },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom shadow-2xl">
            <div className="grid grid-cols-5 gap-1 px-2 py-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                                    : "text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 transition-transform",
                                isActive && "scale-110"
                            )} />
                            <span className="text-[10px] font-semibold">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
