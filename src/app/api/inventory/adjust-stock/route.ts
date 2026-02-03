import { NextResponse } from 'next/server';
import { adjustStock } from '@/actions/inventory-actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await adjustStock(body);
    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 400 });
  }
}
