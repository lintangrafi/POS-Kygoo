import { NextRequest } from 'next/server';
import { toggleMenuItem } from '@/actions/inventory-actions';
import { verifySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id, isMenuItem } = await req.json();
        
        if (typeof id !== 'number' || typeof isMenuItem !== 'boolean') {
            return Response.json({ success: false, error: 'Invalid input' }, { status: 400 });
        }

        const result = await toggleMenuItem(id, isMenuItem);
        
        return Response.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Toggle menu item error:', error);
        return Response.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}