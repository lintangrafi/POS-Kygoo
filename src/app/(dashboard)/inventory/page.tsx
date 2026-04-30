import { getMenuItems, getStockAdjustments } from '@/actions/inventory-actions';
import ProductFormClient from '@/components/inventory/ProductFormClient';
import StockAdjustClient from '@/components/inventory/StockAdjustClient';
import InventoryMenuTable from '@/components/inventory/InventoryMenuTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';
import { db } from '@/db';
import { Badge } from '@/components/ui/badge';

export default async function InventoryPage({ searchParams }: { searchParams?: { tab?: string } }) {
    const sp = (await searchParams) || {};
    const tab = (sp.tab as 'menu' | 'stock') || 'menu';

    const session = await verifySession();
    if (session.role === 'CASHIER') {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    const userEventId = await getCurrentUserEventId();
    if (session.role === 'ADMIN' && userEventId) {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    let userEvent = null;
    if (userEventId) {
        userEvent = await db.query.events.findFirst({
            where: (events, { eq }) => eq(events.id, userEventId),
            columns: { id: true, name: true },
        });
    }

    const menuItems = await getMenuItems();
    const adjustments = await getStockAdjustments({ limit: 100 });

    return (
        <div className="rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-[#1F1D1A]">Inventory</h1>
                    <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm text-[#6F6659]">Kelola produk, kategori, dan stok adjustment dengan lane data yang rapi.</p>
                        {userEvent && (
                            <Badge className="bg-[#D4AF9A] text-[#1F1D1A] border-[#C9A588] ml-2">
                                📍 {userEvent.name}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a href="?tab=menu" className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm ${tab === 'menu' ? 'bg-[#F8F3EA] border-[#DCCFBF] text-[#1F1D1A]' : 'bg-white border-[#E6DED0] text-[#6F6659]'}`}>Menu</a>
                    <a href="?tab=stock" className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm ${tab === 'stock' ? 'bg-[#F8F3EA] border-[#DCCFBF] text-[#1F1D1A]' : 'bg-white border-[#E6DED0] text-[#6F6659]'}`}>Stock Opname</a>
                    <ProductFormClient mode="add" />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <Card className="border-[#E6DED0] bg-white">
                    <CardContent className="p-4">
                        <InventoryMenuTable menuItems={menuItems} />
                    </CardContent>
                </Card>

                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-3xl leading-none">Stock Adjustment</CardTitle>
                        <CardDescription>Lakukan penyesuaian stok secara cepat.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <StockAdjustClient />
                        <div className="space-y-2">
                            {adjustments.slice(0, 6).map((a: any) => (
                                <div key={`adjustment-${a.id}`} className="rounded-lg border border-[#E6DED0] bg-[#FCFAF6] px-3 py-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-[#1F1D1A]">{a.product?.name || 'Unknown'}</span>
                                        <span className={a.change < 0 ? 'text-[#B6452C] font-semibold' : 'text-[#1D7A45] font-semibold'}>
                                            {a.change > 0 ? '+' : ''}{a.change}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#6F6659]">{new Date(a.createdAt).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
