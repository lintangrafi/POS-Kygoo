'use client';

import { usePosStore, Product } from '@/store/use-pos-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatRupiah } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProductGridProps {
    categories: any[];
    products: any[];
}

export function ProductGrid({ categories, products }: ProductGridProps) {
    const { selectedCategoryId, setSelectedCategoryId, addToCart, searchQuery, setSearchQuery } = usePosStore();

    // Filter Logic
    const filteredProducts = products.filter((p) => {
        const matchCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    // Determine current theme (Studio vs FB) based on category for styling if needed,
    // but we stick to monochrome mostly.

    return (
        <div className="flex flex-col h-full gap-4 rounded-xl border bg-card p-4 shadow-sm">
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

            {/* Categories: Horizontal Scroll */}
            <ScrollArea className="w-full rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex gap-2 p-2">
                    <Button
                        variant='outline'
                        onClick={() => setSelectedCategoryId(null)}
                        className='whitespace-nowrap flex-shrink-0'
                    >
                        All Items
                    </Button>
                    {categories.map((cat) => (
                        <Button
                            key={cat.id}
                            variant='outline'
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className='whitespace-nowrap flex-shrink-0'
                        >
                            {cat.name}
                        </Button>
                    ))}
                </div>
            </ScrollArea>

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
