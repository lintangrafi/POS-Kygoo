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
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-background dark:to-background">
            {/* Main Grid Area */}
            <div className="flex-1 p-4 h-full overflow-hidden">
                <ProductGrid categories={categories} products={products} />
            </div>

            {/* Sidebar Cart Area */}
            <div className="w-full md:w-[420px] lg:w-[460px] h-full border-l bg-card">
                <CartSidebar initialOpenBills={initialOpenBills} />
            </div>
        </div>
    );
}
