'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { Footer } from './footer';

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:fixed lg:inset-y-0 lg:z-50 lg:w-[260px]">
                <Sidebar />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:ml-[260px]">
                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 bg-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <Footer />
            </div>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
