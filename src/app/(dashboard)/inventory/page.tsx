import { getMenuItems, getStockAdjustments } from '@/actions/inventory-actions';
import ProductFormClient from '@/components/inventory/ProductFormClient';
import StockAdjustClient from '@/components/inventory/StockAdjustClient';
import ToggleMenuItemButton from '@/components/inventory/ToggleMenuItemButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function InventoryPage({ searchParams }: { searchParams?: { tab?: string } }) {
    const sp = (await searchParams) || {};
    const tab = (sp.tab as 'menu' | 'stock') || 'menu';

    const menuItems = await getMenuItems();
    const adjustments = await getStockAdjustments({ limit: 100 });

    return (
        <div className="rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-[#1F1D1A]">Inventory</h1>
                    <p className="mt-1 text-sm text-[#6F6659]">Kelola produk, kategori, dan stok adjustment dengan lane data yang rapi.</p>
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
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {menuItems.slice(0, 12).map((product: any) => (
                                        <TableRow key={`menu-item-${product.id}`}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{product.category?.name || '-'}</TableCell>
                                            <TableCell>{formatRupiah(Number(product.price))}</TableCell>
                                            <TableCell>{product.stock}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-[#DCCFBF] bg-[#F8F3EA] text-[#5A5348]">
                                                    {product.stock <= 10 ? 'Low' : product.isMenuItem ? 'Menu' : 'Stock'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="inline-flex gap-2">
                                                    <ProductFormClient product={product} mode="edit" />
                                                    <ToggleMenuItemButton
                                                        productId={product.id}
                                                        currentStatus={product.isMenuItem}
                                                        productName={product.name}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
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
