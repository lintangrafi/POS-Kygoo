import { getOpenShift } from '@/actions/shift-actions';
import { getOpenBills, getPosData } from '@/actions/pos-actions';
import { redirect } from 'next/navigation';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartSidebar } from '@/components/pos/CartSidebar';

export default async function POSPage() {
    const openShift = await getOpenShift();

    if (!openShift) {
        redirect('/shift');
    }

    // Fetch initial data
    const { categories, products } = await getPosData();
    const initialOpenBills = await getOpenBills();

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-background dark:to-background">
            {/* Main Grid Area */}
            <div className="flex-1 p-3 sm:p-4 min-h-0 overflow-hidden">
                <ProductGrid categories={categories} products={products} />
            </div>

            {/* Sidebar Cart Area */}
            <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-t lg:border-t-0 lg:border-l bg-card overflow-auto lg:h-full max-h-[45dvh] lg:max-h-none">
                <CartSidebar initialOpenBills={initialOpenBills} />
            </div>
        </div>
    );
}
