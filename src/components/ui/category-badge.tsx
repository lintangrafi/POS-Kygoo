import { cn } from '@/lib/utils';

type ExpenseCategory = 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER' | string;
type IncomeCategory  = 'SERVICE'  | 'REFUND'    | 'OTHER'        | string;

const EXPENSE_STYLES: Record<string, string> = {
    SUPPLIES:    'bg-[#FFFBEA] border border-[#FFE58A] text-[#7A5800]',
    UTILITIES:   'bg-[#EAFCFF] border border-[#A3E9F5] text-[#0E5F70]',
    MAINTENANCE: 'bg-[#FFF0F0] border border-[#FFBDBD] text-[#8B1A1A]',
    OTHER:       'bg-[#F4F4F5] border border-[#D1D1D5] text-[#52525B]',
};

const INCOME_STYLES: Record<string, string> = {
    SERVICE: 'bg-[#EAF7EF] border border-[#BFE7CB] text-[#17663A]',
    REFUND:  'bg-[#FFF0FA] border border-[#F9C6EA] text-[#8B1D68]',
    OTHER:   'bg-[#F4F4F5] border border-[#D1D1D5] text-[#52525B]',
};

const CATEGORY_LABELS: Record<string, string> = {
    SUPPLIES:    'Supplies',
    UTILITIES:   'Utilities',
    MAINTENANCE: 'Maintenance',
    SERVICE:     'Service',
    REFUND:      'Refund',
    OTHER:       'Other',
};

interface CategoryBadgeProps {
    kind: 'expense' | 'income';
    category: ExpenseCategory | IncomeCategory;
    className?: string;
}

export function CategoryBadge({ kind, category, className }: CategoryBadgeProps) {
    const key = category?.toUpperCase() || 'OTHER';
    const map  = kind === 'expense' ? EXPENSE_STYLES : INCOME_STYLES;
    const styles = map[key] ?? 'bg-[#F4F4F5] border border-[#D1D1D5] text-[#52525B]';
    const label  = CATEGORY_LABELS[key] ?? category;

    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', styles, className)}>
            {label}
        </span>
    );
}
