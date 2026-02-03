import { Sidebar } from '@/components/layout/Sidebar';
import { verifySession } from '@/lib/auth';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await verifySession();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <Sidebar role={session.role} />
            <main className="flex-1 overflow-auto lg:ml-0">
                <div className="p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
