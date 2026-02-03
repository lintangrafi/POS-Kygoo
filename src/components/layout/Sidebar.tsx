'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    ShoppingCart,
    History,
    Settings,
    LogOut,
    Package,
    ClipboardList,
    FileText,
    Menu,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { logoutAction } from '@/actions/auth-actions';
import { useState } from 'react';

interface SidebarProps {
    role: 'CASHIER' | 'ADMIN' | 'SUPERADMIN';
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const links = [
        {
            href: '/dashboard',
            label: 'Overview',
            icon: LayoutDashboard,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/pos',
            label: 'Point of Sale',
            icon: ShoppingCart,
            roles: ['CASHIER', 'SUPERADMIN'],
        },
        {
            href: '/shift',
            label: 'Shift Management',
            icon: History,
            roles: ['CASHIER', 'SUPERADMIN'],
        },
        {
            href: '/inventory',
            label: 'Inventory',
            icon: Package,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/reports',
            label: 'Reports',
            icon: ClipboardList,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/invoices',
            label: 'Invoices',
            icon: FileText,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/settings',
            label: 'Settings',
            icon: Settings,
            roles: ['SUPERADMIN'],
        },
    ];

    const filteredLinks = links.filter((link) => link.roles.includes(role));

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="bg-background shadow-md"
                >
                    {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
            </div>

            {/* Sidebar */}
            <div className={cn(
                "fixed lg:static inset-y-0 left-0 z-40 flex flex-col h-full bg-card text-cardforeground border-r transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
            <div className="p-6 flex items-center gap-2 font-bold text-xl">
                <div className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-sm transform rotate-3">K</div>
                <span className={cn(isCollapsed ? "hidden" : "")}>Kygoo Studio</span>

                {/* Collapse Toggle */}
                <div className="ml-auto hidden lg:flex">
                    <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            <div className="flex-1 px-4 space-y-2">
                {filteredLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname.startsWith(link.href);

                    return (
                        <Link key={link.href} href={link.href} className="block">
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    "w-full",
                                    isCollapsed ? "justify-center" : "justify-start gap-3",
                                    isActive ? "font-semibold" : "text-muted-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span className={cn(isCollapsed ? "hidden" : "inline")}>{link.label}</span>
                            </Button>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t">
                <form action={logoutAction} className="flex items-center gap-3">
                    <Button variant="outline" className={cn("w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200", isCollapsed ? "justify-center" : "")}>
                        <LogOut className="w-4 h-4" />
                        <span className={cn(isCollapsed ? "hidden" : "inline")}>Sign Out</span>
                    </Button>
                </form>
            </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
            <div 
                className="lg:hidden fixed inset-0 bg-black/50 z-30"
                onClick={() => setIsMobileMenuOpen(false)}
            />
        )}
        </>
    );
}
