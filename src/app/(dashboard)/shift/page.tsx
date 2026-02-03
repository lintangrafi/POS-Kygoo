import { getOpenShift, getLastShift } from '@/actions/shift-actions';
import { ShiftManagement } from '@/components/shift/ShiftManagement';

export default async function ShiftPage() {
    const openShift = await getOpenShift();
    const lastShift = await getLastShift();

    return <ShiftManagement initialShift={openShift} lastShift={lastShift} />;
}
