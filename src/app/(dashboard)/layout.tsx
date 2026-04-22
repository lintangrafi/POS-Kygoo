import { Sidebar } from '@/components/layout/Sidebar';
import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await verifySession();
    const userEventId = await getCurrentUserEventId();
    const isEventScopedAdmin = session.role === 'ADMIN' && !!userEventId;

    return (
        <div className="relative flex min-h-[100dvh] w-full bg-[#F5F1E8]">
            <Sidebar role={session.role} isEventScopedAdmin={isEventScopedAdmin} />
            <main className="relative z-10 flex-1 overflow-auto lg:ml-0">
                <div className="mx-auto w-full max-w-[1480px] p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
