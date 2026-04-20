'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    bulkAssignEvent,
    createEvent,
    deleteEvent,
    updateEvent,
} from '@/actions/event-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type EventItem = {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    notes: string | null;
    isActive: boolean;
    revenueShareType?: 'PERCENTAGE' | 'FIXED';
    organizerSharePercent?: number;
    studioSharePercent?: number;
    organizerShareFixed?: number;
    studioShareFixed?: number;
};

function toInputDate(date: string) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toDisplayDate(date: string) {
    return new Date(date).toLocaleDateString('id-ID');
}

export function EventManagement({ events }: { events: EventItem[] }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
    const [revenueShareType, setRevenueShareType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

    const [bulkEventId, setBulkEventId] = useState('');
    const [bulkFrom, setBulkFrom] = useState('');
    const [bulkTo, setBulkTo] = useState('');
    const [includeOrders, setIncludeOrders] = useState(true);
    const [includeExpenses, setIncludeExpenses] = useState(true);
    const [includeIncomes, setIncludeIncomes] = useState(true);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
        [events]
    );

    const activeNow = useMemo(() => {
        const now = new Date();
        return sortedEvents.find((event) => {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            return event.isActive && start <= now && end >= now;
        });
    }, [sortedEvents]);

    const openCreateModal = () => {
        setEditingEvent(null);
        setRevenueShareType('PERCENTAGE');
        setIsModalOpen(true);
    };

    const openEditModal = (event: EventItem) => {
        setEditingEvent(event);
        setRevenueShareType((event.revenueShareType || 'PERCENTAGE') as 'PERCENTAGE' | 'FIXED');
        setIsModalOpen(true);
    };

    const handleSubmitEvent = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const revenueShareType = String(formData.get('revenueShareType') || 'PERCENTAGE');
        
        const payload: any = {
            name: String(formData.get('name') || '').trim(),
            startDate: new Date(String(formData.get('startDate') || '')),
            endDate: new Date(String(formData.get('endDate') || '')),
            notes: String(formData.get('notes') || '').trim(),
            isActive: formData.get('isActive') === 'on',
            revenueShareType: revenueShareType as 'PERCENTAGE' | 'FIXED',
        };

        if (revenueShareType === 'PERCENTAGE') {
            const organizerPercent = formData.get('organizerSharePercent');
            if (organizerPercent) payload.organizerSharePercent = Number(organizerPercent);
        } else {
            const organizerFixed = formData.get('organizerShareFixed');
            if (organizerFixed) payload.organizerShareFixed = Number(organizerFixed);
        }

        if (!payload.name) {
            alert('Event name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingEvent) {
                await updateEvent(editingEvent.id, payload);
            } else {
                await createEvent(payload);
            }
            setIsModalOpen(false);
            setEditingEvent(null);
            router.refresh();
        } catch (error: any) {
            const message = String(error?.message || 'Failed to save event');
            if (message.toLowerCase().includes('server components render')) {
                alert('Gagal menyimpan event. Kemungkinan migration event belum diterapkan di database production.');
            } else {
                alert(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete event ${name}?`)) return;

        setIsSubmitting(true);
        try {
            await deleteEvent(id);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Failed to delete event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!bulkEventId || !bulkFrom || !bulkTo) {
            alert('Please choose event and date range for bulk assign');
            return;
        }

        if (!includeOrders && !includeExpenses && !includeIncomes) {
            alert('Select at least one target: orders, expenses, or incomes');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await bulkAssignEvent({
                eventId: Number(bulkEventId),
                from: new Date(bulkFrom),
                to: new Date(bulkTo),
                includeOrders,
                includeExpenses,
                includeIncomes,
            });

            alert(
                `Bulk assign completed. Orders: ${result.orderCount}, Expenses: ${result.expenseCount}, Incomes: ${result.incomeCount}`
            );
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Bulk assign failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#1F1D1A]">Event Management</h1>
                    <p className="text-sm text-[#6F6659]">Kelola event dan pastikan laporan tidak tercampur antar event.</p>
                </div>
                <Button className="bg-[#C86B2A] text-white hover:bg-[#B25E24]" onClick={openCreateModal} disabled={isSubmitting}>
                    + Add Event
                </Button>
            </div>

            <Card className="border-[#E6DED0] bg-white">
                <CardHeader>
                    <CardTitle>Active Event</CardTitle>
                    <CardDescription>Event aktif otomatis terpilih pada POS checkout.</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeNow ? (
                        <div className="rounded-lg border border-[#E6DED0] bg-[#F8F3EA] p-3">
                            <p className="text-base font-semibold text-[#1F1D1A]">{activeNow.name}</p>
                            <p className="text-sm text-[#6F6659]">
                                {toDisplayDate(activeNow.startDate)} - {toDisplayDate(activeNow.endDate)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-[#6F6659]">No active event right now.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-[#E6DED0] bg-white">
                <CardHeader>
                    <CardTitle>Events</CardTitle>
                    <CardDescription>Event aktif boleh overlap tanggal. Pilih event saat transaksi jika diperlukan.</CardDescription>
                </CardHeader>
                <CardContent>
                    {sortedEvents.length === 0 ? (
                        <p className="text-sm text-[#6F6659]">No events created yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedEvents.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.name}</TableCell>
                                        <TableCell>
                                            {toDisplayDate(event.startDate)} - {toDisplayDate(event.endDate)}
                                        </TableCell>
                                        <TableCell>{event.isActive ? 'ACTIVE' : 'INACTIVE'}</TableCell>
                                        <TableCell>{event.notes || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEditModal(event)} disabled={isSubmitting}>
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-[#EBC6C0] text-[#B33D2A] hover:bg-[#FFF1EF]"
                                                    onClick={() => handleDelete(event.id, event.name)}
                                                    disabled={isSubmitting}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border-[#E6DED0] bg-white">
                <CardHeader>
                    <CardTitle>Bulk Assign Historical Data</CardTitle>
                    <CardDescription>Assign event ke data historis berdasarkan rentang tanggal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <Label htmlFor="bulkEvent">Event</Label>
                            <select
                                id="bulkEvent"
                                value={bulkEventId}
                                onChange={(e) => setBulkEventId(e.target.value)}
                                className="mt-1 block h-10 w-full rounded-md border border-[#DCCFBF] bg-white px-3"
                            >
                                <option value="">Select event</option>
                                {sortedEvents.map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="bulkFrom">From</Label>
                            <Input id="bulkFrom" type="date" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="bulkTo">To</Label>
                            <Input id="bulkTo" type="date" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={includeOrders} onChange={(e) => setIncludeOrders(e.target.checked)} />
                            Orders
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={includeExpenses} onChange={(e) => setIncludeExpenses(e.target.checked)} />
                            Expenses
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={includeIncomes} onChange={(e) => setIncludeIncomes(e.target.checked)} />
                            Incomes
                        </label>
                    </div>

                    <Button className="bg-[#1F1D1A] text-white hover:bg-[#2A2722]" onClick={handleBulkAssign} disabled={isSubmitting}>
                        Apply Bulk Assign
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
                        <DialogDescription>
                            Event aktif boleh overlap dengan event aktif lain pada tanggal yang sama.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitEvent} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Event Name</Label>
                            <Input id="name" name="name" defaultValue={editingEvent?.name || ''} required />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    defaultValue={editingEvent ? toInputDate(editingEvent.startDate) : ''}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    defaultValue={editingEvent ? toInputDate(editingEvent.endDate) : ''}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <textarea
                                id="notes"
                                name="notes"
                                defaultValue={editingEvent?.notes || ''}
                                rows={3}
                                className="mt-1 w-full rounded-md border border-[#DCCFBF] bg-white px-3 py-2"
                            />
                        </div>

                        {/* Revenue Sharing Section */}
                        <div className="space-y-3 rounded-lg border border-[#E6DED0] bg-[#FFF8F0] p-3">
                            <h4 className="text-sm font-semibold text-[#1F1D1A]">Pembagian Hasil</h4>
                            
                            <div>
                                <Label htmlFor="revenueShareType">Tipe Pembagian</Label>
                                <select
                                    id="revenueShareType"
                                    name="revenueShareType"
                                    value={revenueShareType}
                                    onChange={(e) => setRevenueShareType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                                    className="mt-1 w-full rounded-md border border-[#DCCFBF] bg-white px-3 py-2 text-sm"
                                >
                                    <option value="PERCENTAGE">Persentase (%)</option>
                                    <option value="FIXED">Nominal Tetap (Rp)</option>
                                </select>
                            </div>

                            {revenueShareType === 'PERCENTAGE' ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="organizerSharePercent">Penyelenggara (%)</Label>
                                        <Input
                                            id="organizerSharePercent"
                                            name="organizerSharePercent"
                                            type="number"
                                            step="0.01"
                                            defaultValue={editingEvent?.organizerSharePercent || ''}
                                            placeholder="e.g., 30"
                                        />
                                        <p className="mt-1 text-xs text-muted-foreground">Sisa otomatis masuk ke studio.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="organizerShareFixed">Penyelenggara (Rp)</Label>
                                        <Input
                                            id="organizerShareFixed"
                                            name="organizerShareFixed"
                                            type="number"
                                            step="100"
                                            defaultValue={editingEvent?.organizerShareFixed || ''}
                                            placeholder="e.g., 10000"
                                        />
                                        <p className="mt-1 text-xs text-muted-foreground">Sisa otomatis masuk ke studio.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" name="isActive" defaultChecked={editingEvent ? editingEvent.isActive : true} />
                            Active
                        </label>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-[#C86B2A] text-white hover:bg-[#B25E24]" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
