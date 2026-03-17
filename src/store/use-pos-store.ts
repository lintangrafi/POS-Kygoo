import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
    id: number;
    name: string;
    price: string;
    stock: number;
    categoryId: number;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface ActiveOpenBill {
    id: number;
    billNumber: string;
    customerName?: string;
    note?: string;
    paidAmount?: number;
    downPaymentAmount?: number;
    totalAmount?: number;
}

interface PosState {
    cart: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    setCart: (items: CartItem[]) => void;
    clearCart: () => void;

    activeOpenBill: ActiveOpenBill | null;
    setActiveOpenBill: (bill: ActiveOpenBill | null) => void;

    selectedCategoryId: number | null;
    setSelectedCategoryId: (id: number | null) => void;

    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export const usePosStore = create<PosState>()(
    persist(
        (set) => ({
            cart: [],
            activeOpenBill: null,
            selectedCategoryId: null,
            searchQuery: '',

            addToCart: (product) => set((state) => {
                const existing = state.cart.find((item) => item.id === product.id);
                if (existing) {
                    return {
                        cart: state.cart.map((item) =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                    };
                }
                return { cart: [...state.cart, { ...product, quantity: 1 }] };
            }),

            removeFromCart: (productId) => set((state) => ({
                cart: state.cart.filter((item) => item.id !== productId),
            })),

            updateQuantity: (productId, quantity) => set((state) => {
                if (quantity <= 0) {
                    return { cart: state.cart.filter((item) => item.id !== productId) };
                }
                return {
                    cart: state.cart.map((item) =>
                        item.id === productId ? { ...item, quantity } : item
                    ),
                };
            }),

            setCart: (items) => set({ cart: items }),

            clearCart: () => set({ cart: [], activeOpenBill: null }),

            setActiveOpenBill: (bill) => set({ activeOpenBill: bill }),

            setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
            setSearchQuery: (query) => set({ searchQuery: query }),
        }),
        {
            name: 'pos-storage',
            skipHydration: true, // We handle hydration manually if needed, or let useEffect handle it to avoid mismatch
        }
    )
);
