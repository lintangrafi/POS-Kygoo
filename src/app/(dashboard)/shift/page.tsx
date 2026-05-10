import { getOpenShift, getLastShift } from '@/actions/shift-actions';
import { ShiftManagement } from '@/components/shift/ShiftManagement';

export default async function ShiftPage() {
    // Parallelize both fetches instead of sequential
    const [openShift, lastShift] = await Promise.all([
        getOpenShift(),
        getLastShift(),
    ]);

    return <ShiftManagement initialShift={openShift} lastShift={lastShift} />;
}
