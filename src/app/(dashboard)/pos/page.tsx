import { getOpenShift } from '@/actions/shift-actions';
import { getPosData } from '@/actions/pos-actions';
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

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Main Grid Area */}
            <div className="flex-1 p-4 h-full overflow-hidden">
                <ProductGrid categories={categories} products={products} />
            </div>

            {/* Sidebar Cart Area */}
            <div className="w-full md:w-96 lg:w-[400px] h-full">
                <CartSidebar />
            </div>
        </div>
    );
}
