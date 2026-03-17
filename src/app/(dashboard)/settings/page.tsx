import { verifySession } from '@/lib/auth';
import { getUsers } from '@/actions/admin-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Users, Database, Bell } from 'lucide-react';

const ROLE_BADGE: Record<string, string> = {
    SUPERADMIN: 'bg-[#F3ECFF] border border-[#D9C7FF] text-[#5A2FA0]',
    ADMIN: 'bg-[#EAF1FF] border border-[#C4D6FF] text-[#1D4E9E]',
    CASHIER: 'bg-[#EAF7EF] border border-[#BFE7CB] text-[#17663A]',
};

const ROLE_LABEL: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Admin',
    CASHIER: 'Cashier',
};

export default async function SettingsPage() {
    const session = await verifySession();
    const userList = session.role === 'SUPERADMIN' || session.role === 'ADMIN'
        ? await getUsers().catch(() => [])
        : [];

    return (
        <div className="min-h-screen bg-[#F5F1E8]">
            <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C86B2A]">Konfigurasi</p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">Settings</h1>
                    <p className="mt-2 text-sm text-gray-600">Kelola konfigurasi sistem dan preferensi aplikasi Anda.</p>
                </div>

                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="bg-white border border-[#E6DED0]">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general">
                        <Card className="border-[#E6DED0] bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-[#C86B2A]" />
                                    General Settings
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    Basic configuration for your POS system
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="storeName">Store Name</Label>
                                        <Input id="storeName" defaultValue="Kygoo Studio" />
                                    </div>
                                    <div>
                                        <Label htmlFor="storeEmail">Store Email</Label>
                                        <Input id="storeEmail" defaultValue="info@kygoo.studio" />
                                    </div>
                                    <div>
                                        <Label htmlFor="storePhone">Store Phone</Label>
                                        <Input id="storePhone" defaultValue="+62 21 123 4567" />
                                    </div>
                                    <div>
                                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                                        <Input id="taxRate" type="number" defaultValue="11" />
                                    </div>
                                </div>
                                <Button>Save Changes</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="border-[#E6DED0] bg-white">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-[#C86B2A]" />
                                        User Management
                                    </CardTitle>
                                    <CardDescription className="text-gray-600">
                                        {userList.length} registered user{userList.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#FAFAF9]">
                                                <TableHead className="font-semibold text-gray-900">Name</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Email</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Role</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Joined</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {userList.map((u: any) => (
                                                <TableRow key={u.id} className="hover:bg-[#FAFAF9]">
                                                    <TableCell className="font-medium text-gray-900">{u.name}</TableCell>
                                                    <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                                                            {ROLE_LABEL[u.role] ?? u.role}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {new Date(u.createdAt).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {userList.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="py-8 text-center text-gray-600">
                                                        No users found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="system">
                        <Card className="border-[#E6DED0] bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-[#C86B2A]" />
                                    System Configuration
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    Database and system settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[#E6DED0] bg-[#FAFAF9]">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Database Status</h4>
                                        <p className="text-sm text-gray-600">Connection to PostgreSQL is healthy</p>
                                    </div>
                                    <Badge className="bg-green-600 hover:bg-green-700">Connected</Badge>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[#E6DED0] bg-[#FAFAF9]">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Current User</h4>
                                        <p className="text-sm text-gray-600">{session.name} ({session.role})</p>
                                    </div>
                                    <Badge variant="outline">Authenticated</Badge>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[#E6DED0] bg-[#FAFAF9]">
                                    <div>
                                        <h4 className="font-medium text-gray-900">System Version</h4>
                                        <p className="text-sm text-gray-600">POS Kygo V2.0.0</p>
                                    </div>
                                    <Badge variant="secondary">Latest</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <Card className="border-[#E6DED0] bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-[#C86B2A]" />
                                    Notification Settings
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    Configure alerts and notifications
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">Notification preferences coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
