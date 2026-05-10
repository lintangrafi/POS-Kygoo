export default function DashboardLoading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E6DED0] border-t-[#C86B2A]" />
                <p className="text-sm text-[#6F6659] animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
