import { verifySession } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Database, Shield, Bell } from 'lucide-react';

export default async function SettingsPage() {
    const session = await verifySession();

    return (
        <div className="p-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your system configuration and preferences.</p>
            </div>

            <div className="mt-8">
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    General Settings
                                </CardTitle>
                                <CardDescription>
                                    Basic configuration for your POS system
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    User Management
                                </CardTitle>
                                <CardDescription>
                                    Manage user accounts and permissions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">User management features coming soon...</p>
                                <Button variant="outline" className="mt-4">
                                    Add New User
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="system">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    System Configuration
                                </CardTitle>
                                <CardDescription>
                                    Database and system settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Database Status</h4>
                                        <p className="text-sm text-muted-foreground">Connection to PostgreSQL is healthy</p>
                                    </div>
                                    <Badge variant="default" className="bg-green-500">Connected</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Current User</h4>
                                        <p className="text-sm text-muted-foreground">{session.name} ({session.role})</p>
                                    </div>
                                    <Badge variant="outline">Authenticated</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">System Version</h4>
                                        <p className="text-sm text-muted-foreground">POS Kygo V2.0.0</p>
                                    </div>
                                    <Badge variant="secondary">Latest</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5" />
                                    Notification Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure alerts and notifications
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Notification preferences coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}