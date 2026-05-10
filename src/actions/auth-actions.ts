'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { createSession, deleteSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Please enter both email and password.' };
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            return { error: 'Invalid credentials.' };
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) {
            return { error: 'Invalid credentials.' };
        }

        // Store eventId in JWT so we don't need a DB query on every page load
        await createSession({
            userId: user.id,
            name: user.name,
            role: user.role,
            eventId: user.eventId ?? null,
        });

    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Something went wrong.' };
    }

    redirect('/');
}

export async function logoutAction() {
    await deleteSession();
    redirect('/login');
}
