import { NextResponse } from 'next/server';
import { getCategories } from '@/actions/inventory-actions';

export async function GET() {
  try {
    const res = await getCategories();
    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 400 });
  }
}
