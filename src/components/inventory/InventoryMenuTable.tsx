'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRupiah } from '@/lib/utils';
import ProductFormClient from './ProductFormClient';
import ToggleMenuItemButton from './ToggleMenuItemButton';

type FilterType = 'ALL' | 'EVENT' | 'STUDIO';

interface InventoryMenuTableProps {
    menuItems: any[];
}

export default function InventoryMenuTable({ menuItems }: InventoryMenuTableProps) {
    const [filterType, setFilterType] = useState<FilterType>('ALL');

    const filteredMenuItems = menuItems.filter((product) => {
        if (filterType === 'EVENT') return product.eventId;
        if (filterType === 'STUDIO') return !product.eventId;
        return true; // ALL
    });

    const filterButtons: { label: string; value: FilterType; icon: string }[] = [
        { label: 'Semua Items', value: 'ALL', icon: '📋' },
        { label: 'Event Items', value: 'EVENT', icon: '🎪' },
        { label: 'Studio Items', value: 'STUDIO', icon: '🏢' },
    ];

    return (
        <div className="space-y-4">
            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
                {filterButtons.map((btn) => (
                    <button
                        key={btn.value}
                        onClick={() => setFilterType(btn.value)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                            filterType === btn.value
                                ? 'bg-[#B8860B] border-[#9B6F0A] text-white shadow-sm'
                                : 'bg-white border-[#E6DED0] text-[#6F6659] hover:bg-[#F8F3EA]'
                        }`}
                    >
                        <span>{btn.icon}</span>
                        {btn.label}
                        <span className="ml-1 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                            {menuItems.filter((item) => {
                                if (btn.value === 'EVENT') return item.eventId;
                                if (btn.value === 'STUDIO') return !item.eventId;
                                return true;
                            }).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Items Count */}
            <div className="text-sm text-[#6F6659] font-medium">
                Menampilkan <span className="text-[#1F1D1A] font-bold">{filteredMenuItems.length}</span> dari{' '}
                <span className="text-[#1F1D1A] font-bold">{menuItems.length}</span> item
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[#E6DED0]">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#F8F3EA]">
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Pembagian</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMenuItems.length > 0 ? (
                            filteredMenuItems.map((product: any) => (
                                <TableRow key={`menu-item-${product.id}`}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>{product.category?.name || '-'}</TableCell>
                                    <TableCell>
                                        {product.eventId ? (
                                            <Badge className="bg-[#B8860B] text-white">Event</Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-[#6F6659] text-[#6F6659]">
                                                Studio
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{formatRupiah(Number(product.price))}</TableCell>
                                    <TableCell>
                                        {product.eventId ? (
                                            product.organizerShareType === 'PERCENTAGE' ? (
                                                <span className="text-xs text-[#8C4A1D] font-semibold">
                                                    Penyelenggara {Number(product.organizerShareValue || 0)}%
                                                </span>
                                            ) : (
                                                <span className="text-xs text-[#8C4A1D] font-semibold">
                                                    Penyelenggara {formatRupiah(Number(product.organizerShareValue || 0))}
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-xs text-[#6F6659]">Studio 100%</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{product.stock}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className="border-[#DCCFBF] bg-[#F8F3EA] text-[#5A5348]"
                                        >
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
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-[#6F6659]">
                                    Tidak ada item yang sesuai dengan filter
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
