import { getEvents } from '@/actions/event-actions';
import { EventManagement } from '@/components/events/EventManagement';
import { verifySession } from '@/lib/auth';

export default async function EventsPage() {
    const session = await verifySession();
    if (session.role === 'CASHIER') {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    let rows: Awaited<ReturnType<typeof getEvents>> = [];
    let migrationNotice: string | null = null;
    try {
        rows = await getEvents();
    } catch (error) {
        console.error('[events/page] failed to load events', error);
        migrationNotice = 'Fitur event belum aktif di database production. Jalankan migration add_events_table_and_links.sql lalu redeploy.';
    }

    if (rows.length === 0 && !migrationNotice) {
        migrationNotice = 'Belum ada data event. Jika seharusnya ada, pastikan migration add_events_table_and_links.sql sudah dijalankan di production.';
    }

    const events = rows.map((event) => ({
        id: event.id,
        name: event.name,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        notes: event.notes,
        isActive: event.isActive,
        revenueShareType: (event.revenueShareType || 'PERCENTAGE') as 'PERCENTAGE' | 'FIXED',
        organizerSharePercent: event.organizerSharePercent ? Number(event.organizerSharePercent) : undefined,
        studioSharePercent: event.studioSharePercent ? Number(event.studioSharePercent) : undefined,
        organizerShareFixed: event.organizerShareFixed ? Number(event.organizerShareFixed) : undefined,
        studioShareFixed: event.studioShareFixed ? Number(event.studioShareFixed) : undefined,
    }));

    return (
        <div className="space-y-4">
            {migrationNotice && (
                <div className="rounded-md border border-[#F2C6C6] bg-[#FFF1F1] px-3 py-2 text-xs text-[#8B1A1A]">
                    {migrationNotice}
                </div>
            )}
            <EventManagement events={events} />
        </div>
    );
}
