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

        // For initial Setup: If no users exist, allow creating Superadmin with specific credentials
        // ideally handled by seed, but good fallback or manual seed check
        if (!user) {
            return { error: 'Invalid credentials.' };
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) {
            return { error: 'Invalid credentials.' };
        }

        await createSession({
            userId: user.id,
            name: user.name,
            role: user.role,
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
