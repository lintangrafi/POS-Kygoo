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
            roles: ['CASHIER', 'ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/shift',
            label: 'Shift Management',
            icon: History,
            roles: ['CASHIER', 'ADMIN', 'SUPERADMIN'],
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

    const isLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50 enter-fade-up">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="surface-glass border-border/70 shadow-md min-h-[44px] min-w-[44px]"
                >
                    {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
            </div>

            {/* Sidebar */}
            <div className={cn(
                "fixed lg:static inset-y-0 left-0 z-40 flex h-screen max-h-screen flex-col border-r border-[#2A2926] bg-[#1B1A18] text-[#F3EEE3] transition-all duration-300 ease-in-out overflow-y-auto",
                isCollapsed ? "w-16" : "w-64",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
            <div className="p-5 flex items-center gap-3 border-b border-[#2F2D2A]">
                <div className="h-8 w-8 rounded-lg bg-[#C86B2A] text-white flex items-center justify-center text-sm font-bold shadow-sm">K</div>
                <div className={cn("leading-tight", isCollapsed && "hidden")}>
                    <p className="text-sm font-semibold text-[#F7F2E9]">Kygoo Studio</p>
                    <p className="text-xs text-[#B8B0A3]">POS Console</p>
                </div>

                {/* Collapse Toggle */}
                <div className="ml-auto hidden lg:flex">
                    <Button variant="ghost" size="icon" className="text-[#B8B0A3] hover:text-[#F7F2E9] hover:bg-[#2A2825]" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            <div className="px-4 pb-2 pt-3">
                <p className={cn("px-2 text-xs font-medium uppercase tracking-[0.14em] text-[#B8B0A3]", isCollapsed && "hidden")}>
                    Navigasi
                </p>
            </div>

            <div className="flex-1 px-3 space-y-1.5">
                {filteredLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = isLinkActive(link.href);

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="block"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    "h-10 w-full rounded-lg transition-all duration-200",
                                    isCollapsed ? "justify-center" : "justify-start gap-3",
                                    isActive
                                        ? "bg-[#2A2825] text-[#F7F2E9] font-semibold shadow-sm"
                                        : "text-[#CEC6B7] hover:bg-[#242321] hover:text-[#F7F2E9]"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isActive ? "text-[#C86B2A]" : "text-[#B8B0A3]")} />
                                <span className={cn(isCollapsed ? "hidden" : "inline")}>{link.label}</span>
                            </Button>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-[#2F2D2A]">
                <form action={logoutAction} className="flex items-center gap-3">
                    <Button variant="outline" className={cn("w-full justify-start gap-3 border-[#3A3834] bg-transparent text-[#E6B2B2] hover:bg-[#2A2825] hover:text-[#F2CACA]", isCollapsed ? "justify-center" : "") }>
                        <LogOut className="w-4 h-4" />
                        <span className={cn(isCollapsed ? "hidden" : "inline")}>Sign Out</span>
                    </Button>
                </form>
            </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
            <div 
                className="lg:hidden fixed inset-0 bg-foreground/35 backdrop-blur-[1px] z-30"
                onClick={() => setIsMobileMenuOpen(false)}
            />
        )}
        </>
    );
}
