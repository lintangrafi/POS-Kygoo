export default function TestNoAuthPage() {
    return (
        <div className="p-8">
            <h1>No Auth Test Page</h1>
            <p>If you can see this page, the basic Next.js routing is working.</p>
            <p>Current time: {new Date().toLocaleString()}</p>
        </div>
    );
}