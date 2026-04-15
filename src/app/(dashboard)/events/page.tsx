import { getEvents } from '@/actions/event-actions';
import { EventManagement } from '@/components/events/EventManagement';
import { verifySession } from '@/lib/auth';

export default async function EventsPage() {
    const session = await verifySession();
    if (session.role === 'CASHIER') {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    const rows = await getEvents();
    const events = rows.map((event) => ({
        id: event.id,
        name: event.name,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        notes: event.notes,
        isActive: event.isActive,
    }));

    return <EventManagement events={events} />;
}
