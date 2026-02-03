import { db } from '@/db';

export default async function TestDbPage() {
    try {
        // Simple query to test database connection
        const result = await db.query.users.findMany({
            limit: 1
        });
        
        return (
            <div className="p-8">
                <h1>Database Test Page</h1>
                <p>Database connection: Working</p>
                <p>Users found: {result.length}</p>
                {result.length > 0 && (
                    <p>First user: {result[0].name} ({result[0].role})</p>
                )}
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8">
                <h1>Database Error</h1>
                <pre>{error instanceof Error ? error.message : String(error)}</pre>
            </div>
        );
    }
}