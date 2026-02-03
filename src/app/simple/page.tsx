import { getSession } from '@/lib/auth';

export default async function TestSimplePage() {
    try {
        const session = await getSession();
        return (
            <div className="p-8">
                <h1>Simple Test Page</h1>
                <p>Session found: {session ? 'Yes' : 'No'}</p>
                {session && (
                    <>
                        <p>Name: {session.name}</p>
                        <p>Role: {session.role}</p>
                        <p>User ID: {session.userId}</p>
                    </>
                )}
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8">
                <h1>Error</h1>
                <pre>{error instanceof Error ? error.message : String(error)}</pre>
            </div>
        );
    }
}