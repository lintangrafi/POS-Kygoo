import { NextResponse } from 'next/server';
import { getStockAdjustments } from '@/actions/inventory-actions';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    const limit = Number(url.searchParams.get('limit') || '100');
    const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : undefined;
    const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : undefined;
    const res = await getStockAdjustments({ productId: productId ? Number(productId) : undefined, limit, from, to });
    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 400 });
  }
}
