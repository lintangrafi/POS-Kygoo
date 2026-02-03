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
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                <p className="text-muted-foreground">Manage your products and stock levels.</p>
            </div>

            <div className="flex gap-2">
                <a href="?tab=menu" className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${tab === 'menu' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'}`}>Menu (POS)</a>
                <a href="?tab=stock" className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${tab === 'stock' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'}`}>Stock Opname</a>
            </div>

            {tab === 'menu' ? (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Menu Items</CardTitle>
                            <CardDescription>Products shown in POS (Menu).</CardDescription>
                        </div>
                        <ProductFormClient mode="add" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Cost (HPP)</TableHead>
                                    <TableHead>Stock</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {menuItems.map((product: any) => (
                                    <TableRow key={`menu-item-${product.id}`}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.category?.name}</TableCell>
                                        <TableCell>{formatRupiah(Number(product.price))}</TableCell>
                                        <TableCell>{formatRupiah(Number(product.costPrice))}</TableCell>
                                        <TableCell>
                                            <span className={product.stock <= 10 ? "text-red-500 font-bold" : ""}>
                                                {product.stock}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
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
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Stock Adjustments</CardTitle>
                            <CardDescription>History of stock opname and manual adjustments.</CardDescription>
                        </div>
                        <StockAdjustClient />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Change</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {adjustments.map((a: any) => (
                                    <TableRow key={`adjustment-${a.id}`}>
                                        <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                                        <TableCell>{a.product?.name || 'Unknown'}</TableCell>
                                        <TableCell>{a.user?.name || 'Unknown'}</TableCell>
                                        <TableCell className={a.change < 0 ? 'text-red-500' : 'text-green-600'}>{a.change}</TableCell>
                                        <TableCell>{a.type}</TableCell>
                                        <TableCell>{a.reason}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
