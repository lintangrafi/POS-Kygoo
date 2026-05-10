import { Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Both are cached with React.cache() — no redundant DB calls
    const [session, userEventId] = await Promise.all([
        verifySession(),
        getCurrentUserEventId(),
    ]);
    const isEventScopedAdmin = session.role === 'ADMIN' && !!userEventId;

    return (
        <div className="relative flex min-h-[100dvh] w-full bg-[#F5F1E8]">
            <Sidebar role={session.role} isEventScopedAdmin={isEventScopedAdmin} />
            <main className="relative z-10 flex-1 overflow-auto lg:ml-0">
                <div className="mx-auto w-full max-w-[1480px] p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E6DED0] border-t-[#C86B2A]" />
                                <p className="text-sm text-[#6F6659] animate-pulse">Loading...</p>
                            </div>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
