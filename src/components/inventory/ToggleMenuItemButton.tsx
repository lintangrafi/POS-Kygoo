'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface ToggleMenuItemButtonProps {
    productId: number;
    currentStatus: boolean;
    productName: string;
}

export default function ToggleMenuItemButton({ productId, currentStatus, productName }: ToggleMenuItemButtonProps) {
    const router = useRouter();
    const { toast } = useToast();

    const toggleStatus = async () => {
        try {
            const res = await fetch('/api/inventory/toggle-menu-item', { 
                method: 'POST', 
                headers: { 'content-type': 'application/json' }, 
                body: JSON.stringify({ id: productId, isMenuItem: !currentStatus }) 
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Error');
            
            toast({
                title: `Product ${currentStatus ? 'removed from' : 'added to'} menu`
            });
            
            router.refresh();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message || 'An error occurred',
                variant: 'destructive'
            });
        }
    };

    return (
        <button
            onClick={toggleStatus}
            className={`px-3 py-1.5 rounded text-xs ${
                currentStatus 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
        >
            {currentStatus ? 'Remove from Menu' : 'Add to Menu'}
        </button>
    );
}