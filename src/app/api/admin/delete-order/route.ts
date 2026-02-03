import { NextResponse } from 'next/server';
import { deleteOrder } from '@/actions/admin-actions';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const id = Number(body.id);
        const result = await deleteOrder(id);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Error' }, { status: 400 });
    }
}