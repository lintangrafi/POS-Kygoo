import { cn } from '@/lib/utils';

type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT' | string;

const PAYMENT_STYLES: Record<string, string> = {
    CASH:     'bg-[#EAF7EF] border border-[#BFE7CB] text-[#17663A]',
    QRIS:     'bg-[#EAF1FF] border border-[#C4D6FF] text-[#1D4E9E]',
    TRANSFER: 'bg-[#F3ECFF] border border-[#D9C7FF] text-[#5A2FA0]',
    SPLIT:    'bg-[#FFF8EC] border border-[#FFD98A] text-[#7A5200]',
};

const PAYMENT_LABELS: Record<string, string> = {
    CASH:     'Cash',
    QRIS:     'QRIS',
    TRANSFER: 'Transfer',
    SPLIT:    'Split',
};

interface PaymentBadgeProps {
    method: PaymentMethod;
    className?: string;
}

export function PaymentBadge({ method, className }: PaymentBadgeProps) {
    const key = method?.toUpperCase() || 'CASH';
    const styles = PAYMENT_STYLES[key] ?? 'bg-gray-100 border border-gray-300 text-gray-700';
    const label = PAYMENT_LABELS[key] ?? method;

    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', styles, className)}>
            {label}
        </span>
    );
}

/**
 * Derives payment method from an array of payment objects.
 * Returns 'SPLIT' if multiple different methods are used.
 */
export function getPaymentMethodFromPayments(payments: Array<{ method: string }>): PaymentMethod {
    if (!payments || payments.length === 0) return 'CASH';
    const methods = [...new Set(payments.map((p) => p.method.toUpperCase()))];
    if (methods.length === 1) return methods[0] as PaymentMethod;
    return 'SPLIT';
}
