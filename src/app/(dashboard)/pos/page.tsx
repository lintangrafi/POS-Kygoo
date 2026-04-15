import { getOpenShift } from '@/actions/shift-actions';
import { getOpenBills, getPosData } from '@/actions/pos-actions';
import { getActiveEvent, getEventOptions } from '@/actions/event-actions';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartSidebar } from '@/components/pos/CartSidebar';

export default async function POSPage() {
    const openShift = await getOpenShift();
    const isShiftOpen = !!openShift;

    // Fetch initial data
    const { categories, products } = await getPosData();
    const initialOpenBills = await getOpenBills();
    const [eventOptions, activeEvent] = await Promise.all([
        getEventOptions(),
        getActiveEvent(),
    ]);

    return (
        <div className="h-[calc(100dvh-2rem)] lg:h-[100dvh] space-y-4 rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-3xl font-bold leading-tight text-[#1F1D1A]">Point of Sale</h1>
                    <p className="text-sm text-[#6F6659]">Transaksi cepat, split payment, dan open bill dalam satu workspace.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-[#E6DED0] bg-[#F8F3EA] px-3 py-2 text-sm text-[#5A5348]">
                        {isShiftOpen ? 'Shift OPEN' : 'Shift CLOSED'}
                    </span>
                    <span className="rounded-lg bg-[#C86B2A] px-4 py-2 text-sm font-semibold text-white">Checkout</span>
                </div>
            </div>

            {!isShiftOpen && (
                <div className="rounded-xl border border-[#F2C6C6] bg-[#FFF1F1] px-4 py-3 text-sm text-[#8B1A1A]">
                    No active shift found. Open a shift to enable checkout and split payment.
                </div>
            )}

            <div className="flex flex-col lg:flex-row h-[calc(100%-88px)] overflow-hidden rounded-xl border border-[#E6DED0] bg-[#F5F1E8]">
                {/* Main Grid Area */}
                <div className="flex-1 p-3 sm:p-4 min-h-0 overflow-hidden">
                    <ProductGrid categories={categories} products={products} />
                </div>

                {/* Sidebar Cart Area */}
                <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#E6DED0] bg-white overflow-auto lg:h-full max-h-[45dvh] lg:max-h-none">
                    <CartSidebar
                        initialOpenBills={initialOpenBills}
                        isShiftOpen={isShiftOpen}
                        initialEventOptions={eventOptions}
                        activeEventId={activeEvent?.id ?? null}
                    />
                </div>
            </div>
        </div>
    );
}
