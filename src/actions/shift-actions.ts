'use server';

import { db } from '@/db';
import { shifts } from '@/db/schema';
import { verifySession } from '@/lib/auth';
import { desc, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getOpenShift() {
    // Global open shift for the whole system (not per-user)
    await verifySession(); // ensure user is authenticated

    const openShift = await db.query.shifts.findFirst({
        where: eq(shifts.status, 'OPEN'),
        orderBy: [desc(shifts.startTime)],
        with: { user: true },
    });

    return openShift;
}

export async function getLastShift() {
    const session = await verifySession();

    const lastShift = await db.query.shifts.findFirst({
        where: eq(shifts.userId, session.userId),
        orderBy: [desc(shifts.startTime)],
    });

    return lastShift;
}

export async function openShiftAction(prevState: any, formData: FormData) {
    const session = await verifySession();
    const initialCash = parseFloat(formData.get('initialCash') as string) || 0;

    try {
        // Check if already open
        const existingShift = await getOpenShift();
        if (existingShift) {
            return { error: 'You already have an open shift.' };
        }

        await db.insert(shifts).values({
            userId: session.userId,
            initialCash: initialCash.toString(),
            status: 'OPEN',
            startTime: new Date(),
        });

        revalidatePath('/shift');
        revalidatePath('/pos');
        return { success: true };
    } catch (error) {
        console.error('Open shift error:', error);
        return { error: 'Failed to open shift.' };
    }
}

export async function closeShiftAction(prevState: any, formData: FormData) {
    const session = await verifySession();
    const reportedCash = parseFloat(formData.get('reportedCash') as string) || 0; // The cash they count physically

    try {
        const activeShift = await getOpenShift();
        if (!activeShift) {
            return { error: 'No active shift found.' };
        }

        await db.update(shifts)
            .set({
                endTime: new Date(),
                status: 'CLOSED',
                totalCashReceived: reportedCash.toString(), // store the reported cash in the shift
            })
            .where(eq(shifts.id, activeShift.id));

        revalidatePath('/shift');
        revalidatePath('/pos');
        return { success: true };
    } catch (error) {
        console.error('Close shift error:', error);
        return { error: 'Failed to close shift.' };
    }
}
