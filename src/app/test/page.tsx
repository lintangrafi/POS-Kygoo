import { verifySession } from '@/lib/auth';

export default async function TestPage() {
    try {
        const session = await verifySession();
        return (
            <div className="p-8">
                <h1>Test Page</h1>
                <p>Session found: {session.name}</p>
                <p>Role: {session.role}</p>
                <p>User ID: {session.userId}</p>
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8">
                <h1>Error</h1>
                <pre>{JSON.stringify(error, null, 2)}</pre>
            </div>
        );
    }
}