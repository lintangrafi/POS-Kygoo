import { NextRequest } from 'next/server';
import { deleteProduct } from '@/actions/inventory-actions';
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

        const result = await deleteProduct(id);
        
        return Response.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Delete product error:', error);
        const msg = error?.message || 'Internal server error';
        // Treat known business/validation errors as 400 (bad request)
        const badRequest = typeof msg === 'string' && (msg.includes('cannot be deleted') || msg.includes('not found') || msg.includes('Invalid input'));
        return Response.json({ success: false, error: msg }, { status: badRequest ? 400 : 500 });
    }
}