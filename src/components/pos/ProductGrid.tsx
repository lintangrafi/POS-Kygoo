'use client';

import { usePosStore, Product } from '@/store/use-pos-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatRupiah } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProductGridProps {
    categories: any[];
    products: any[];
}

export function ProductGrid({ categories, products }: ProductGridProps) {
    const { selectedCategoryId, setSelectedCategoryId, addToCart, searchQuery, setSearchQuery } = usePosStore();

    const categoryColorClasses = [
        {
            inactive: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100',
            active: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
        },
        {
            inactive: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
            active: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
        },
        {
            inactive: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
            active: 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700',
        },
        {
            inactive: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
            active: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
        },
        {
            inactive: 'border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100',
            active: 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700',
        },
        {
            inactive: 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
            active: 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700',
        },
    ];

    // Filter Logic
    const filteredProducts = products.filter((p) => {
        const matchCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    // Determine current theme (Studio vs FB) based on category for styling if needed,
    // but we stick to monochrome mostly.

    return (
        <div className="flex flex-col h-full gap-3 rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
            {/* Header: Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-8 border-indigo-100 focus-visible:ring-indigo-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Categories: No scroll, wrap to next line */}
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 sm:p-2">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button
                        variant='outline'
                        onClick={() => setSelectedCategoryId(null)}
                        className={cn(
                            'h-8 whitespace-nowrap border-slate-300 bg-white px-2.5 text-xs sm:text-sm text-slate-900 hover:bg-slate-100',
                            selectedCategoryId === null && 'border-slate-700 bg-slate-800 text-white hover:bg-slate-900'
                        )}
                    >
                        All Items
                    </Button>
                    {categories.map((cat, index) => {
                        const palette = categoryColorClasses[index % categoryColorClasses.length];
                        const isSelected = selectedCategoryId === cat.id;

                        return (
                            <Button
                                key={cat.id}
                                variant='outline'
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={cn(
                                    'h-8 whitespace-nowrap px-2.5 text-xs sm:text-sm font-medium transition-colors',
                                    isSelected ? palette.active : palette.inactive
                                )}
                            >
                                {cat.name}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 overflow-y-auto pr-2 pb-20">
                {filteredProducts.map((product) => (
                    <Card
                        key={product.id}
                        className={cn(
                            "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all active:scale-95",
                            product.stock <= 0 && "opacity-50 grayscale"
                        )}
                        onClick={() => product.stock > 0 && addToCart(product)}
                    >
                        <CardContent className="p-4 flex flex-col justify-between h-[120px]">
                            <div className="font-semibold leading-tight line-clamp-2">{product.name}</div>
                            <div>
                                <div className="text-sm font-bold">{formatRupiah(Number(product.price))}</div>
                                <div className={cn(
                                    'text-xs',
                                    product.stock <= 3 ? 'text-red-600 font-medium' : 'text-muted-foreground'
                                )}>
                                    Stock: {product.stock}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
