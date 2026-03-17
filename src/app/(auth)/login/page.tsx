'use client';

import { useActionState } from 'react';
import { loginAction } from '@/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const [state, action, isPending] = useActionState(loginAction, null);

    return (
        <div className="flex min-h-[100dvh] w-full">
            {/* Left — Brand Panel */}
            <div
                className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
                style={{ background: '#1F1D1A' }}
            >
                {/* Subtle warm gradient accent */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #C86B2A 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-8" style={{ background: 'radial-gradient(circle, #C86B2A 0%, transparent 70%)' }} />
                    {/* Grid dot texture */}
                    <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1.5" fill="#F5F1E8" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dots)" />
                    </svg>
                </div>

                {/* Logo */}
                <div className="relative flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                        style={{ background: '#C86B2A', color: '#F5F1E8' }}
                    >
                        K
                    </div>
                    <span className="text-sm font-semibold tracking-wide" style={{ color: '#D4C9B8' }}>
                        Kygoo Studio
                    </span>
                </div>

                {/* Hero Text */}
                <div className="relative space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#C86B2A' }}>
                        Point of Sale Console
                    </p>
                    <h1 className="text-4xl xl:text-5xl font-bold leading-[1.06] tracking-tight" style={{ color: '#F5F1E8' }}>
                        Kelola toko<br />dengan percaya<br />diri.
                    </h1>
                    <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#8A7F74' }}>
                        Pantau penjualan, kasir, stok, dan laporan keuangan — semua dalam satu dashboard terpadu.
                    </p>
                </div>

                {/* Footer */}
                <div className="relative">
                    <p className="text-xs" style={{ color: '#5A5047' }}>
                        POS Kygo V2 &nbsp;·&nbsp; © 2026 Kygoo Studio
                    </p>
                </div>
            </div>

            {/* Right — Form Panel */}
            <div
                className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12"
                style={{ background: '#F5F1E8' }}
            >
                {/* Mobile logo */}
                <div className="mb-10 flex items-center gap-3 lg:hidden">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                        style={{ background: '#C86B2A', color: '#F5F1E8' }}
                    >
                        K
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#1F1D1A' }}>Kygoo Studio</span>
                </div>

                <div className="w-full max-w-[380px]">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1F1D1A' }}>
                            Selamat datang kembali
                        </h2>
                        <p className="mt-1.5 text-sm" style={{ color: '#6B645C' }}>
                            Masuk ke akun Anda untuk melanjutkan
                        </p>
                    </div>

                    <form action={action} className="space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#3A342E' }}>
                                Email
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="user@kygoo.studio"
                                required
                                className="h-11 border-[#D6CFC4] bg-white text-[#1F1D1A] placeholder:text-[#A89F96] focus-visible:ring-[#C86B2A] focus-visible:border-[#C86B2A]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#3A342E' }}>
                                Password
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="h-11 border-[#D6CFC4] bg-white text-[#1F1D1A] focus-visible:ring-[#C86B2A] focus-visible:border-[#C86B2A]"
                            />
                        </div>

                        {state?.error && (
                            <div
                                className="rounded-lg border px-4 py-3 text-sm font-medium"
                                style={{ background: '#FFF0F0', borderColor: '#FFBDBD', color: '#8B1A1A' }}
                            >
                                {state.error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="mt-1 h-11 w-full text-sm font-semibold"
                            style={{ background: isPending ? '#A8562A' : '#C86B2A', color: '#F5F1E8' }}
                            disabled={isPending}
                        >
                            {isPending ? 'Memverifikasi...' : 'Masuk'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
