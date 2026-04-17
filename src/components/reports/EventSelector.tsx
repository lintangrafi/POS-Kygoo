'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Event {
    id: number;
    name: string;
}

export function EventSelector({ events, currentEventId }: { events: Event[]; currentEventId?: number | null }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleEventChange = (eventId: string) => {
        const params = new URLSearchParams(searchParams);
        if (eventId) {
            params.set('eventId', eventId);
        } else {
            params.delete('eventId');
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <select
            onChange={(e) => handleEventChange(e.target.value)}
            defaultValue={currentEventId ? String(currentEventId) : ''}
            className="rounded-lg border px-3 py-1.5 text-sm bg-white border-[#C86B2A] text-[#1F1D1A] font-medium hover:bg-[#FFF8F0] transition"
        >
            <option value="">📅 Studio (No Event)</option>
            {events.map((event) => (
                <option key={event.id} value={String(event.id)}>
                    📅 {event.name}
                </option>
            ))}
        </select>
    );
}
