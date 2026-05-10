'use client';

import { usePosStore, Product } from '@/store/use-pos-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatRupiah } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useCallback, memo } from 'react';

interface ProductGridProps {
    categories: any[];
    products: any[];
}

// Memoized product card to prevent re-renders when other items change
const ProductCard = memo(function ProductCard({ product, onAdd }: { product: any; onAdd: (p: any) => void }) {
    return (
        <Card
            className={cn(
                "cursor-pointer border-[#E6DED0] hover:border-[#D39C70] hover:bg-[#FDF8F0] transition-all active:scale-95",
                product.stock <= 0 && "opacity-50 grayscale"
            )}
            onClick={() => product.stock > 0 && onAdd(product)}
        >
            <CardContent className="p-3 flex flex-col justify-between min-h-[110px]">
                <div className="min-h-[38px] text-sm font-semibold leading-snug text-[#201C16] line-clamp-2">
                    {product.name}
                </div>
                <div>
                    <div className="text-sm font-bold text-[#201C16]">{formatRupiah(Number(product.price))}</div>
                    <div className={cn(
                        'text-xs',
                        product.stock <= 3 ? 'text-[#B6452C] font-medium' : 'text-[#7F7568]'
                    )}>
                        Stock: {product.stock}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export function ProductGrid({ categories, products }: ProductGridProps) {
    // Use individual selectors to prevent re-renders from unrelated store changes (e.g. cart updates)
    const selectedCategoryId = usePosStore((s) => s.selectedCategoryId);
    const setSelectedCategoryId = usePosStore((s) => s.setSelectedCategoryId);
    const addToCart = usePosStore((s) => s.addToCart);
    const searchQuery = usePosStore((s) => s.searchQuery);
    const setSearchQuery = usePosStore((s) => s.setSearchQuery);
    const selectedEventId = usePosStore((s) => s.selectedEventId);

    const topProduct = products[0];

    // Memoize event-scoped products - only recalculates when products or selectedEventId changes
    const eventScopedProducts = useMemo(() => {
        return products.filter((p) => {
            if (selectedEventId === null) {
                return p.eventId === null || p.eventId === undefined;
            }
            return p.eventId === selectedEventId;
        });
    }, [products, selectedEventId]);

    const visibleCategoryIds = useMemo(() => new Set(eventScopedProducts.map((p) => p.categoryId)), [eventScopedProducts]);
    const visibleCategories = useMemo(() => categories.filter((cat) => visibleCategoryIds.has(cat.id)), [categories, visibleCategoryIds]);

    useEffect(() => {
        if (selectedCategoryId !== null && !visibleCategoryIds.has(selectedCategoryId)) {
            setSelectedCategoryId(null);
        }
    }, [selectedCategoryId, visibleCategoryIds, setSelectedCategoryId]);

    // Memoize filtered products - only recalculates when inputs actually change
    const filteredProducts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return eventScopedProducts.filter((p) => {
            const matchCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
            const matchSearch = !query || p.name.toLowerCase().includes(query);
            return matchCategory && matchSearch;
        });
    }, [eventScopedProducts, selectedCategoryId, searchQuery]);

    // Memoize addToCart callback so ProductCard doesn't re-render needlessly
    const handleAddToCart = useCallback((product: any) => {
        addToCart(product);
    }, [addToCart]);

    return (
        <div className="flex flex-col h-full gap-3 rounded-xl border border-[#E6DED0] bg-white p-3 sm:p-4 shadow-sm">
            {/* Header: Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8E8578]" />
                <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-8 border-[#E6DED0] bg-[#FCFAF6] focus-visible:ring-[#DCA679]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Categories: No scroll, wrap to next line */}
            <div className="w-full rounded-lg border border-[#E6DED0] bg-[#F8F3EA] p-1.5 sm:p-2">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button
                        variant='outline'
                        onClick={() => setSelectedCategoryId(null)}
                        className={cn(
                            'h-7 whitespace-nowrap border-[#E6DED0] bg-white px-2.5 text-xs text-[#5A5348] hover:bg-[#F8F3EA]',
                            selectedCategoryId === null && 'border-[#C86B2A] bg-[#C86B2A] text-white hover:bg-[#B25E24]'
                        )}
                    >
                        All Items
                    </Button>
                    {visibleCategories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                            <Button
                                key={cat.id}
                                variant='outline'
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={cn(
                                    'h-7 whitespace-nowrap px-2.5 text-xs font-medium transition-colors',
                                    isSelected
                                        ? 'border-[#C86B2A] bg-[#C86B2A] text-white hover:bg-[#B25E24]'
                                        : 'border-[#E6DED0] bg-white text-[#5A5348] hover:bg-[#F8F3EA]'
                                )}
                            >
                                {cat.name}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 overflow-y-auto pr-1 sm:pr-2 pb-6">
                {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#E6DED0] bg-[#FCFAF6] px-3 py-2">
                    <p className="text-xs text-[#8B7C6B]">Produk Terlaris</p>
                    <p className="text-sm font-semibold text-[#1F1D1A]">{topProduct?.name || '-'}</p>
                </div>
                <div className="rounded-lg border border-[#E6DED0] bg-[#FCFAF6] px-3 py-2">
                    <p className="text-xs text-[#8B7C6B]">Total Produk</p>
                    <p className="text-sm font-semibold text-[#1F1D1A]">{filteredProducts.length} items</p>
                </div>
            </div>
        </div>
    );
}
