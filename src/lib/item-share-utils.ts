export type OrganizerShareType = 'PERCENTAGE' | 'FIXED';

export function computeOrganizerSharePerUnit(params: {
    unitPrice: number;
    organizerShareType?: string | null;
    organizerShareValue?: number | string | null;
}) {
    const unitPrice = Math.max(0, Number(params.unitPrice || 0));
    const shareType = (params.organizerShareType || '').toUpperCase();
    const rawValue = Number(params.organizerShareValue || 0);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return 0;
    }

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
        return 0;
    }

    if (shareType === 'PERCENTAGE') {
        const pct = Math.max(0, Math.min(100, rawValue));
        return Math.round(((unitPrice * pct) / 100) * 100) / 100;
    }

    if (shareType === 'FIXED') {
        return Math.round(Math.min(unitPrice, rawValue) * 100) / 100;
    }

    return 0;
}
