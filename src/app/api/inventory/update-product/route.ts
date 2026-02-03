import { NextResponse } from 'next/server';
import { updateProduct } from '@/actions/inventory-actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, ...payload } = body;
    const p = await updateProduct(Number(id), payload);
    return NextResponse.json({ success: true, product: p });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 400 });
  }
}
