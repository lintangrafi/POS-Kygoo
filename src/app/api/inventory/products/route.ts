import { NextResponse } from 'next/server';
import { getProductsPublic } from '@/actions/inventory-actions';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isMenu = url.searchParams.get('isMenu');
    const res = await getProductsPublic({ isMenuItem: isMenu === 'true' ? true : isMenu === 'false' ? false : undefined });
    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 400 });
  }
}
