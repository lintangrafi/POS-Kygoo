import { getOpenShift } from '@/actions/shift-actions';
import { ShiftManagement } from '@/components/shift/ShiftManagement';

export default async function ShiftPage() {
    const openShift = await getOpenShift();

    return <ShiftManagement initialShift={openShift} />;
}
