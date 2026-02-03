import { NextRequest } from 'next/server';
import { archiveProduct } from '@/actions/inventory-actions';
import { verifySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        if (typeof id !== 'number') {
            return Response.json({ success: false, error: 'Invalid input' }, { status: 400 });
        }

        const result = await archiveProduct(id);
        return Response.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Archive product error:', error);
        const msg = error?.message || 'Internal server error';
        const badRequest = typeof msg === 'string' && (msg.includes('not found') || msg.includes('Invalid input'));
        return Response.json({ success: false, error: msg }, { status: badRequest ? 400 : 500 });
    }
}