import { NextResponse } from 'next/server';
import { addProduct } from '@/actions/inventory-actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = await addProduct(body);
    return NextResponse.json({ success: true, product: p });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 400 });
  }
}
